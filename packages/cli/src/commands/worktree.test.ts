import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CollaborationManager } from '@cybermind/shared';
import { buildWorktreeCommand } from './collaboration.js';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }).trim();
}

function readNormalized(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

test('worktree lifecycle creates isolation, merges locally, and refuses dirty workspace setup', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'cybercoder-worktree-'));
  const repo = join(temp, 'repo');
  const appHome = join(temp, 'app-home');
  const priorHome = process.env.CYBERMIND_HOME;
  const priorCwd = process.cwd();
  mkdirSync(repo, { recursive: true });
  process.env.CYBERMIND_HOME = appHome;
  const manager = new CollaborationManager();
  let sessionId = '';
  let worktreePath = '';

  try {
    git(['init', '--quiet'], repo);
    git(['checkout', '-b', 'main'], repo);
    git(['config', 'user.email', 'self-check@example.invalid'], repo);
    git(['config', 'user.name', 'CyberCoder self-check'], repo);
    writeFileSync(join(repo, 'README.md'), 'base\n', 'utf8');
    git(['add', 'README.md'], repo);
    git(['commit', '--quiet', '-m', 'initial commit'], repo);

    const session = manager.createSession('worktree integration test', 'parent');
    sessionId = session.id;
    const replies: string[] = [];
    const command = buildWorktreeCommand({
      clear: () => undefined,
      exit: () => undefined,
      appendMessage: (message) => replies.push(message.content),
    });
    process.chdir(repo);
    await command.run(`create ${session.id} main`);
    worktreePath = manager.getSession(session.id)?.worktrees['current-agent'] ?? '';
    assert.ok(worktreePath);
    assert.match(replies.at(-1) ?? '', /Created isolated Git worktree/);
    assert.equal(readNormalized(join(worktreePath, 'README.md')), 'base\n');
    const branch = await manager.getWorktreeBranch(session.id, 'current-agent');
    assert.equal(branch?.startsWith(`codic/${session.id}/current-agent-`), true);

    const sessionFile = join(appHome, 'collaboration', 'sessions', `${session.id}.json`);
    const savedSession = readFileSync(sessionFile, 'utf8');
    const tamperedSession = JSON.parse(savedSession) as { worktrees: Record<string, string> };
    tamperedSession.worktrees['current-agent'] = join(temp, 'outside-managed-worktrees');
    writeFileSync(sessionFile, JSON.stringify(tamperedSession), 'utf8');
    await assert.rejects(manager.mergeWorktree(session.id, 'current-agent', repo), /outside CyberCoder managed storage/i);
    await assert.rejects(manager.removeWorktree(session.id, 'current-agent', repo), /outside CyberCoder managed storage/i);
    writeFileSync(sessionFile, savedSession, 'utf8');
    assert.equal(manager.deleteSession(session.id), false, 'a session with a worktree must remain tracked until it is removed');

    writeFileSync(join(worktreePath, 'agent-output.txt'), 'isolated change\n', 'utf8');
    assert.equal(existsSync(join(repo, 'agent-output.txt')), false, 'the main workspace must stay unchanged before merge');
    git(['add', 'agent-output.txt'], worktreePath);
    git(['commit', '--quiet', '-m', 'agent output'], worktreePath);

    await command.run(`sync ${session.id}`);
    assert.equal(await git(['branch', '--show-current'], repo), 'main');
    assert.match(replies.at(-1) ?? '', /Merged local worktree branch/);
    assert.equal(readNormalized(join(repo, 'agent-output.txt')), 'isolated change\n');

    writeFileSync(join(repo, 'uncommitted.txt'), 'keep me\n', 'utf8');
    await assert.rejects(manager.createWorktree(session.id, 'agent-2', 'main', repo), /uncommitted or untracked changes/i);

    await command.run(`close ${session.id}`);
    assert.match(replies.at(-1) ?? '', /Removed the clean worktree/);
    assert.equal(existsSync(worktreePath), false);
    assert.equal(manager.getSession(session.id)?.worktrees['current-agent'], undefined);
  } finally {
    process.chdir(priorCwd);
    if (sessionId && manager.getSession(sessionId)?.worktrees['current-agent']) {
      try { await manager.removeWorktree(sessionId, 'current-agent', repo); } catch { /* temp cleanup below */ }
    }
    rmSync(temp, { recursive: true, force: true });
    if (priorHome === undefined) delete process.env.CYBERMIND_HOME;
    else process.env.CYBERMIND_HOME = priorHome;
  }
});
