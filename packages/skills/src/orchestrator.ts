import type { AgentTool } from '@cybermind/core';
import type { LLMProvider } from '@cybermind/providers';
import { createLogger } from '@cybermind/shared';
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
  signal?: AbortSignal;
  /** Per-task progress callback. */
  onTaskStart?: (task: OrchestratedTask, index: number) => void;
  onTaskDone?: (task: OrchestratedTask, index: number, result: TaskResult) => void;
}

export interface TaskResult {
  task: OrchestratedTask;
  summary: string;
  ok: boolean;
  error?: string;
  toolCalls: number;
  durationMs: number;
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
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const results: TaskResult[] = new Array(tasks.length);
  let cursor = 0;

  log.debug('orchestrating tasks', { count: tasks.length, concurrency });

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
        };
        opts.onTaskDone?.(task, index, results[index]!);
        continue;
      }

      let sub: SubagentResult;
      try {
        sub = await spawnSubagent({
          skill,
          prompt: task.prompt,
          provider: opts.provider,
          toolPool: opts.toolPool,
          model: opts.model,
          signal: opts.signal,
        });
      } catch (err) {
        results[index] = {
          task,
          summary: '',
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          toolCalls: 0,
          durationMs: Date.now() - start,
        };
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
      };
      opts.onTaskDone?.(task, index, results[index]!);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
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

  const rules: Array<[RegExp, string]> = [
    [/\b(research|investigate|find out|explore|look up|gather)\b/, 'research'],
    [/\b(plan|design|architect|break down|roadmap)\b/, 'plan'],
    [/\b(review|audit|critique|check).{0,20}(code|pr|diff|change)/, 'code-review'],
    [/\b(refactor|clean up|restructure|rename)\b/, 'refactor'],
    [/\b(test|spec|coverage|unit test|jest|vitest)\b/, 'test-writer'],
    [/\b(deploy|ship|release|ci\/cd|pipeline)\b/, 'deploy'],
    [/\b(security|vulnerab|exploit|recon|pentest)\b/, 'cyber-recon'],
    [/\b(database|schema|migration|sql|index)\b/, 'db-architect'],
    [/\b(document|docs|readme|comment|explain)\b/, 'doc-writer'],
    [/\b(performance|optimi[sz]e|profile|slow|latency)\b/, 'perf-profiler'],
    [/\b(dependency|deps|package|upgrade|npm|version)\b/, 'dep-doctor'],
    [/\b(frontend|ui|css|component|design)\b/, 'frontend-design'],
    [/\b(api|endpoint|rest|graphql|openapi)\b/, 'api-designer'],
    [/\b(infra|terraform|kubernetes|docker|cloud)\b/, 'infra-as-code'],
    [/\b(git|commit|branch|merge|rebase)\b/, 'git-master'],
    [/\b(migrate|migration|port|convert)\b/, 'migrate'],
  ];

  for (const [re, skill] of rules) {
    if (re.test(t) && has(skill)) return skill;
  }
  // Fallbacks in priority order.
  for (const fallback of ['research', 'plan']) {
    if (has(fallback)) return fallback;
  }
  return registry.list()[0]?.frontmatter.name;
}
