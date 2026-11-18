export function protocol() {
  const name = '@local/dsh-conversation-context'
  const namespace = 'conversationContext'
  const promptLimit = 16000
  const defaults = { tools: null, skills: null, prompt: null, promptMode: 'replace' }

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
    return { ...request, revision: value.revision, config: {
      tools: names(value.tools), skills: names(value.skills), prompt: value.prompt,
      promptMode: value.prompt === null ? defaults.promptMode : promptMode,
    } }
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

  return { name, defaults, promptLimit, descriptors: [
    descriptor('read', readRequest), descriptor('preview', readRequest), descriptor('save', saveRequest),
  ] }
}
