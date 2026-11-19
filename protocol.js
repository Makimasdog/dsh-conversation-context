export function protocol() {
  const name = '@local/dsh-conversation-context'
  const namespace = 'conversationContext'
  const promptLimit = 16000
  const taskLimit = 1200
  const defaults = { tools: null, skills: null, prompt: null, promptMode: 'replace', contexts: [] }

  function names(value) {
    if (value === null) return null
    if (!Array.isArray(value) || value.length > 2048 ||
        value.some(name => typeof name !== 'string' || name.length === 0 || name.length > 256)) {
      throw new TypeError('工具或技能清单无效')
    }
    return [...new Set(value)].sort()
  }

  function readRequest(value) {
    if (typeof value?.sessionId !== 'string' || value.sessionId.length === 0 || value.sessionId.length > 256) {
      throw new TypeError('会话 ID 无效')
    }
    return { sessionId: value.sessionId }
  }

  function saveRequest(value) {
    const request = readRequest(value)
    if (value.prompt !== null &&
        (typeof value.prompt !== 'string' || !value.prompt.trim() || value.prompt.length > promptLimit)) {
      throw new TypeError('请输入有效的临时系统提示词')
    }
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new TypeError('版本号无效')
    const promptMode = value.promptMode ?? defaults.promptMode
    if (promptMode !== 'replace' && promptMode !== 'append') throw new TypeError('系统提示词模式无效')
    const contexts = value.contexts ?? []
    if (!Array.isArray(contexts) || contexts.length > 100 ||
        contexts.some(item => typeof item?.name !== 'string' || !item.name || item.name.length > 256 ||
          (item.text !== null && (typeof item.text !== 'string' || item.text.length > promptLimit))) ||
        new Set(contexts.map(item => item.name)).size !== contexts.length ||
        contexts.reduce((size, item) => size + (item.text?.length ?? 0), 0) > promptLimit * 2) {
      throw new TypeError('运行上下文配置无效')
    }
    return { ...request, revision: value.revision, config: {
      tools: names(value.tools), skills: names(value.skills), prompt: value.prompt,
      promptMode: value.prompt === null ? defaults.promptMode : promptMode,
      contexts: contexts.map(({ name, text }) => ({ name, text })),
    } }
  }

  function recommendRequest(value) {
    const request = readRequest(value)
    if (typeof value.task !== 'string' || !value.task.trim() || value.task.length > taskLimit) {
      throw new TypeError('请输入要完成的任务')
    }
    return { ...request, task: value.task.trim() }
  }

  function descriptor(method, parse) {
    return {
      id: `${name}#${namespace}/${method}`,
      namespace, method, service: namespace, invocation: { kind: 'direct' },
      parameters: [{
        name: 'request', wire: 'request', source: 'json',
        codec: { mode: 'strict', typeSymbol: `Context/${method}`, create: () => ({ parse }) },
      }],
      result: { mode: 'src-json' },
      cancellation: { parameter: 'signal' },
    }
  }

  return { name, defaults, promptLimit, taskLimit, descriptors: [
    descriptor('read', readRequest), descriptor('preview', readRequest), descriptor('save', saveRequest),
    descriptor('recommend', recommendRequest), descriptor('contextLayers', readRequest),
  ] }
}
