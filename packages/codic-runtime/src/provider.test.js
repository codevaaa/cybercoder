import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CodevaProvider } from './provider.ts'

const sse = (events) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), {
  status: 200,
  headers: { 'content-type': 'text/event-stream' },
})

test('CodevaProvider adapts normalized SSE text, tool, usage, and completion events', async () => {
  let requestBody
  const provider = new CodevaProvider({
    apiBaseUrl: 'https://api.example.test/api/v1/',
    getAccessToken: async () => 'access-token',
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://api.example.test/api/v1/codic/turns')
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer access-token')
      requestBody = JSON.parse(init.body)
      return sse([
        { type: 'heartbeat' },
        { type: 'text', text: 'Created ' },
        { type: 'tool_call', toolCall: { id: 'call-1', name: 'write_file', input: { path: 'new.js', content: 'ok' } } },
        { type: 'usage', inputTokens: 16, outputTokens: 8, estimated: true },
        { type: 'done', reason: 'tool_calls' },
      ])
    },
  })

  const chunks = []
  for await (const chunk of provider.chat({
    model: 'auto',
    systemPrompt: 'Use project tools.',
    messages: [{ role: 'user', content: 'Create a file.' }],
    tools: [{ name: 'write_file', description: 'Write a file', inputSchema: { type: 'object' } }],
  })) chunks.push(chunk)

  assert.equal(requestBody.messages[0].role, 'system')
  assert.equal(requestBody.tools[0].function.name, 'write_file')
  assert.deepEqual(chunks.map((chunk) => chunk.type), ['text', 'tool_call', 'usage', 'done'])
  assert.equal(chunks[1].toolCall.input.path, 'new.js')
  assert.deepEqual(chunks[2], { type: 'usage', inputTokens: 16, outputTokens: 8, estimated: true })
  assert.equal(chunks[3].reason, 'end_turn')
})

test('CodevaProvider accepts the authenticated model catalog and surfaces structured server failures', async () => {
  let call = 0
  const provider = new CodevaProvider({
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'access-token',
    fetchImpl: async () => {
      call += 1
      return call === 1
        ? Response.json({ models: [{ id: 'auto' }, { id: 'codeva/ravan' }] })
        : sse([{ type: 'error', error: { code: 'QUOTA', message: 'Monthly token quota reached.' } }])
    },
  })
  assert.deepEqual(await provider.listModels(), ['auto', 'codeva/ravan'])
  const chunks = []
  for await (const chunk of provider.chat({ model: 'auto', messages: [{ role: 'user', content: 'Hello' }] })) chunks.push(chunk)
  assert.deepEqual(chunks, [{ type: 'done', reason: 'error', error: 'Monthly token quota reached.' }])
})

test('CodevaProvider refuses to call the service without an account session', async () => {
  const provider = new CodevaProvider({ apiBaseUrl: 'https://api.example.test/api/v1', getAccessToken: async () => null })
  const chunks = []
  for await (const chunk of provider.chat({ model: 'auto', messages: [{ role: 'user', content: 'Hello' }] })) chunks.push(chunk)
  assert.equal(chunks[0]?.type, 'done')
  assert.match(chunks[0]?.error ?? '', /Sign in to Codeva/)
})
