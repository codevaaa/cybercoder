import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderRouter } from './router.js';

test('routes explicit model families to their configured providers', () => {
  const router = new ProviderRouter({
    preferred: ['anthropic', 'openai', 'gemini', 'groq', 'openrouter', 'cybermind-cloud'],
    anthropic: { apiKey: 'anthropic-test' },
    openai: { apiKey: 'openai-test' },
    google: { apiKey: 'google-test' },
    groq: { apiKey: 'groq-test' },
    openrouter: { apiKey: 'openrouter-test' },
    cloud: { apiKey: 'codeva-test' },
  });

  assert.equal(router.activeProvider('claude-sonnet-4-5').info.id, 'anthropic');
  assert.equal(router.activeProvider('gpt-4o').info.id, 'openai');
  assert.equal(router.activeProvider('gemini-2.5-pro').info.id, 'gemini');
  assert.equal(router.activeProvider('llama-3.3-70b-versatile').info.id, 'groq');
  assert.equal(router.activeProvider('anthropic/claude-sonnet-4-5').info.id, 'openrouter');
  assert.equal(router.activeProvider('ravan').info.id, 'cybermind-cloud');
});

test('fails selected providers clearly when their key is not configured', async () => {
  const router = new ProviderRouter();
  const chunks = [];
  for await (const chunk of router.chat({ model: 'claude-sonnet-4-5', messages: [] })) chunks.push(chunk);
  assert.deepEqual(chunks, [
    { type: 'done', reason: 'error', error: 'Anthropic Claude is selected but its API key is not configured.' },
  ]);
});
