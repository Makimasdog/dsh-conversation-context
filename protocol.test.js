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
    sessionId: 'session-1', revision: 0, config: { tools: [], skills: ['a', 'b'], prompt: ' {{literal}} ', promptMode: 'replace' },
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
  ]) assert.throws(() => save({ ...request, ...invalid }), TypeError)
})
