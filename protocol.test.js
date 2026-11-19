import assert from 'node:assert/strict'
import test from 'node:test'
import { protocol } from './protocol.js'

const { descriptors, defaults, promptLimit } = protocol()
const parse = method => descriptors.find(entry => entry.method === method).parameters[0].codec.create().parse

test('the wire format distinguishes defaults, empty selections, and literal prompts', () => {
  const save = parse('save')
  const request = { sessionId: 'session-1', revision: 0, ...defaults }
  assert.deepEqual(save(request), { sessionId: 'session-1', revision: 0, config: defaults })
  assert.deepEqual(save({ ...request, tools: [], skills: ['b', 'a', 'a'], prompt: ' {{literal}} ' }), {
    sessionId: 'session-1', revision: 0, config: {
      tools: [], skills: ['a', 'b'], prompt: ' {{literal}} ', promptMode: 'replace', contexts: [],
    },
  })
  assert.equal(save({ ...request, prompt: 'extra', promptMode: 'append' }).config.promptMode, 'append')
  assert.equal(save({ ...request, promptMode: 'append' }).config.promptMode, 'replace')
})

test('malformed updates are rejected before reaching the host service', () => {
  const save = parse('save')
  const request = { sessionId: 'session-1', revision: 0, ...defaults }
  for (const invalid of [
    { sessionId: '' }, { revision: -1 }, { revision: '0' }, { tools: [''] }, { skills: [123] },
    { prompt: ' ' }, { prompt: 'a'.repeat(promptLimit + 1) }, { tools: undefined }, { promptMode: 'unknown' },
    { contexts: [{ name: 'a', text: null }, { name: 'a', text: 'duplicate' }] },
    { contexts: [{ name: 'a', text: 1 }] },
  ]) assert.throws(() => save({ ...request, ...invalid }), TypeError)
})

test('runtime context layers preserve disable and literal edit values', () => {
  const contexts = [{ name: 'optional', text: null }, { name: 'notes', text: '{{literal}}' }]
  assert.deepEqual(parse('save')({ sessionId: 's', revision: 1, ...defaults, contexts }).config.contexts, contexts)
  assert.deepEqual(parse('recommend')({ sessionId: 's', task: ' 制作 PPT ' }), { sessionId: 's', task: '制作 PPT' })
  assert.throws(() => parse('recommend')({ sessionId: 's', task: ' ' }), TypeError)
})
