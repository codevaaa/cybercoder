import assert from 'node:assert/strict';
import test from 'node:test';
import { runAgentLoop, providerRetryDelayMs, type AgentEvent } from './agent-loop.js';
import type { LLMProvider, ProviderInfo } from '@cybermind/providers';

const providerInfo: ProviderInfo = {
  id: 'openai',
  displayName: 'Test provider',
  requiresNetwork: false,
  ready: true,
};

test('rate-limit retry delay uses Retry-After and bounded exponential backoff', () => {
  assert.equal(providerRetryDelayMs('429 rate limit; retry-after: 0.02s', 1), 20);
  assert.equal(providerRetryDelayMs('503 overloaded', 1), 1_000);
  assert.equal(providerRetryDelayMs('503 overloaded', 2), 2_000);
  assert.equal(providerRetryDelayMs('503 overloaded', 99), 30_000);
  assert.equal(providerRetryDelayMs('429 retry-after: 900s', 1), 30_000);
});

test('agent loop waits and retries a provider 429 before returning the response', async () => {
  let calls = 0;
  const provider: LLMProvider = {
    info: providerInfo,
    async listModels() { return ['test']; },
    async *chat() {
      calls++;
      if (calls === 1) {
        yield { type: 'done', reason: 'error', error: '429 rate limit; retry-after: 0.01s' };
        return;
      }
      yield { type: 'text', text: 'Recovered after backoff.' };
      yield { type: 'done', reason: 'end_turn' };
    },
  };

  const events: AgentEvent[] = [];
  for await (const event of runAgentLoop([{ role: 'user', content: 'hello' }], { provider, model: 'test' })) {
    events.push(event);
  }

  assert.equal(calls, 2);
  assert.ok(events.some((event) => event.type === 'context' && /retry 1\/3 in 10ms/.test(event.note)));
  assert.ok(events.some((event) => event.type === 'text' && event.text === 'Recovered after backoff.'));
  assert.deepEqual(events.at(-1), { type: 'done', reason: 'end_turn' });
});

test('agent loop cancels a pending provider retry promptly', async () => {
  let calls = 0;
  const controller = new AbortController();
  const provider: LLMProvider = {
    info: providerInfo,
    async listModels() { return ['test']; },
    async *chat() {
      calls++;
      yield { type: 'done', reason: 'error', error: '429 rate limit; retry-after: 30s' };
    },
  };

  const events: AgentEvent[] = [];
  for await (const event of runAgentLoop([{ role: 'user', content: 'hello' }], {
    provider,
    model: 'test',
    signal: controller.signal,
  })) {
    events.push(event);
    if (event.type === 'context') controller.abort();
  }

  assert.equal(calls, 1);
  assert.deepEqual(events.at(-1), { type: 'done', reason: 'error', error: 'aborted while waiting to retry' });
});
