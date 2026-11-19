const categories = [
  ['演示文稿', /powerpoint|presentation|slide|\bpptx?\b|幻灯片|演示文稿/i],
  ['数据与表格', /spreadsheet|\b(?:csv|xlsx|excel|sql)\b|database|数据|表格/i],
  ['文档', /\b(?:docx|pdf|document|markdown)\b|文档|报告|排版/i],
  ['图像与设计', /\b(?:image|screenshot|design|figma|diagram|ui)\b|图片|截图|视觉|设计|绘图/i],
  ['网络与搜索', /\b(?:web|http|https|url|browser|browse)\b|联网|网页|浏览器/i],
  ['项目与文件', /\b(?:file|files|filesystem|directory|directories|glob|grep|workspace|patch)\b|文件|目录|工作区/i],
  ['命令与终端', /\b(?:bash|powershell|pwsh|shell|terminal|command)\b|命令|终端/i],
  ['开发与测试', /\b(?:code|coding|testing|debug|regression|git|test|refactor)\b|开发|代码|测试|调试/i],
  ['计划与协作', /\b(?:plan|planning|agent|subagent|workflow|task|dispatch|schedule)\b|计划|协作|委派|任务|自动化/i],
]

const actions = [
  ['读取', /\b(?:read|fetch|inspect|list|view|extract)\b|读取|查看|提取/i],
  ['搜索', /\b(?:search|find|query|grep|discover|glob)\b|搜索|查找|查询/i],
  ['编辑', /\b(?:edit|write|create|generate|update|patch|modify)\b|编辑|写入|生成|创建|修改/i],
  ['审查', /\b(?:review|audit|verify|check|validate|test)\b|审查|核对|验证|测试/i],
]

const classified = new WeakMap()

export function classify(item) {
  const description = typeof item.description === 'string' ? item.description : ''
  const cached = classified.get(item)
  if (cached?.description === description) return cached.result
  const name = item.name.replace(/[_-]/g, ' ')
  const text = name + ' ' + description
  const matches = categories.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag)
  const primary = categories.find(([, pattern]) => pattern.test(name))?.[0] ?? matches[0]
  const result = {
    category: primary ?? '其他',
    tags: [...matches, ...actions.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag)],
  }
  classified.set(item, { description, result })
  return result
}

export function candidates(task, rows) {
  const taskTags = new Set(classify({name: task, description: ''}).tags)
  const keywords = task.toLowerCase().match(/[a-z0-9]{2,}|[\p{Script=Han}]{2,}/gu) ?? []
  return rows.filter(row => !row.disconnected)
    .map(row => {
      const text = `${row.name} ${row.description}`.toLowerCase()
      const score = row.tags.filter(tag => taskTags.has(tag)).length * 3 +
        keywords.filter(word => text.includes(word)).length
      return { row, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
    .map(({ row }) => ({
      name: row.name,
      description: row.description.slice(0, 220),
      tags: row.tags,
    }))
}

export function parseRecommendation(text, tools, skills) {
  const value = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  function selected(names, candidates) {
    if (!Array.isArray(names) || names.some(name => typeof name !== 'string')) throw new Error('Invalid selection')
    const allowed = new Set(candidates.map(row => row.name))
    return [...new Set(names.filter(name => allowed.has(name)))].slice(0, 20)
  }
  return { tools: selected(value.tools, tools), skills: selected(value.skills, skills) }
}
