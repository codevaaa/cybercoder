import { createLogger, getDataDir } from './logger.js';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const log = createLogger('collaboration');
const execFileAsync = promisify(execFile);

async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, windowsHide: true, encoding: 'utf8' });
  return stdout.trim();
}

function safeComponent(value: string, label: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value) || value === '.' || value === '..') {
    throw new Error(`${label} must contain only letters, digits, dots, underscores, or hyphens.`);
  }
  return value;
}

function safeBaseRef(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(value) || value.includes('..') || value.includes('//') || value.endsWith('/')) {
    throw new Error('Base ref must be a branch or commit reference without shell options or path traversal.');
  }
  return value;
}

function samePath(left: string, right: string): boolean {
  const a = resolve(left);
  const b = resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function isManagedWorktree(root: string, candidate: string): boolean {
  if (!isInside(root, candidate) || !existsSync(root) || !existsSync(candidate)) return false;
  try {
    return isInside(realpathSync(root), realpathSync(candidate));
  } catch {
    return false;
  }
}

export interface CollaborationSession {
  id: string;
  name: string;
  createdAt: number;
  /** List of participant agent IDs */
  participants: string[];
  /** Current worktree paths for each participant */
  worktrees: Record<string, string>;
  /** Shared context/state */
  sharedContext: Record<string, any>;
  /** Session status */
  status: 'active' | 'paused' | 'completed';
}

export interface WorktreeConfig {
  sessionId: string;
  agentId: string;
  path: string;
  branch: string;
  baseBranch: string;
}

const CollaborationSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  participants: z.array(z.string()),
  worktrees: z.record(z.string(), z.string()),
  sharedContext: z.record(z.unknown()),
  status: z.enum(['active', 'paused', 'completed']),
});

/**
 * Manages parallel agent collaboration sessions using git worktrees
 * and shared context synchronization.
 */
export class CollaborationManager {
  private readonly sessionsDir: string;
  private readonly worktreesDir: string;

  constructor(options: { dataDir?: string } = {}) {
    const dataDir = options.dataDir ?? getDataDir();
    this.sessionsDir = join(dataDir, 'collaboration', 'sessions');
    this.worktreesDir = join(dataDir, 'collaboration', 'worktrees');
    
    if (!existsSync(this.sessionsDir)) mkdirSync(this.sessionsDir, { recursive: true });
    if (!existsSync(this.worktreesDir)) mkdirSync(this.worktreesDir, { recursive: true });
  }

  /** Create a new collaboration session */
  createSession(name: string, initialAgentId: string): CollaborationSession {
    const session: CollaborationSession = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      participants: [initialAgentId],
      worktrees: {},
      sharedContext: {},
      status: 'active',
    };

    this.saveSession(session);
    log.info('Created collaboration session', { sessionId: session.id, name });
    return session;
  }

  /** Get a session by ID */
  getSession(sessionId: string): CollaborationSession | null {
    try { safeComponent(sessionId, 'Session ID'); } catch { return null; }
    const path = join(this.sessionsDir, `${sessionId}.json`);
    if (!existsSync(path)) return null;

    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      return CollaborationSessionSchema.parse(parsed);
    } catch (err) {
      log.warn('Failed to load session', { sessionId, error: String(err) });
      return null;
    }
  }

  /** List all sessions */
  listSessions(): CollaborationSession[] {
    if (!existsSync(this.sessionsDir)) return [];
    
    const sessions: CollaborationSession[] = [];
    const files = readdirSync(this.sessionsDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      
      const sessionId = file.name.slice(0, -5);
      const session = this.getSession(sessionId);
      if (session) sessions.push(session);
    }
    
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Add an agent to a session */
  addParticipant(sessionId: string, agentId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session || session.participants.includes(agentId)) {
      return false;
    }

    session.participants.push(agentId);
    this.saveSession(session);
    log.info('Added participant to session', { sessionId, agentId });
    return true;
  }

  /** Create a real isolated Git worktree from a clean selected repository. */
  async createWorktree(
    sessionId: string,
    agentId: string,
    baseRef = 'HEAD',
    repoCwd = process.cwd(),
  ): Promise<string | null> {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const safeSession = safeComponent(sessionId, 'Session ID');
    const safeAgent = safeComponent(agentId, 'Agent ID');
    const safeBase = safeBaseRef(baseRef);
    const repoRoot = await git(['rev-parse', '--show-toplevel'], repoCwd);
    const status = await git(['status', '--porcelain'], repoRoot);
    if (status) {
      throw new Error('Cannot create an isolated worktree while the selected repository has uncommitted or untracked changes. Commit or move those changes first.');
    }
    await git(['rev-parse', '--verify', `${safeBase}^{commit}`], repoRoot);

    const worktreeName = `${safeSession}-${safeAgent}`;
    const worktreePath = join(this.worktreesDir, worktreeName);
    if (existsSync(worktreePath)) throw new Error(`Worktree path already exists: ${worktreePath}`);
    const branch = `codic/${safeSession}/${safeAgent}-${Date.now().toString(36)}`;

    try {
      await git(['worktree', 'add', '-b', branch, worktreePath, safeBase], repoRoot);
      if (!isManagedWorktree(this.worktreesDir, worktreePath)) {
        throw new Error('Git created a worktree outside CyberCoder managed storage.');
      }
      session.worktrees[agentId] = worktreePath;
      this.saveSession(session);
    } catch (error) {
      try { await git(['worktree', 'remove', '--force', worktreePath], repoRoot); } catch { /* worktree may not have been created */ }
      throw error;
    }

    log.info('Created Git worktree for agent', { sessionId, agentId, worktreePath, branch });
    return worktreePath;
  }

  /** Return the actual branch checked out in a recorded worktree. */
  async getWorktreeBranch(sessionId: string, agentId: string): Promise<string | null> {
    const path = this.getSession(sessionId)?.worktrees[agentId];
    if (!path || !isManagedWorktree(this.worktreesDir, path)) return null;
    return git(['branch', '--show-current'], path);
  }

  /** Describe pending files and local commits for a managed worktree. */
  async getWorktreeState(
    sessionId: string,
    agentId: string,
    repoCwd = process.cwd(),
  ): Promise<{ path: string; branch: string; status: string; commitsAhead: number }> {
    const path = this.getSession(sessionId)?.worktrees[agentId];
    if (!path) throw new Error(`No existing worktree for agent '${agentId}' in session '${sessionId}'.`);
    if (!isManagedWorktree(this.worktreesDir, path)) throw new Error('The recorded worktree path is outside CyberCoder managed storage.');

    const repoRoot = await git(['rev-parse', '--show-toplevel'], repoCwd);
    const sourceCommon = resolve(path, await git(['rev-parse', '--git-common-dir'], path));
    const targetCommon = resolve(repoRoot, await git(['rev-parse', '--git-common-dir'], repoRoot));
    if (!samePath(sourceCommon, targetCommon)) throw new Error('The worktree belongs to a different Git repository.');

    const branch = await git(['branch', '--show-current'], path);
    if (!branch) throw new Error('The worktree has no branch checked out.');
    const base = await git(['rev-parse', 'HEAD'], repoRoot);
    const [status, ahead] = await Promise.all([
      git(['status', '--porcelain'], path),
      git(['rev-list', '--count', `${base}..HEAD`], path),
    ]);
    return { path, branch, status, commitsAhead: Number(ahead) || 0 };
  }

  /** Merge a worktree branch into the currently selected project, without pushing. */
  async mergeWorktree(sessionId: string, agentId: string, repoCwd = process.cwd()): Promise<string> {
    const path = this.getSession(sessionId)?.worktrees[agentId];
    if (!path) throw new Error(`No existing worktree for agent '${agentId}' in session '${sessionId}'.`);
    if (!isManagedWorktree(this.worktreesDir, path)) throw new Error('The recorded worktree path is outside CyberCoder managed storage.');

    const repoRoot = await git(['rev-parse', '--show-toplevel'], repoCwd);
    const sourceCommon = resolve(path, await git(['rev-parse', '--git-common-dir'], path));
    const targetCommon = resolve(repoRoot, await git(['rev-parse', '--git-common-dir'], repoRoot));
    if (!samePath(sourceCommon, targetCommon)) throw new Error('The worktree belongs to a different Git repository.');

    const status = await git(['status', '--porcelain'], repoRoot);
    if (status) throw new Error('Cannot merge into a repository with uncommitted or untracked changes.');
    const branch = await git(['branch', '--show-current'], path);
    if (!branch) throw new Error('The worktree has no branch checked out.');
    await git(['merge', '--no-ff', '--no-edit', branch], repoRoot);
    return branch;
  }

  /** Remove a clean worktree; Git refuses to discard uncommitted work. */
  async removeWorktree(sessionId: string, agentId: string, repoCwd = process.cwd()): Promise<boolean> {
    const session = this.getSession(sessionId);
    const path = session?.worktrees[agentId];
    if (!session || !path) return false;
    if (!isManagedWorktree(this.worktreesDir, path)) throw new Error('The recorded worktree path is outside CyberCoder managed storage.');
    const repoRoot = await git(['rev-parse', '--show-toplevel'], repoCwd);
    const sourceCommon = resolve(path, await git(['rev-parse', '--git-common-dir'], path));
    const targetCommon = resolve(repoRoot, await git(['rev-parse', '--git-common-dir'], repoRoot));
    if (!samePath(sourceCommon, targetCommon)) throw new Error('The worktree belongs to a different Git repository.');
    await git(['worktree', 'remove', path], repoRoot);
    delete session.worktrees[agentId];
    this.saveSession(session);
    return true;
  }

  /** Update shared context for a session */
  updateSharedContext(sessionId: string, updates: Record<string, any>): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.sharedContext = { ...session.sharedContext, ...updates };
    this.saveSession(session);
    return true;
  }

  /** Get shared context for a session */
  getSharedContext(sessionId: string): Record<string, any> {
    const session = this.getSession(sessionId);
    return session?.sharedContext || {};
  }

  /** Update session status */
  updateSessionStatus(sessionId: string, status: CollaborationSession['status']): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.status = status;
    this.saveSession(session);
    log.info('Updated session status', { sessionId, status });
    return true;
  }

  /** Delete an empty session record; worktrees must be removed first. */
  deleteSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    if (Object.keys(session.worktrees).length > 0) return false;

    // Remove session file
    const sessionPath = join(this.sessionsDir, `${sessionId}.json`);
    try {
      rmSync(sessionPath, { force: true });
    } catch (err) {
      log.warn('Failed to delete session file', { sessionId, error: String(err) });
    }

    log.info('Deleted collaboration session', { sessionId });
    return true;
  }

  private saveSession(session: CollaborationSession): void {
    try { safeComponent(session.id, 'Session ID'); } catch { return; }
    const path = join(this.sessionsDir, `${session.id}.json`);
    try {
      writeFileSync(path, JSON.stringify(session, null, 2), 'utf8');
    } catch (err) {
      log.error('Failed to save session', { sessionId: session.id, error: String(err) });
    }
  }
}

// Re-export for convenience
export type { SessionMessage } from './types.js';
export type { Message } from './types.js';
