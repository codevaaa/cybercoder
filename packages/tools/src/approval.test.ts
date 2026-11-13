import assert from 'node:assert/strict';
import test from 'node:test';
import { ApprovalGate, type ApprovalDecision, type ApprovalPrompt, type ApprovalUI } from './approval.js';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('ApprovalGate serializes approval and destructive execution across agents', async () => {
  let activeActions = 0;
  let maxActiveActions = 0;
  let prompts = 0;
  const ui: ApprovalUI = {
    async ask(_prompt: ApprovalPrompt): Promise<ApprovalDecision> {
      prompts++;
      await pause(1);
      return 'allow';
    },
  };
  const gate = new ApprovalGate(ui);
  const toolName = `parallel-test-${Date.now()}`;

  const results = await Promise.all(Array.from({ length: 5 }, (_, index) =>
    gate.withApproval({
      toolName,
      input: { index },
      summary: `Run worker ${index}`,
      destructive: true,
    }, async () => {
      activeActions++;
      maxActiveActions = Math.max(maxActiveActions, activeActions);
      await pause(2);
      activeActions--;
      return index;
    }),
  ));

  assert.equal(maxActiveActions, 1);
  assert.equal(prompts, 5);
  assert.deepEqual(results.map((result) => result.allowed && result.value), [0, 1, 2, 3, 4]);
});

test('ApprovalGate releases the execution queue when an action fails', async () => {
  const gate = new ApprovalGate({ async ask() { return 'allow'; } });
  const prompt = {
    toolName: `failure-test-${Date.now()}`,
    input: {},
    summary: 'Exercise failure recovery',
    destructive: true,
  };

  await assert.rejects(gate.withApproval(prompt, async () => { throw new Error('expected'); }), /expected/);
  const afterFailure = await gate.withApproval(prompt, async () => 'completed');
  assert.deepEqual(afterFailure, { allowed: true, value: 'completed' });
});
