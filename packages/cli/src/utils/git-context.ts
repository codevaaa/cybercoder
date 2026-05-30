import { execSync } from 'node:child_process';

/**
 * Lightweight, synchronous git awareness. Gathers the repo state once so the
 * agent's system prompt can include where it is (branch, dirty files, recent
 * commits) — the way Claude Code knows your repo without you telling it.
 *
 * All calls are wrapped: outside a repo or without git installed, every field
 * degrades to a safe default and `isRepo` is false.
 */
export interface GitContext {
  isRepo: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  staged: number;
  unstaged: number;
  untracked: number;
  lastCommits: string[];
  remoteUrl?: string;
}

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
    timeout: 4000,
  }).trim();
}

export function getGitContext(cwd: string = process.cwd()): GitContext {
  const empty: GitContext = {
    isRepo: false,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    lastCommits: [],
  };

  try {
    const inside = git('rev-parse --is-inside-work-tree', cwd);
    if (inside !== 'true') return empty;
  } catch {
    return empty;
  }

  const ctx: GitContext = { ...empty, isRepo: true };

  try {
    ctx.branch = git('rev-parse --abbrev-ref HEAD', cwd);
  } catch {
    /* detached / fresh repo */
  }

  try {
    const status = git('status --porcelain', cwd);
    if (status) {
      for (const line of status.split('\n')) {
        const x = line[0];
        const y = line[1];
        if (x === '?' && y === '?') ctx.untracked++;
        else {
          if (x && x !== ' ') ctx.staged++;
          if (y && y !== ' ') ctx.unstaged++;
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const counts = git('rev-list --left-right --count @{upstream}...HEAD', cwd);
    const [behind, ahead] = counts.split(/\s+/).map((n) => Number(n) || 0);
    ctx.behind = behind;
    ctx.ahead = ahead;
  } catch {
    /* no upstream */
  }

  try {
    const log = git('log --oneline -5', cwd);
    ctx.lastCommits = log ? log.split('\n') : [];
  } catch {
    /* no commits yet */
  }

  try {
    ctx.remoteUrl = git('remote get-url origin', cwd) || undefined;
  } catch {
    /* no remote */
  }

  return ctx;
}

/** Render the git context as a compact block for the agent's system prompt. */
export function gitContextPrompt(ctx: GitContext): string {
  if (!ctx.isRepo) return '';
  const parts: string[] = ['[Git context]'];
  parts.push(`branch: ${ctx.branch ?? '(detached)'}`);
  const dirty: string[] = [];
  if (ctx.staged) dirty.push(`${ctx.staged} staged`);
  if (ctx.unstaged) dirty.push(`${ctx.unstaged} modified`);
  if (ctx.untracked) dirty.push(`${ctx.untracked} untracked`);
  parts.push(`working tree: ${dirty.length ? dirty.join(', ') : 'clean'}`);
  if (ctx.ahead || ctx.behind) parts.push(`vs upstream: ${ctx.ahead ?? 0} ahead, ${ctx.behind ?? 0} behind`);
  if (ctx.lastCommits.length) parts.push(`recent: ${ctx.lastCommits.slice(0, 3).join(' / ')}`);
  return parts.join('\n');
}
