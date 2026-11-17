import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { AgentEvent, AgentTool } from '@cybermind/core';
import type { ChatRequest, LLMProvider, ProviderInfo } from '@cybermind/providers';
import { CollaborationManager } from '@cybermind/shared';
import { orchestrate, routeTaskToSkill } from './orchestrator.js';
import { spawnSubagent } from './runner.js';
import type { Skill, SkillRegistry } from './index.js';

const providerInfo: ProviderInfo = {
  id: 'openai',
  displayName: 'Sub-agent test provider',
  requiresNetwork: false,
  ready: true,
};

function makeSkill(name: string, tools: string[] = []): Skill {
  return {
    id: `bundled/${name}`,
    source: 'bundled',
    path: `/skills/${name}/SKILL.md`,
    frontmatter: {
      name,
      description: `${name} test skill`,
      version: '1.0.0',
      inputs: [],
      outputs: [],
      requires: { tools, mcp: [] },
      triggers: [],
      official: false,
    },
    body: 'Use the supplied task and report a concise result.',
  };
}

test('sub-agent only receives its declared tools and can execute an allowed tool', async () => {
  const requests: ChatRequest[] = [];
  let readCalls = 0;
  let writeCalls = 0;
  const readFile: AgentTool = {
    schema: { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object' } },
    async execute() { readCalls += 1; return 'file contents'; },
  };
  const writeFile: AgentTool = {
    schema: { name: 'write_file', description: 'Write a file', inputSchema: { type: 'object' } },
    async execute() { writeCalls += 1; return 'written'; },
  };
  const provider: LLMProvider = {
    info: providerInfo,
    async listModels() { return ['test']; },
    async *chat(request) {
      requests.push(request);
      if (requests.length === 1) {
        yield {
          type: 'tool_call',
          toolCall: { id: 'read-1', name: 'read_file', input: { path: 'README.md' } },
        };
        yield { type: 'done', reason: 'tool_use' };
        return;
      }
      if (requests.length === 2) {
        yield {
          type: 'tool_call',
          toolCall: { id: 'write-1', name: 'write_file', input: { path: 'README.md', content: 'changed' } },
        };
        yield { type: 'done', reason: 'tool_use' };
        return;
      }
      yield { type: 'text', text: 'Read-only review complete.' };
      yield { type: 'done', reason: 'end_turn' };
    },
  };
  const events: AgentEvent[] = [];

  const result = await spawnSubagent({
    skill: makeSkill('read-only-reviewer', ['read_file']),
    prompt: 'Inspect the README',
    provider,
    toolPool: [readFile, writeFile],
    onEvent: (event) => events.push(event),
  });

  assert.deepEqual(requests[0]?.tools?.map((tool) => tool.name), ['read_file']);
  assert.deepEqual(requests[1]?.tools?.map((tool) => tool.name), ['read_file']);
  assert.equal(readCalls, 1);
  assert.equal(writeCalls, 0);
  assert.equal(result.summary, 'Read-only review complete.');
  assert.equal(result.toolCalls, 2);
  assert.ok(requests.length === 3);
  assert.equal(result.reason, 'end_turn');
  assert.deepEqual(events.filter((event) => event.type === 'subagent_progress').map((event) => event.status), [
    'started', 'working', 'working', 'completed',
  ]);
});

test('agent team executes in parallel up to its limit and returns results in input order', async () => {
  let active = 0;
  let peakActive = 0;
  const provider: LLMProvider = {
    info: providerInfo,
    async listModels() { return ['test']; },
    async *chat(request) {
      active += 1;
      peakActive = Math.max(peakActive, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 15));
        const prompt = request.messages[0]?.content ?? '';
        yield { type: 'text', text: `Finished ${prompt}` };
        yield { type: 'done', reason: 'end_turn' };
      } finally {
        active -= 1;
      }
    },
  };
  const skill = makeSkill('researcher');
  const registry = {
    get: (name: string) => name === skill.frontmatter.name ? skill : undefined,
    list: () => [skill],
  } as unknown as SkillRegistry;
  const progress: Array<Extract<AgentEvent, { type: 'subagent_progress' }>> = [];
  const tasks = ['A', 'B', 'C', 'D'].map((letter) => ({
    skill: 'researcher',
    prompt: `task ${letter}`,
    label: letter,
  }));

  const results = await orchestrate(tasks, {
    registry,
    provider,
    toolPool: [],
    concurrency: 2,
    onProgress: (event) => progress.push(event),
  });

  assert.equal(peakActive, 2);
  assert.deepEqual(results.map((result) => result.task.label), ['A', 'B', 'C', 'D']);
  assert.deepEqual(results.map((result) => result.ok), [true, true, true, true]);
  assert.match(results[0]?.summary ?? '', /task A/);
  assert.match(results[3]?.summary ?? '', /task D/);
  assert.equal(progress.filter((event) => event.status === 'started').length, 4);
  assert.equal(progress.filter((event) => event.status === 'completed').length, 4);
});

test('agent team serializes every task when a declared capability can mutate the shared workspace', async () => {
  let active = 0;
  let peakActive = 0;
  const provider: LLMProvider = {
    info: providerInfo,
    async listModels() { return ['test']; },
    async *chat(request) {
      active += 1;
      peakActive = Math.max(peakActive, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 10));
        const prompt = request.messages[0]?.content ?? '';
        yield { type: 'text', text: `Finished ${prompt}` };
        yield { type: 'done', reason: 'end_turn' };
      } finally {
        active -= 1;
      }
    },
  };
  const reader = makeSkill('reader', ['read_file']);
  const writer = makeSkill('writer', ['write_file']);
  const skills = [reader, writer];
  const registry = {
    get: (name: string) => skills.find((skill) => skill.frontmatter.name === name),
    list: () => skills,
  } as unknown as SkillRegistry;
  const toolPool: AgentTool[] = [
    { schema: { name: 'read_file', description: 'Read a file', inputSchema: { type: 'object' } }, async execute() { return ''; } },
    { schema: { name: 'write_file', description: 'Write a file', inputSchema: { type: 'object' } }, destructive: true, async execute() { return ''; } },
  ];

  const results = await orchestrate([
    { skill: 'reader', prompt: 'read before edit', label: 'reader' },
    { skill: 'writer', prompt: 'edit files', label: 'writer' },
    { skill: 'reader', prompt: 'review after edit', label: 'reviewer' },
  ], { registry, provider, toolPool, concurrency: 3 });

  assert.equal(peakActive, 1);
  assert.deepEqual(results.map((result) => result.task.label), ['reader', 'writer', 'reviewer']);
  assert.ok(results.every((result) => result.ok));
});

test('write-capable team runs concurrently in separate real worktrees and preserves changes for review', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'cybercoder-team-worktrees-'));
  const repo = join(temp, 'repo');
  mkdirSync(repo, { recursive: true });
  const git = (args: string[]) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', windowsHide: true }).trim();
  git(['init', '--quiet']);
  git(['checkout', '-b', 'main']);
  git(['config', 'user.email', 'self-check@example.invalid']);
  git(['config', 'user.name', 'CyberCoder self-check']);
  writeFileSync(join(repo, 'README.md'), 'base\n', 'utf8');
  git(['add', 'README.md']);
  git(['commit', '--quiet', '-m', 'initial commit']);

  let active = 0;
  let peakActive = 0;
  const callsByPrompt = new Map<string, number>();
  const provider: LLMProvider = {
    info: providerInfo,
    async listModels() { return ['test']; },
    async *chat(request) {
      const prompt = String(request.messages[0]?.content ?? '');
      const callNumber = (callsByPrompt.get(prompt) ?? 0) + 1;
      callsByPrompt.set(prompt, callNumber);
      if (callNumber === 1) {
        if (prompt.includes('no-op')) {
          yield { type: 'text', text: 'Nothing to change.' };
          yield { type: 'done', reason: 'end_turn' };
          return;
        }
        active += 1;
        peakActive = Math.max(peakActive, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, 25));
          const file = prompt.includes('alpha') ? 'alpha.txt' : 'beta.txt';
          yield { type: 'tool_call', toolCall: { id: `write-${file}`, name: 'write_file', input: { path: file, content: `${file} change\n` } } };
          yield { type: 'done', reason: 'tool_use' };
        } finally {
          active -= 1;
        }
        return;
      }
      yield { type: 'text', text: `Prepared ${prompt}.` };
      yield { type: 'done', reason: 'end_turn' };
    },
  };
  const writer = makeSkill('writer', ['write_file']);
  const registry = {
    get: (name: string) => name === writer.frontmatter.name ? writer : undefined,
    list: () => [writer],
  } as unknown as SkillRegistry;
  const writeFileTool: AgentTool = {
    schema: { name: 'write_file', description: 'Write one file in the selected workspace', inputSchema: { type: 'object' } },
    destructive: true,
    async execute(input, ctx) {
      if (!ctx.cwd) throw new Error('Test agent did not receive a workspace.');
      writeFileSync(join(ctx.cwd, String(input.path)), String(input.content), 'utf8');
      return `Wrote ${String(input.path)}`;
    },
  };
  const manager = new CollaborationManager({ dataDir: join(temp, 'state') });

  try {
    const results = await orchestrate([
      { skill: 'writer', prompt: 'write the alpha task', label: 'alpha' },
      { skill: 'writer', prompt: 'write the beta task', label: 'beta' },
      { skill: 'writer', prompt: 'no-op task', label: 'noop' },
    ], { registry, provider, toolPool: [writeFileTool], concurrency: 2, cwd: repo, worktreeManager: manager });

    assert.equal(peakActive, 2, 'mutating agents should run at the same time when each has an isolated worktree');
    assert.ok(results.every((result) => result.ok));
    assert.notEqual(results[0]?.worktree?.path, results[1]?.worktree?.path);
    assert.equal(existsSync(join(repo, 'alpha.txt')), false, 'agent writes must not touch the selected workspace before review');
    assert.equal(existsSync(join(repo, 'beta.txt')), false, 'agent writes must not touch the selected workspace before review');
    for (const result of results.slice(0, 2)) {
      assert.ok(result.worktree);
      assert.equal(readFileSync(join(result.worktree.path, result.task.label === 'alpha' ? 'alpha.txt' : 'beta.txt'), 'utf8'), `${result.task.label}.txt change\n`);
      const state = await manager.getWorktreeState(result.worktree.sessionId, result.worktree.agentId, repo);
      assert.match(state.status, new RegExp(`${result.task.label}\\.txt`));
      assert.equal(state.commitsAhead, 0);
      assert.match(result.summary, /Prepared/);
    }
    const sessionId = results[0]!.worktree!.sessionId;
    assert.equal(results.slice(0, 2).every((result) => result.worktree?.sessionId === sessionId), true);
    assert.equal(Object.keys(manager.getSession(sessionId)?.worktrees ?? {}).length, 2, 'both review worktrees remain tracked');
    assert.equal(results[2]?.worktree, undefined, 'an unchanged worktree should be removed and not reported as available');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('task routing prefers a matching specialist and never auto-routes to the disabled recon placeholder', () => {
  const names = [
    'cyber-recon', 'research', 'plan', 'security-audit', 'debugger', 'test-writer',
    'dep-doctor', 'db-architect', 'frontend-design', 'api-designer', 'infra-as-code',
    'git-master', 'migrate', 'doc-writer', 'code-review', 'refactor', 'deploy', 'perf-profiler',
  ];
  const skills = names.map((name) => makeSkill(name));
  const registry = {
    get: (name: string) => skills.find((skill) => skill.frontmatter.name === name),
    has: (name: string) => skills.some((skill) => skill.frontmatter.name === name),
    list: () => skills,
  } as unknown as SkillRegistry;

  assert.equal(routeTaskToSkill('Design a responsive React signup form', registry), 'frontend-design');
  assert.equal(routeTaskToSkill('Review this code for a security vulnerability', registry), 'security-audit');
  assert.equal(routeTaskToSkill('Debug the failing TypeScript test crash', registry), 'debugger');
  assert.equal(routeTaskToSkill('Plan the database schema migration', registry), 'db-architect');

  const restrictedRegistry = {
    get: (name: string) => name === 'cyber-recon' ? skills[0] : undefined,
    has: (name: string) => name === 'cyber-recon',
    list: () => [skills[0]!],
  } as unknown as SkillRegistry;
  assert.equal(routeTaskToSkill('Investigate this authorized recon target', restrictedRegistry), undefined);
});
