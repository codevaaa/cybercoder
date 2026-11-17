import assert from 'node:assert/strict';
import test from 'node:test';
import { AnthropicProvider } from './anthropic.js';

test('streams Claude text, tool calls, and usage from the Messages API', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const events = [
    ['message_start', { type: 'message_start', message: { usage: { input_tokens: 19 } } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'I found ' } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'the file.' } }],
    ['content_block_start', { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'read_file', input: {} } }],
    ['content_block_delta', { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"path":"src/app.ts"}' } }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 7 } }],
    ['message_stop', { type: 'message_stop' }],
  ];
  const sse = events.map(([eventName, data]) => `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`).join('');

  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;

  try {
    const provider = new AnthropicProvider({ apiKey: 'test-key', baseURL: 'https://unit.test' });
    const chunks = [];
    for await (const chunk of provider.chat({
      model: 'claude-sonnet-4-5',
      systemPrompt: 'Use tools carefully.',
      messages: [{ role: 'user', content: 'Inspect src/app.ts' }],
      tools: [{ name: 'read_file', description: 'Read a file', inputSchema: { type: 'object' } }],
    })) chunks.push(chunk);

    assert.equal(requestUrl, 'https://unit.test/v1/messages');
    assert.equal(new Headers(requestInit?.headers).get('x-api-key'), 'test-key');
    const body = JSON.parse(String(requestInit?.body));
    assert.equal(body.model, 'claude-sonnet-4-5');
    assert.equal(body.system, 'Use tools carefully.');
    assert.equal(body.tools[0].name, 'read_file');
    assert.deepEqual(chunks.find((chunk) => chunk.type === 'tool_call'), {
      type: 'tool_call',
      toolCall: { id: 'toolu_1', name: 'read_file', input: { path: 'src/app.ts' } },
    });
    assert.equal(chunks.filter((chunk) => chunk.type === 'text').map((chunk) => chunk.text).join(''), 'I found the file.');
    assert.deepEqual(chunks.find((chunk) => chunk.type === 'usage'), { type: 'usage', inputTokens: 19, outputTokens: 7 });
    assert.deepEqual(chunks.at(-1), { type: 'done', reason: 'tool_use' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns a clear local error when Claude is selected without an API key', async () => {
  const provider = new AnthropicProvider({ apiKey: '' });
  const chunks = [];
  for await (const chunk of provider.chat({ model: 'claude-sonnet-4-5', messages: [] })) chunks.push(chunk);
  assert.deepEqual(chunks, [{ type: 'done', reason: 'error', error: 'Anthropic API key is not configured.' }]);
});
