import type { AgentEvent, AgentTool } from '@cybermind/core';
import type { LLMProvider } from '@cybermind/providers';
import { CollaborationManager, createLogger } from '@cybermind/shared';
import type { SkillRegistry } from './registry.js';
import { spawnSubagent, type SubagentResult } from './runner.js';

const log = createLogger('skills:orchestrator');

export interface OrchestratedTask {
  /** Skill to run for this task. */
  skill: string;
  /** Prompt for the sub-agent. */
  prompt: string;
  /** Optional label for UI/logs. */
  label?: string;
}

export interface OrchestratorOptions {
  registry: SkillRegistry;
  provider: LLMProvider;
  toolPool: AgentTool[];
  /** Max sub-agents running at once. Default 3 (safe for free-tier rate limits). */
  concurrency?: number;
  model?: string;
  /** Selected project directory shared with every delegated task. */
  cwd?: string;
  /** Creates per-task isolated worktrees for write-capable teams. */
  worktreeManager?: Pick<CollaborationManager,
    'createSession' | 'addParticipant' | 'createWorktree' | 'getWorktreeBranch' | 'getWorktreeState' | 'removeWorktree' | 'deleteSession'>;
  signal?: AbortSignal;
  /** Per-task progress callback. */
  onTaskStart?: (task: OrchestratedTask, index: number) => void;
  onTaskDone?: (task: OrchestratedTask, index: number, result: TaskResult) => void;
  onProgress?: (event: Extract<AgentEvent, { type: 'subagent_progress' }>) => void;
}

export interface TaskResult {
  task: OrchestratedTask;
  summary: string;
  ok: boolean;
  error?: string;
  toolCalls: number;
  durationMs: number;
  worktree?: { sessionId: string; agentId: string; path: string; branch: string };
  executionNote?: string;
}

/**
 * Run several sub-agent tasks with bounded concurrency. This is the real
 * "agent team" primitive: the main agent (or a slash command) hands off a set
 * of independent tasks, they execute in parallel up to `concurrency`, and we
 * return all results in input order for deterministic synthesis.
 */
export async function orchestrate(
  tasks: OrchestratedTask[],
  opts: OrchestratorOptions,
): Promise<TaskResult[]> {
  const requestedConcurrency = Math.max(1, opts.concurrency ?? 3);
  const hasMutationCapableTask = tasks.some((task) => {
    const skill = opts.registry.get(task.skill);
    if (!skill) return false;
    const allowedTools = new Set(skill.frontmatter.requires.tools);
    return opts.toolPool.some((tool) => allowedTools.has(tool.schema.name) && tool.destructive === true);
  });
  let worktreeSessionId: string | undefined;
  const worktrees = new Map<number, { agentId: string; path: string; branch: string }>();
  let executionNote: string | undefined;

  if (hasMutationCapableTask) {
    if (opts.worktreeManager && opts.cwd) {
      const teamAgentIds = tasks.map((_, index) => `team-${Date.now().toString(36)}-${index + 1}`);
      const session = opts.worktreeManager.createSession(`Agent team · ${new Date().toISOString()}`, teamAgentIds[0] ?? 'team-parent');
      worktreeSessionId = session.id;
      const created: string[] = [];
      try {
        for (let index = 0; index < tasks.length; index += 1) {
          const agentId = teamAgentIds[index] ?? `team-${Date.now().toString(36)}-${index + 1}`;
          if (index > 0) opts.worktreeManager.addParticipant(session.id, agentId);
          const path = await opts.worktreeManager.createWorktree(session.id, agentId, 'HEAD', opts.cwd);
          if (!path) throw new Error('The worktree session could not be created.');
          created.push(agentId);
          const branch = await opts.worktreeManager.getWorktreeBranch(session.id, agentId);
          if (!branch) throw new Error(`Could not identify the branch for ${agentId}.`);
          worktrees.set(index, { agentId, path, branch });
        }
      } catch (error) {
        const cleanupErrors: string[] = [];
        for (const agentId of created.reverse()) {
          try { await opts.worktreeManager.removeWorktree(session.id, agentId, opts.cwd); }
          catch (cleanupError) { cleanupErrors.push(cleanupError instanceof Error ? cleanupError.message : String(cleanupError)); }
        }
        if (cleanupErrors.length === 0) opts.worktreeManager.deleteSession(session.id);
        if (cleanupErrors.length > 0) {
          throw new Error(`Could not prepare isolated agent worktrees (${error instanceof Error ? error.message : String(error)}). Cleanup also needs attention: ${cleanupErrors.join('; ')}. No agent tasks were started.`);
        }
        worktreeSessionId = undefined;
        executionNote = `Git worktrees were unavailable (${error instanceof Error ? error.message : String(error)}); this team will run serially in the selected workspace.`;
      }
    } else {
      executionNote = 'No selected Git workspace or worktree manager is available; this team will run serially in the selected workspace.';
    }
  }

  // If isolation could not be prepared, preserve safe serial execution. Once
  // worktrees exist, write-capable tasks can run concurrently without sharing files.
  const concurrency = hasMutationCapableTask && worktrees.size === 0 ? 1 : requestedConcurrency;
  const results: TaskResult[] = new Array(tasks.length);
  let cursor = 0;

  log.debug('orchestrating tasks', {
    count: tasks.length,
    concurrency,
    requestedConcurrency,
    isolatedWorktreeMode: worktrees.size > 0,
    mutationSafeSerialMode: hasMutationCapableTask && worktrees.size === 0,
  });

  async function worker(): Promise<void> {
    while (true) {
      if (opts.signal?.aborted) return;
      const index = cursor++;
      if (index >= tasks.length) return;
      const task = tasks[index]!;
      const skill = opts.registry.get(task.skill);
      const start = Date.now();
      opts.onTaskStart?.(task, index);

      if (!skill) {
        const available = opts.registry.list().map((s) => s.frontmatter.name).join(', ');
        results[index] = {
          task,
          summary: '',
          ok: false,
          error: `skill "${task.skill}" not installed. Available: ${available || '(none)'}`,
          toolCalls: 0,
          durationMs: Date.now() - start,
          executionNote,
        };
        opts.onTaskDone?.(task, index, results[index]!);
        continue;
      }

      let sub: SubagentResult;
      const agentId = worktrees.get(index)?.agentId ?? `team-${Date.now().toString(36)}-${index + 1}`;
      try {
        sub = await spawnSubagent({
          skill,
          prompt: task.prompt,
          provider: opts.provider,
          cwd: worktrees.get(index)?.path ?? opts.cwd,
          toolPool: opts.toolPool,
          model: opts.model,
          signal: opts.signal,
          agentId,
          onEvent: (event) => {
            if (event.type === 'subagent_progress') {
              opts.onProgress?.({
                ...event,
                message: task.label ? `${task.label}: ${event.message ?? event.status}` : event.message,
              });
            }
          },
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results[index] = {
          task,
          summary: '',
          ok: false,
          error,
          toolCalls: 0,
          durationMs: Date.now() - start,
          executionNote,
        };
        opts.onProgress?.({ type: 'subagent_progress', agentId, skill: task.skill, status: 'failed', message: error });
        opts.onTaskDone?.(task, index, results[index]!);
        continue;
      }

      results[index] = {
        task,
        summary: sub.summary,
        ok: sub.reason !== 'error',
        error: sub.error,
        toolCalls: sub.toolCalls,
        durationMs: Date.now() - start,
        ...(worktreeSessionId && worktrees.has(index) ? { worktree: { sessionId: worktreeSessionId, ...worktrees.get(index)! } } : {}),
        executionNote,
      };
      opts.onTaskDone?.(task, index, results[index]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);

  for (let index = 0; index < results.length; index += 1) {
    if (!results[index]) {
      results[index] = {
        task: tasks[index]!,
        summary: '',
        ok: false,
        error: 'The task did not start because the parent run was cancelled.',
        toolCalls: 0,
        durationMs: 0,
        executionNote,
      };
    }
  }

  if (worktreeSessionId && opts.worktreeManager && opts.cwd) {
    for (const [index, worktree] of worktrees) {
      try {
        const state = await opts.worktreeManager.getWorktreeState(worktreeSessionId, worktree.agentId, opts.cwd);
        if (!state.status && state.commitsAhead === 0) {
          await opts.worktreeManager.removeWorktree(worktreeSessionId, worktree.agentId, opts.cwd);
          worktrees.delete(index);
          if (results[index]) delete results[index]!.worktree;
        } else if (results[index]) {
          results[index]!.worktree = { sessionId: worktreeSessionId, ...worktree };
        }
      } catch (error) {
        if (results[index]) {
          results[index]!.worktree = { sessionId: worktreeSessionId, ...worktree };
          results[index]!.executionNote = `Worktree cleanup is pending: ${error instanceof Error ? error.message : String(error)}`;
        }
      }
    }
    if (worktrees.size === 0) opts.worktreeManager.deleteSession(worktreeSessionId);
  }
  return results;
}

/**
 * Heuristic task → skill router. Maps a free-text task description to the most
 * appropriate installed skill, so the model (or a command) can say "do X" and
 * we pick the right specialist. Falls back to `general` / first skill.
 */
export function routeTaskToSkill(task: string, registry: SkillRegistry): string | undefined {
  const t = task.toLowerCase();
  const has = (name: string) => registry.has(name);

  // Keep specific engineering specialties ahead of general planning/research.
  // cyber-recon is intentionally not auto-routed: its bundled entry is a
  // planning-only placeholder and cannot perform scans.
  const rules: Array<[RegExp, string]> = [
    [/\b(security|vulnerab\w*|exploit|pentest)\b/, 'security-audit'],
    [/\b(debug|bug|crash|stack trace|regression)\b/, 'debugger'],
    [/\b(test|spec|coverage|unit test|jest|vitest)\b/, 'test-writer'],
    [/\b(dependency|deps|package|upgrade|npm|version)\b/, 'dep-doctor'],
    [/\b(database|postgres|mysql|schema|sql|index)\b/, 'db-architect'],
    [/\b(frontend|react|ui|css|component|responsive)\b/, 'frontend-design'],
    [/\b(document(?:ation|s)?|docs?|readme|comment)\b/, 'doc-writer'],
    [/\b(api|endpoint|rest|graphql|openapi)\b/, 'api-designer'],
    [/\b(infra|terraform|kubernetes|docker|cloud)\b/, 'infra-as-code'],
    [/\b(git|commit|branch|merge|rebase)\b/, 'git-master'],
    [/\b(migrate|migration|port|convert)\b/, 'migrate'],
    [/\b(review|audit|critique|check).{0,20}(code|pr|diff|change)/, 'code-review'],
    [/\b(refactor|clean up|restructure|rename)\b/, 'refactor'],
    [/\b(deploy|ship|release|ci\/cd|pipeline)\b/, 'deploy'],
    [/\b(performance|optimi[sz]e|profile|slow|latency)\b/, 'perf-profiler'],
    [/\b(plan|roadmap|break down|architecture plan)\b/, 'plan'],
    [/\b(research|investigate|find out|explore|look up|gather)\b/, 'research'],
  ];

  for (const [re, skill] of rules) {
    if (re.test(t) && has(skill)) return skill;
  }
  // Fallbacks in priority order.
  for (const fallback of ['research', 'plan']) {
    if (has(fallback)) return fallback;
  }
  return registry.list().find((skill) => skill.frontmatter.name !== 'cyber-recon')?.frontmatter.name;
}
