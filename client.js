window.__ModuleLoader__.load({
  id: '@local/dsh-conversation-context',
  factory(require) {
    const { createElement: h, useEffect, useRef, useState } = require('react')
    /* protocol factory */
    const { name, defaults, descriptors, promptLimit, taskLimit } = protocol()
    const tabs = [['tools', '工具'], ['skills', '技能'], ['prompt', '系统提示词'], ['contexts', '上下文层次'], ['recommend', 'AI 推荐']]
    const groupModes = [['source', '来源'], ['category', '功能'], ['tags', '标签']]
    const skillSources = {
      'project-dsh': '项目 · DSH', 'project-agents': '项目 · Agent Skills',
      'user-dsh': '用户 · DSH', 'user-agents': '用户 · Agent Skills',
      runtime: '运行时', bundled: '随预设提供',
    }
    const contextLabels = {
      'conversation-context:notes': '会话补充',
      'working-directory:current': '工作目录',
    }
    const slot = 'conversation.input.left'
    const style = `
      .dcc-trigger,.dcc-panel button,.dcc-panel input,.dcc-panel textarea {font:inherit}
      .dcc-trigger,.dcc-panel button {
        border:1px solid transparent;border-radius:7px;padding:6px 9px;cursor:pointer;
        color:var(--dsw-alias-label-primary,CanvasText);background:transparent;line-height:1.3
      }
      .dcc-trigger {display:inline-flex;gap:5px;align-items:center;white-space:nowrap;font-size:13px}
      .dcc-trigger:hover,.dcc-panel button:hover,.dcc-panel label.dcc-item:hover {
        background:var(--dsw-alias-interactive-bg-hover,ButtonFace)
      }
      .dcc-trigger:focus-visible,.dcc-panel :focus-visible {
        outline:2px solid var(--dsw-alias-state-business-primary,Highlight);outline-offset:2px
      }
      .dcc-panel {
        width:min(510px,calc(100vw - 24px));max-height:min(690px,calc(100dvh - 24px));box-sizing:border-box;
        background:var(--dsw-alias-bg-module-platform,Canvas);color:var(--dsw-alias-label-primary,CanvasText);
        border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:14px;padding:0;
        box-shadow:0 16px 52px #0004;font-size:14px;line-height:1.45
      }
      .dcc-panel::backdrop {background:#11182724}
      .dcc-panel.dcc-wide {width:min(820px,calc(100vw - 24px));max-height:calc(100dvh - 24px)}
      .dcc-layout {display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;max-height:inherit}
      .dcc-head,.dcc-actions,.dcc-tabs,.dcc-modes {display:flex;align-items:center;gap:6px}
      .dcc-head,.dcc-actions {justify-content:space-between;padding:12px 16px}
      .dcc-head h2 {font-size:16px;margin:0}
      .dcc-tabs,.dcc-modes {flex-wrap:wrap}
      .dcc-tabs {padding:0 16px 8px;border-bottom:1px solid var(--dsw-alias-border-l2,GrayText)}
      .dcc-panel [aria-pressed=true] {background:var(--dsw-alias-interactive-bg-hover,ButtonFace);border-color:var(--dsw-alias-border-l2,GrayText);font-weight:600}
      .dcc-body {min-height:0;overflow:auto;padding:12px 16px;overscroll-behavior:contain}
      .dcc-body p,.dcc-subtle {font-size:12px;color:var(--dsw-alias-label-secondary,CanvasText)}
      .dcc-body p {margin:8px 0 12px}
      .dcc-panel input[type=search],.dcc-panel textarea {
        width:100%;box-sizing:border-box;border-radius:8px;padding:8px 10px;
        border:1px solid var(--dsw-alias-border-l2,GrayText);background:var(--dsw-specific-input-major,Canvas);
        color:inherit
      }
      .dcc-panel textarea {min-height:175px;resize:vertical;margin-top:6px}
      .dcc-list {max-height:245px;overflow:auto;scroll-padding:6px;padding:4px}
      .dcc-wide .dcc-list {max-height:min(460px,42dvh)}
      .dcc-tags {display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
      .dcc-tags em {font-size:11px;font-style:normal;padding:1px 5px;border:1px solid var(--dsw-alias-border-l2,GrayText);border-radius:5px}
      .dcc-layer {padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l2,GrayText)}
      .dcc-layer summary {cursor:pointer;overflow-wrap:anywhere}
      .dcc-layer pre {white-space:pre-wrap;overflow-wrap:anywhere;max-height:300px;overflow:auto}
      .dcc-layer textarea {min-height:110px}
      .dcc-list h3 {font-size:12px;margin:12px 4px 4px;color:var(--dsw-alias-label-secondary,CanvasText)}
      .dcc-group {display:flex;align-items:center;gap:7px;cursor:pointer}
      .dcc-group input {margin:0;accent-color:var(--dsw-alias-state-business-primary,Highlight)}
      .dcc-preview h3 {font-size:13px;margin:12px 0 4px}
      .dcc-preview pre {white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto}
      .dcc-item {display:flex;align-items:flex-start;gap:9px;padding:7px 4px;border-radius:7px;overflow-wrap:anywhere;cursor:pointer}
      .dcc-item input {flex:none;margin-top:4px;accent-color:var(--dsw-alias-state-business-primary,Highlight)}
      .dcc-item span {display:block;min-width:0}
      .dcc-item small {display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .dcc-actions {border-top:1px solid var(--dsw-alias-border-l2,GrayText);flex-wrap:wrap}
      .dcc-actions > div {display:flex;gap:6px;margin-inline-start:auto}
      .dcc-panel .dcc-primary {background:var(--dsw-alias-state-business-primary,Highlight);color:var(--dsw-alias-label-reverse,#fff)}
      .dcc-panel button:disabled,.dcc-item:has(input:disabled) {opacity:.58;cursor:default}
      .dcc-error {margin:0;padding:8px 16px;color:var(--dsw-alias-state-danger-label,#b12222);font-size:13px}
    `

    function sourceLabel(key, row) {
      return key === 'skills'
        ? [skillSources[row.source] ?? row.source ?? '其他来源', row.provider].filter(Boolean).join(' · ')
        : row.source
    }

    function groupsFor(key, mode, row) {
      if (mode === 'tags') return row.tags.length > 0 ? row.tags : ['无标签']
      return [mode === 'source' ? sourceLabel(key, row) : row.category]
    }

    async function request(rpc, method, input, signal) {
      const result = await rpc[method](input, signal)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    }

    function Panel({ sessionId, rpc }) {
      const dialog = useRef(null)
      const trigger = useRef(null)
      const pending = useRef(null)
      const recommending = useRef(null)
      const [snapshot, setSnapshot] = useState(null)
      const [draft, setDraft] = useState(defaults)
      const [tab, setTab] = useState('tools')
      const [search, setSearch] = useState('')
      const [busy, setBusy] = useState(false)
      const [failure, setFailure] = useState('')
      const [editingPrompt, setEditingPrompt] = useState(false)
      const [showPreview, setShowPreview] = useState(false)
      const [preview, setPreview] = useState(null)
      const [previewError, setPreviewError] = useState('')
      const [groupMode, setGroupMode] = useState('category')
      const [wide, setWide] = useState(false)
      const [layers, setLayers] = useState(null)
      const [layerError, setLayerError] = useState('')
      const [layerRetry, setLayerRetry] = useState(0)
      const [task, setTask] = useState('')
      const [recommendBusy, setRecommendBusy] = useState(false)
      const [recommendation, setRecommendation] = useState(null)
      const [recommendError, setRecommendError] = useState('')
      const titleId = `dcc-${sessionId}`
      useEffect(() => () => { pending.current?.abort(); recommending.current?.abort() }, [])
      useEffect(() => {
        if (tab !== 'contexts' || !snapshot || showPreview) return
        const controller = new AbortController()
        setLayers(null)
        setLayerError('')
        request(rpc, 'contextLayers', { sessionId }, controller.signal).then(value => {
          if (controller.signal.aborted) return
          if (value.revision !== snapshot.revision) {
            setLayerError('会话配置已更新，请重新打开面板。')
            return
          }
          setLayers(value.layers)
        }, error => {
          if (!controller.signal.aborted) setLayerError(error.message)
        })
        return () => controller.abort()
      }, [tab, snapshot, showPreview, rpc, sessionId, layerRetry])
      useEffect(() => {
        if (!showPreview) return
        const controller = new AbortController()
        setPreview(null)
        setPreviewError('')
        request(rpc, 'preview', { sessionId }, controller.signal).then(value => {
          if (!controller.signal.aborted) setPreview(value)
        }, error => {
          if (!controller.signal.aborted) setPreviewError(error.message)
        })
        return () => controller.abort()
      }, [showPreview, rpc, sessionId])

      async function open() {
        setBusy(true)
        setSnapshot(null)
        setFailure('')
        setShowPreview(false)
        setTab('tools')
        setSearch('')
        setTask('')
        setRecommendation(null)
        setRecommendError('')
        const controller = new AbortController()
        pending.current = controller
        dialog.current.showModal()
        try {
          const data = await request(rpc, 'read', { sessionId }, controller.signal)
          if (controller.signal.aborted) return
          setSnapshot(data)
          setDraft(data.config)
          setEditingPrompt(data.config.prompt !== null)
        } catch (error) {
          if (!controller.signal.aborted) setFailure(error.message)
        } finally {
          if (!controller.signal.aborted) setBusy(false)
        }
      }

      function close() {
        pending.current?.abort()
        recommending.current?.abort()
        recommending.current = null
        setRecommendBusy(false)
        setShowPreview(false)
        trigger.current?.focus()
      }

      async function save(config) {
        if (!snapshot || busy) return
        setBusy(true)
        setFailure('')
        const controller = new AbortController()
        pending.current = controller
        try {
          const data = await request(rpc, 'save', {
            sessionId, revision: snapshot.revision, ...config,
          }, controller.signal)
          if (controller.signal.aborted) return
          setSnapshot(data)
          dialog.current.close()
        } catch (error) {
          if (!controller.signal.aborted) setFailure(error.message)
        } finally {
          if (!controller.signal.aborted) setBusy(false)
        }
      }

      function select(value) {
        setDraft(previous => ({ ...previous, [tab]: value }))
      }

      function editLayer(name, text) {
        setDraft(previous => {
          const contexts = previous.contexts.filter(row => row.name !== name)
          if (text !== undefined) contexts.push({ name, text })
          return { ...previous, contexts }
        })
      }

      async function recommend() {
        if (!task.trim() || recommending.current) return
        const controller = new AbortController()
        recommending.current = controller
        setRecommendBusy(true)
        setRecommendation(null)
        setRecommendError('')
        try {
          const result = await request(rpc, 'recommend', { sessionId, task }, controller.signal)
          if (controller.signal.aborted) return
          const tools = result.tools.filter(name => snapshot.tools.some(row => row.name === name && !row.disconnected))
          const skills = result.skills.filter(name => snapshot.skills.some(row => row.name === name))
          setRecommendation({ tools, skills })
          if (tools.length || skills.length) setDraft(previous => ({ ...previous, tools, skills }))
        } catch (error) {
          if (!controller.signal.aborted) setRecommendError(error.message)
        } finally {
          if (recommending.current === controller) {
            recommending.current = null
            setRecommendBusy(false)
          }
        }
      }

      const catalogTab = tab === 'tools' || tab === 'skills'
      const selected = draft[tab]
      const rows = snapshot?.[tab] ?? []
      const manualSkills = draft.skills !== null
      const groups = new Map()
      if (catalogTab) {
        const filter = search.trim().toLowerCase()
        for (const row of rows) {
          if (!`${row.name} ${row.description} ${sourceLabel(tab, row)} ${row.category} ${row.tags.join(' ')}`.toLowerCase().includes(filter)) continue
          for (const heading of groupsFor(tab, groupMode, row)) {
            if (!groups.has(heading)) groups.set(heading, [])
            groups.get(heading).push(row)
          }
        }
      }
      const active = snapshot && (snapshot.config.contexts.length > 0 || ['tools', 'skills', 'prompt'].some(key => snapshot.config[key] !== null))
      const ready = snapshot && !busy && !recommendBusy
      const canSave = ready && (!editingPrompt || draft.prompt?.trim()) &&
        draft.contexts.every(row => row.text === null || row.text.trim())
      const selectable = catalogTab
        ? rows.filter(row => !row.disconnected && (tab !== 'tools' || !manualSkills || row.name !== 'skill'))
        : []

      function groupCheckbox(heading) {
        const names = selectable.filter(row => groupsFor(tab, groupMode, row).includes(heading)).map(row => row.name)
        const current = new Set(selected ?? selectable.map(row => row.name))
        const count = names.filter(name => current.has(name)).length
        return h('label', { className: 'dcc-group' },
          h('input', {
            type: 'checkbox', 'aria-label': `全选 ${heading}`,
            checked: names.length > 0 && count === names.length, disabled: !ready || names.length === 0,
            ref: node => { if (node) node.indeterminate = count > 0 && count < names.length },
            onChange: event => {
              for (const name of names) {
                if (event.target.checked) current.add(name)
                else current.delete(name)
              }
              select([...current])
            },
          }), heading)
      }

      function layerRow(row) {
        const override = draft.contexts.find(entry => entry.name === row.name)
        const text = override ? override.text : row.text
        const enabled = text !== null && (!!override || text.length > 0)
        const label = contextLabels[row.name] ?? row.name
        return h('div', { key: row.name, className: 'dcc-layer' },
          h('label', { className: 'dcc-item' },
            h('input', { type: 'checkbox', checked: enabled, disabled: !ready || row.required,
              onChange: event => editLayer(row.name, event.target.checked ? row.text : null) }),
            h('span', null, label, h('small', { className: 'dcc-subtle' }, row.required ? 'DSH 管理 · 只读' : enabled ? '开启' : '关闭'))),
          h('details', null, h('summary', null, `查看${row.required ? '' : '与编辑'}内容 · ${label}`),
            row.required ? h('pre', null, text || '暂无内容') :
              h('textarea', { value: text ?? '', maxLength: promptLimit, disabled: !ready || !enabled,
                'aria-label': `编辑 ${label}`, onChange: event => editLayer(row.name, event.target.value) }),
            override && h('button', { type: 'button', disabled: !ready, onClick: () => editLayer(row.name, undefined) }, '恢复该层默认')))
      }

      return h('div', null,
        h('style', null, style),
        h('button', {
          className: 'dcc-trigger', type: 'button', ref: trigger, onClick: open,
          'aria-haspopup': 'dialog', title: active ? '当前会话有临时配置' : '设置当前会话的工具、技能和上下文',
        },
        h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'aria-hidden': true },
          h('path', { d: 'M2 4h12M2 8h12M2 12h12M6 2v4M10 6v4M5 10v4', strokeWidth: 1.4, strokeLinecap: 'round' })),
        active ? '上下文 · 已自定义' : '上下文'),
        h('dialog', {
          className: wide ? 'dcc-panel dcc-wide' : 'dcc-panel', ref: dialog, 'aria-labelledby': titleId, onClose: close,
          onCancel: event => { if (busy && snapshot) event.preventDefault() },
          onKeyDown: event => {
            if (event.key !== 'Escape' || event.nativeEvent.isComposing) return
            event.preventDefault()
            event.stopPropagation()
            if (!busy || !snapshot) dialog.current.close()
          },
        }, h('div', { className: 'dcc-layout' },
          h('header', { className: 'dcc-head' }, h('h2', { id: titleId }, '会话上下文'),
            h('div', null,
              h('button', { type: 'button', 'aria-pressed': wide, onClick: () => setWide(value => !value) }, wide ? '缩小' : '放大'),
              h('button', { type: 'button', onClick: () => dialog.current.close(), disabled: busy && !!snapshot, 'aria-label': '关闭' }, '×'))),
          h('nav', { className: 'dcc-tabs', 'aria-label': '上下文配置类别' }, tabs.map(([key, label]) =>
            h('button', { key, type: 'button', 'aria-pressed': !showPreview && tab === key,
              disabled: recommendBusy && key !== 'recommend',
              onClick: () => { setShowPreview(false); setTab(key); setSearch('') } }, label))),
          h('section', { className: 'dcc-body', 'aria-busy': busy },
            !snapshot ? h('p', { role: 'status' }, busy ? '正在读取会话配置…' : '关闭面板后可重新加载。') :
              showPreview ? h('div', { className: 'dcc-preview' },
                h('h3', null, '当前生效配置'),
                h('p', null, '按当前会话和模型装配，尚未应用的草稿会留在编辑页。'),
                previewError ? h('p', { role: 'alert' }, previewError) :
                  !preview ? h('p', { role: 'status' }, '正在装配预览…') :
                  h('div', null,
                    h('h3', null, '系统提示词'),
                    h('pre', null, preview.prompt || '空'),
                    h('h3', null, '模型工具声明'),
                    h('p', null, preview.declaredTools.join('、') || '无'),
                    preview.ptc && h('p', null, 'PTC 通过 run_code 调用程序中的工具。工具选择控制程序绑定。'),
                    preview.guardedTools.length > 0 && h('p', null,
                      `已在执行时限制 · ${preview.guardedTools.join('、')}`),
                    h('h3', null, '后续轮次的技能'),
                    h('p', null, preview.skills === null ? '沿用 DSH 的自动发现' : preview.skills.join('、') || '无手动注入'),
                    h('h3', null, '运行上下文'),
                    h('p', null, preview.contexts.map(name => contextLabels[name] ?? name).join('、') || '无'))) :
              tab === 'contexts' ? h('div', null,
                h('p', null, '查看当前会话的运行上下文。可选层可以临时启停或编辑，改动会应用到后续请求。'),
                layerError ? h('div', null, h('p', { role: 'alert' }, layerError),
                  h('button', { type: 'button', onClick: () => setLayerRetry(count => count + 1) }, '重新读取')) :
                  !layers ? h('p', { role: 'status' }, '正在读取上下文层次…') :
                    h('div', null,
                      layers.length === 0 && h('p', null, '当前没有可显示的运行上下文。'),
                      !layers.some(row => !row.required) && h('p', null, '当前预设关闭了可选运行上下文。'),
                      layers.map(layerRow),
                      draft.contexts.filter(entry => !layers.some(row => row.name === entry.name && !row.required))
                        .map(entry => h('div', { key: entry.name, className: 'dcc-layer' }, entry.name,
                          h('button', { type: 'button', onClick: () => editLayer(entry.name, undefined) }, '移除失效配置'))))) :
              tab === 'recommend' ? h('div', null,
                h('label', null, '你想做什么？', h('textarea', {
                  value: task, maxLength: taskLimit, disabled: !ready,
                  placeholder: '例如：我需要制作一份项目汇报 PPT',
                  onChange: event => setTask(event.target.value),
                })),
                h('p', null, '使用当前会话的模型。请求包含任务描述和候选工具、技能的名称与摘要。'),
                h('button', { type: 'button', className: 'dcc-primary', disabled: !ready || !task.trim(), onClick: recommend },
                  recommendBusy ? '正在推荐…' : '推荐并勾选'),
                recommendError && h('p', { role: 'alert' }, recommendError),
                recommendation && h('div', { role: 'status' },
                  recommendation.tools.length || recommendation.skills.length
                    ? h('div', null,
                      h('p', null, '已填入勾选草稿。检查后点击「应用」。'),
                      h('p', null, `工具 · ${recommendation.tools.join('、') || '无'}`),
                      h('p', null, `技能 · ${recommendation.skills.join('、') || '无'}`))
                    : h('p', null, '没有找到匹配的工具或技能。'))) :
              tab === 'prompt' ? h('div', null,
                h('label', { className: 'dcc-item' },
                  h('input', { type: 'checkbox', checked: editingPrompt, disabled: !ready,
                    onChange: event => {
                      const enabled = event.target.checked
                      setEditingPrompt(enabled)
                      setDraft(previous => ({
                        ...previous, prompt: enabled ? '' : null, promptMode: enabled ? 'append' : defaults.promptMode,
                      }))
                    } }), '临时修改系统提示词'),
                h('p', null, '可在预设提示词末尾追加，或替换整段。Lite 等完整提示词预设支持替换。PTC 的工具绑定说明会保留。'),
                editingPrompt && h('div', null,
                  h('div', { className: 'dcc-modes', 'aria-label': '系统提示词模式' },
                    [['append', '追加'], ['replace', '替换']].map(([mode, label]) =>
                      h('button', { key: mode, type: 'button', disabled: !ready, 'aria-pressed': draft.promptMode === mode,
                        onClick: () => setDraft(previous => ({ ...previous, promptMode: mode })) }, label))),
                  h('label', null, '系统提示词',
                  h('textarea', { value: draft.prompt ?? '', maxLength: promptLimit, disabled: !ready,
                    onChange: event => select(event.target.value) }),
                  h('span', { className: 'dcc-subtle' }, `${draft.prompt?.length ?? 0} / ${promptLimit}`)))) :
              h('div', null,
                h('div', { className: 'dcc-modes', 'aria-label': '选择模式' },
                  h('button', { type: 'button', disabled: !ready, 'aria-pressed': selected === null,
                    onClick: () => select(null) }, '默认'),
                  h('button', { type: 'button', disabled: !ready, onClick: () => select(selectable.map(row => row.name)) }, '全选'),
                  h('button', { type: 'button', disabled: !ready, onClick: () => select([]) }, '全不选'),
                  h('span', { className: 'dcc-subtle' }, selected === null ? '' : `已选 ${selected.length}`)),
                h('p', null, tab === 'tools'
                  ? '默认沿用 DSH 当前预设。手动勾选后，每轮只提供所选工具。'
                  : '手动选择后，DSH 在每轮开始时载入所选技能的正文。'),
                h('input', { type: 'search', value: search, onChange: event => setSearch(event.target.value),
                  'aria-label': tab === 'tools' ? '搜索工具' : '搜索技能',
                  placeholder: tab === 'tools' ? '搜索工具…' : '搜索技能…' }),
                h('div', { className: 'dcc-modes', 'aria-label': '分组方式' },
                  groupModes.map(([mode, label]) => h('button', {
                    key: mode, type: 'button', 'aria-pressed': groupMode === mode, onClick: () => setGroupMode(mode),
                  }, label))),
                h('div', { className: 'dcc-list' }, groups.size === 0 ? h('p', null, '没有匹配项。') :
                  [...groups].sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
                    .map(([heading, items]) => h('section', { key: heading },
                    h('h3', null, groupCheckbox(heading)), items.map(row => {
                      const unavailable = tab === 'tools' && manualSkills && row.name === 'skill'
                      return h('label', { className: 'dcc-item', key: row.name },
                        h('input', {
                          type: 'checkbox', disabled: !ready || unavailable,
                          checked: !unavailable && (selected === null || selected.includes(row.name)),
                          onChange: event => {
                            const current = selected ?? selectable.map(item => item.name)
                            select(event.target.checked ? [...current, row.name] : current.filter(name => name !== row.name))
                          },
                        }), h('span', null, row.name, row.executionOnly && !unavailable &&
                          h('span', { className: 'dcc-subtle' }, '会话注册 · 仅限制执行'), h('small', { className: 'dcc-subtle' },
                          unavailable ? '由当前技能清单控制' : row.description),
                          h('small', { className: 'dcc-subtle' }, sourceLabel(tab, row)),
                          row.tags.length > 0 && h('span', { className: 'dcc-tags' }, row.tags.map(tag => h('em', { key: tag }, tag)))))
                    })))))),
          h('div', null,
            failure && h('p', { className: 'dcc-error', role: 'alert' }, failure),
            h('footer', { className: 'dcc-actions' },
              h('button', { type: 'button', disabled: !ready, 'aria-pressed': showPreview,
                onClick: () => setShowPreview(value => !value) }, showPreview ? '返回编辑' : '查看生效配置'),
              h('div', null,
                h('button', { type: 'button', disabled: !ready || !active, onClick: () => save(defaults) }, '恢复默认'),
                h('button', { type: 'button', className: 'dcc-primary', disabled: !canSave,
                  onClick: () => save(draft) }, busy && snapshot ? '应用中…' : '应用')),
              h('span', { className: 'dcc-subtle' }, '仅当前会话 · 应用后下一轮生效'))))))
    }

    return {
      inject: ['slots', 'sessions', 'remote'],
      async apply(ctx) {
        const dispose = await ctx.remote.$mount({ package: name, descriptors })
        ctx.inject(['remote.conversationContext'], scope => {
          const rpc = scope.remote.conversationContext
          scope.slots.inject(slot, () => scope.slots.register({
            name: slot, id: 'conversation-context', order: 30,
            inject: sessionId => ({
              sessionId, rpc,
              available: scope.sessions.subagentAddress(sessionId) === undefined,
            }),
          }, ({ available, ...props }) => available ? h(Panel, { ...props, key: props.sessionId }) : null))
        })
        return dispose
      },
    }
  },
})
