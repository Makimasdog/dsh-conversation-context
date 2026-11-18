import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { scopeParentOf } from '@deepseek-ai/dsh-scope'
import { isUserInvocable, renderSkillContent } from '@deepseek-ai/dsh-skill'
import { renderPrompt } from '@deepseek-ai/dsh-system-prompt'
import { RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { protocol } from './protocol.js'

const { name, defaults, descriptors } = protocol()
const personaPrefix = 'deployment:persona-prefix'
const namespace = 'conversationContext'
const nativeSkillTool = 'skill'
const promptMarker = 'conversation-context:append-capability'
const temporaryPrompt = 'conversation-context:temporary'
const ptcSections = new Set(['tools:ptc-only', 'tools:sdk'])

function error(message, code = 'gateway/bad-request') {
  return new RemoteError(code, message, {})
}

function toolViews(ctx, agent) {
  const parent = scopeParentOf(agent)
  return {
    parent,
    inherited: ctx.tools.definitions(parent),
    visible: ctx.tools.definitions(agent),
  }
}

function toolRows({ inherited, visible }) {
  const byName = new Map(inherited.map(tool => [tool.name, tool]))
  return visible.map(tool => ({
    name: tool.name,
    description: typeof tool.description === 'string' ? tool.description : '',
    executionOnly: byName.get(tool.name) !== tool,
  })).sort((a, b) => a.name.localeCompare(b.name))
}

function sameItems(previous, current) {
  return previous.length === current.length && previous.every((tool, index) => tool === current[index])
}

function sameViews(previous, current) {
  return previous.parent === current.parent &&
    sameItems(previous.visible, current.visible) &&
    sameItems(previous.inherited, current.inherited)
}

// The registry validates names against its inherited registrations. An MCP
// tool may disconnect between selections, and own-scope tools are exempt.
function restrict(tools, names) {
  try {
    return tools.restrict({ allow: names })
  } catch (cause) {
    const match = /known global tools: ([^\r\n]*)$/.exec(cause.message)
    if (!match) throw cause
    const known = new Set(match[1].split(', ').map(name => name.replace(/^"|"$/g, '')))
    const available = names.filter(name => known.has(name))
    if (available.length === names.length) throw cause
    return tools.restrict({ allow: available })
  }
}

class ConversationContext extends TypertRemoteService {
  constructor(ctx, state) {
    super(ctx, namespace)
    this.state = state
  }

  async agent(sessionId, signal) {
    if (this.ctx.invocation?.peer.principal.kind !== 'owner') {
      throw error('只有本机主端可修改会话上下文', 'remote-access/denied')
    }
    const result = await this.ctx.sessionController.resolveAgent(sessionId)
    signal.throwIfAborted()
    if ('error' in result) throw result.error
    return result.agent
  }

  async read({ sessionId }, signal) {
    const agent = await this.agent(sessionId, signal)
    const skills = await this.state.skillRows(agent, signal)
    return this.state.snapshot(agent, skills)
  }

  async save({ sessionId, revision, config }, signal) {
    const agent = await this.agent(sessionId, signal)
    const skills = await this.state.skillRows(agent, signal)
    signal.throwIfAborted()
    return this.state.save(agent, revision, config, skills, signal)
  }

  async preview({ sessionId }, signal) {
    const agent = await this.agent(sessionId, signal)
    return this.state.preview(agent, signal)
  }
}

export const inject = ['agents', 'sessionController', 'typert', 'tools', 'systemPrompt', 'skills', 'workingDirectory']

export function apply(ctx) {
  const sessions = new Map()
  const live = new Map()
  let changing = false
  let refreshQueued = false
  let stopped = false

  function transaction(work) {
    changing = true
    try {
      return work()
    } finally {
      changing = false
    }
  }

  const record = agent => sessions.get(agent.id) ?? { revision: 0, config: defaults }
  const lookup = async (agent, signal) => ({
    scope: agent, signal, cwd: await ctx.workingDirectory.ensure(agent, signal),
  })
  async function skillRows(agent, signal) {
    const skills = await ctx.skills.list(await lookup(agent, signal))
    signal.throwIfAborted()
    return skills.filter(isUserInvocable).map(({ name, description }) => ({ name, description }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  function mask(agent, entry, rows) {
    const { tools, skills } = entry.config
    entry.rows = rows
    if (tools !== null) {
      const names = skills === null ? tools : tools.filter(name => name !== nativeSkillTool)
      entry.allowed = new Set(names)
      entry.unmask = restrict(agent.ctx.tools, names)
    } else if (skills !== null && rows.some(row => row.name === nativeSkillTool && !row.executionOnly)) {
      entry.unmask = agent.ctx.tools.restrict({ deny: [nativeSkillTool] })
    } else {
      entry.unmask = undefined
    }
  }

  function catalog(agent) {
    return live.get(agent)?.rows ?? toolRows(toolViews(ctx, agent))
  }

  function refresh(agent, checkHidden = false) {
    const entry = live.get(agent)
    if (!entry || agent.status !== 'idle' || changing) return
    const views = toolViews(ctx, agent)
    if (!checkHidden && sameViews(entry.views, views)) return
    transaction(() => {
      entry.unmask?.()
      entry.unmask = undefined
      mask(agent, entry, toolRows(toolViews(ctx, agent)))
      entry.views = toolViews(ctx, agent)
    })
  }

  function detach(agent) {
    const entry = live.get(agent)
    live.delete(agent)
    entry?.unmask?.()
    entry?.removePrompt?.()
  }

  function installPrompt(agent, entry) {
    return agent.ctx.systemPrompt.section({
      // Shadow the preset's complete persona slot when the preset requires it.
      name: personaPrefix,
      order: ctx.systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX'),
      text: () => entry.config.prompt, interpolate: false, complete: true,
    })
  }

  function attach(agent, config, rows, completePersona = false) {
    if (config.tools === null && config.skills === null && config.prompt === null) return
    const entry = { config, completePersona }
    try {
      mask(agent, entry, rows)
      if (completePersona) entry.removePrompt = installPrompt(agent, entry)
      entry.views = toolViews(ctx, agent)
      live.set(agent, entry)
    } catch (cause) {
      entry.unmask?.()
      throw cause
    }
  }

  function snapshot(agent, skills, tools = catalog(agent)) {
    const { revision, config } = record(agent)
    const visible = new Set(tools.map(tool => tool.name))
    const disconnected = (config.tools ?? []).filter(name => !visible.has(name))
      .map(name => ({ name, description: '当前不可用', disconnected: true }))
    return { revision, config, tools: [...tools, ...disconnected], skills }
  }

  async function assemble(agent, signal, baseline = false, resolveTools = true) {
    const modelSelection = agent.model.current()
    const toolSet = resolveTools && modelSelection
      ? await ctx.tools.resolve({ agent, modelSelection, signal })
      : undefined
    try {
      const assembly = await ctx.systemPrompt.assemble({
        scope: agent, agent, modelSelection, toolSet, signal, conversationContextBaseline: baseline,
      })
      signal.throwIfAborted()
      return assembly
    } finally {
      toolSet?.dispose()
    }
  }

  async function preview(agent, signal) {
    const { revision, config } = record(agent)
    const initialParent = scopeParentOf(agent)
    const assembly = await assemble(agent, signal)
    if (record(agent).revision !== revision || scopeParentOf(agent) !== initialParent) {
      throw error('配置刚刚更新，请重新读取预览。')
    }
    const declaredTools = assembly.tools.map(tool => tool.name)
    return {
      prompt: renderPrompt(assembly),
      declaredTools,
      guardedTools: [...new Set([...declaredTools, ...ctx.tools.definitions(agent).map(tool => tool.name)])]
        .filter(name => deniedCall(live.get(agent), name)),
      ptc: declaredTools.includes('run_code'),
      skills: config.skills,
    }
  }

  async function save(agent, revision, config, skills, signal) {
    const previous = record(agent)
    if (agent.status !== 'idle') throw error('请等当前回复结束后再应用配置')
    if (previous.revision !== revision) throw error('配置已在另一窗口更新。请重新打开面板后再编辑。')
    const initialParent = scopeParentOf(agent)
    let completePersona = false
    if (config.prompt !== null) {
      const baseline = await assemble(agent, signal, true, false)
      const acceptsAppend = baseline.sections.some(section => section.name === promptMarker)
      if (!acceptsAppend) {
        if (config.promptMode === 'append') throw error('当前预设使用完整系统提示词。请选择替换。')
        if (baseline.tools.some(tool => tool.name === 'run_code') ||
            baseline.sections.length !== 1 || baseline.sections[0].name !== personaPrefix) {
          throw error('当前预设的完整提示词不能安全替换。')
        }
        completePersona = true
      }
    }
    signal.throwIfAborted()
    if (agent.status !== 'idle') throw error('请等当前回复结束后再应用配置')
    if (previous.revision !== record(agent).revision || scopeParentOf(agent) !== initialParent ||
        ctx.agents.get(agent.id) !== agent) throw error('会话配置已更新，请重新打开面板。')
    const entry = live.get(agent)
    const currentNames = new Set(ctx.tools.definitions(agent).map(tool => tool.name))
    const selectsHidden = !!entry?.unmask && config.tools?.some(name =>
      !currentNames.has(name) && !previous.config.tools?.includes(name))
    refresh(agent, selectsHidden)
    const tools = catalog(agent)
    const toolNames = new Set([...tools.map(row => row.name), ...(previous.config.tools ?? [])])
    const skillNames = new Set(skills.map(row => row.name))
    if (config.tools?.some(name => !toolNames.has(name)) || config.skills?.some(name => !skillNames.has(name))) {
      throw error('工具或技能清单已更新。请重新打开面板后选择。')
    }
    transaction(() => {
      const entry = live.get(agent)
      const oldTools = previous.config.tools
      const sameTools = oldTools === config.tools ||
        (oldTools !== null && config.tools !== null && sameItems(oldTools, config.tools))
      const usesSameMask = sameTools && (previous.config.skills === null) === (config.skills === null)
      if (entry && usesSameMask) {
        const oldConfig = entry.config
        entry.config = config
        try {
          if (completePersona && !entry.removePrompt) entry.removePrompt = installPrompt(agent, entry)
          if (!completePersona && entry.removePrompt) {
            entry.removePrompt()
            entry.removePrompt = undefined
          }
        } catch (cause) {
          entry.config = oldConfig
          throw cause
        }
        entry.completePersona = completePersona
        if (config.tools === null && config.skills === null && config.prompt === null) detach(agent)
        return
      }
      detach(agent)
      try {
        attach(agent, config, tools, completePersona)
      } catch (cause) {
        attach(agent, previous.config, tools, previous.completePersona)
        throw cause
      }
    })
    sessions.set(agent.id, { revision: revision + 1, config, completePersona })
    return snapshot(agent, skills, tools)
  }

  function deniedCall(entry, name) {
    if (!entry) return false
    if (entry.config.skills !== null && name === nativeSkillTool) return true
    return !!entry.allowed && !entry.allowed.has(name) &&
      (name !== 'run_code' || entry.allowed.size === 0)
  }

  ctx.plugin(ConversationContext, { snapshot, preview, save, skillRows })
  ctx.typert.register({ package: name, face: 'host', schemas: [], invocations: descriptors })
  // Empty at render time. Its presence distinguishes normal assembly from a
  // preset whose complete section is restored after the waterfall.
  ctx.systemPrompt.section({ name: promptMarker, order: 20000, text: '', interpolate: false })
  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const result = await next()
    const entry = live.get(context.scope)
    if (!entry || entry.config.prompt === null || entry.completePersona || context.conversationContextBaseline) return result
    const section = { name: temporaryPrompt, text: entry.config.prompt, interpolate: false }
    const sections = entry.config.promptMode === 'append'
      ? [...result.sections, section]
      : [section, ...result.sections.filter(item => ptcSections.has(item.name))]
    return { ...result, sections }
  }, { prepend: true })

  ctx.on('agent/created', ({ agent }) => {
    const saved = sessions.get(agent.id)
    if (saved) transaction(() => attach(agent, saved.config, toolRows(toolViews(ctx, agent)), saved.completePersona))
  })
  ctx.on('agent/disposed', ({ agent }) => transaction(() => detach(agent)))
  ctx.on('agent-preset/selected', id => {
    const agent = ctx.agents.get(id)
    const saved = sessions.get(id)
    if (!agent || !saved) return
    if (saved.config.prompt !== null) {
      const config = { ...saved.config, prompt: null, promptMode: defaults.promptMode }
      transaction(() => {
        const entry = live.get(agent)
        if (entry) {
          entry.removePrompt?.()
          entry.config = config
          entry.completePersona = false
          entry.removePrompt = undefined
          if (config.tools === null && config.skills === null) detach(agent)
        }
        sessions.set(id, { revision: saved.revision + 1, config, completePersona: false })
      })
    }
    refreshSafely(agent)
  })
  ctx.on('tools/change', () => {
    if (changing || refreshQueued || stopped) return
    refreshQueued = true
    queueMicrotask(() => {
      refreshQueued = false
      if (!stopped) for (const agent of live.keys()) refreshSafely(agent)
    })
  })
  ctx.on('agent/status', ({ agent, status }) => {
    if (status === 'idle') refreshSafely(agent)
  })

  function refreshSafely(agent) {
    try {
      refresh(agent)
    } catch (cause) {
      ctx.logger.warn(`conversation-context: tools refresh failed for ${agent.id}: ${String(cause)}`)
    }
  }

  ctx.tools.guard(exec => deniedCall(live.get(exec.agent), exec.name) ? '当前会话未启用此工具' : undefined)
  ctx.on('agent/pre-step', async ({ agent, step, signal, messages }, next) => {
    const selected = record(agent).config.skills
    const decision = await next()
    if (selected === null || decision.kind === 'reject') return decision
    const accepted = decision.messages.filter(message =>
      message.source.kind !== 'skill-invocation' || selected.includes(message.source.name))
    if (step !== 1 || messages.length === 0 || selected.length === 0) return { ...decision, messages: accepted }
    const existing = new Set(accepted.filter(message => message.source.kind === 'skill-invocation')
      .map(message => message.source.name))
    const options = await lookup(agent, signal)
    for (const name of selected) {
      if (existing.has(name)) continue
      const skill = await ctx.skills.get(name, options)
      signal.throwIfAborted()
      if (!skill || !isUserInvocable(skill)) throw new Error(`所选技能 ${name} 已不可用，请更新会话上下文配置。`)
      accepted.push(createUserMessage({
        source: { kind: 'skill-invocation', name, form: 'instructions' },
        content: [{ type: 'text', text: renderSkillContent(skill) }],
      }))
    }
    return { ...decision, messages: accepted }
  }, { prepend: true })

  return () => transaction(() => {
    stopped = true
    for (const agent of live.keys()) detach(agent)
    sessions.clear()
  })
}
