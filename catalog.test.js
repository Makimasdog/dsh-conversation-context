import assert from 'node:assert/strict'
import test from 'node:test'
import { candidates, classify, parseRecommendation } from './catalog.js'

test('description tags are additive and prioritize relevant candidate metadata', () => {
  const slides = { name: 'deck_tool', description: 'Read a presentation and generate a PPTX file.' }
  const metadata = classify(slides)
  assert.equal(metadata.category, '演示文稿')
  assert.deepEqual(metadata.tags, ['演示文稿', '项目与文件', '读取', '编辑'])
  assert.equal(classify(slides), metadata)
  const shell = { name: 'bash', description: 'Execute a shell command.' }
  const rows = [shell, slides].map(item => ({ ...item, ...classify(item) }))
  assert.equal(candidates('我需要制作 PPT', rows)[0].name, slides.name)
})

test('only exact, available candidates survive the model response', () => {
  const tools = [{ name: 'read' }]
  const skills = [{ name: 'slides' }]
  assert.deepEqual(parseRecommendation('```json\n{"tools":["read","fake","read"],"skills":["slides"]}\n```', tools, skills),
    { tools: ['read'], skills: ['slides'] })
  assert.throws(() => parseRecommendation('{"tools":"read","skills":[]}', tools, skills))
})
