import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { AgentTool } from '@cybermind/core';
import type { ChatRequest, LLMProvider, ProviderInfo } from '@cybermind/providers';
import { spawnSubagent, type Skill } from '@cybermind/skills';
import { ApprovalGate, WorkspaceCheckpoints, editTool, executeApprovedWorkspaceTool } from '@cybermind/tools';

const info: ProviderInfo = {
  id: 'openai',
  displayName: 'Subagent workspace self-check',
  requiresNetwork: false,
  ready: true,
};

function writerSkill(): Skill {
  return {
    id: 'self-check/writer',
    source: 'bundled',
    path: 'self-check/SKILL.md',
    frontmatter: {
      name: 'writer',
      description: 'Makes an approved change and reports it.',
      version: '1.0.0',
      inputs: [],
      outputs: [],
      requires: { tools: ['edit'], mcp: [] },
      triggers: [],
      official: false,
    },
    body: 'Make the requested edit, then summarize the result.',
  };
}

function makeProvider(requests: ChatRequest[]): LLMProvider {
  return {
    info,
    async listModels() { return ['self-check']; },
    async *chat(request) {
      requests.push(request);
      if (requests.length % 2 === 1) {
        yield {
          type: 'tool_call',
          toolCall: { id: `edit-${requests.length}`, name: 'edit', input: { path: 'note.txt', old_string: 'before', new_string: 'after' } },
        };
        yield { type: 'done', reason: 'tool_use' };
        return;
      }
      yield { type: 'text', text: 'Updated note.txt.' };
      yield { type: 'done', reason: 'end_turn' };
    },
  };
}

test('write-capable subagent uses the selected project, asks before editing, and can be restored from checkpoint', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-subagent-write-'));
  const notePath = join(root, 'note.txt');
  writeFileSync(notePath, 'before\n', 'utf8');
  const checkpoints = new WorkspaceCheckpoints('self-check', root, join(root, '.checkpoints'));
  const decisions: Array<'deny' | 'allow'> = ['deny', 'allow'];
  const prompts: string[] = [];
  const gate = new ApprovalGate({
    async ask(prompt) {
      prompts.push(prompt.toolName);
      return decisions.shift() ?? 'deny';
    },
  });
  const editToolWithApproval: AgentTool = {
    schema: editTool.schema,
    destructive: true,
    async execute(input, ctx) {
      return executeApprovedWorkspaceTool(editTool, gate, checkpoints, input, ctx, 'Edit note.txt');
    },
  };
  const requests: ChatRequest[] = [];
  const provider = makeProvider(requests);

  try {
    const denied = await spawnSubagent({
      skill: writerSkill(),
      prompt: 'Change before to after in note.txt.',
      provider,
      cwd: root,
      toolPool: [editToolWithApproval],
      agentId: 'writer-denied',
    });
    assert.equal(denied.reason, 'end_turn');
    assert.equal(readFileSync(notePath, 'utf8'), 'before\n');
    assert.equal(checkpoints.list().length, 0, 'denied edits must not create a checkpoint or mutate files');

    const approved = await spawnSubagent({
      skill: writerSkill(),
      prompt: 'Change before to after in note.txt.',
      provider,
      cwd: root,
      toolPool: [editToolWithApproval],
      agentId: 'writer-approved',
    });
    assert.equal(approved.reason, 'end_turn');
    assert.match(approved.summary, /Updated note\.txt/);
    assert.equal(readFileSync(notePath, 'utf8'), 'after\n');
    assert.deepEqual(requests.map((request) => request.tools?.map((tool) => tool.name)), [['edit'], ['edit'], ['edit'], ['edit']]);
    assert.equal(requests[0]?.messages[0]?.content.includes('Change before to after'), true);
    assert.deepEqual(prompts, ['edit', 'edit']);

    const [checkpoint] = checkpoints.list();
    assert.ok(checkpoint, 'approved file mutation should create a checkpoint');
    const restored = checkpoints.restore(checkpoint.seq);
    assert.equal(restored.restored, 1);
    assert.equal(readFileSync(notePath, 'utf8'), 'before\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
