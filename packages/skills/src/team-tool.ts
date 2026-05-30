import type { AgentTool, ToolContext } from '@cybermind/core';
import type { LLMProvider } from '@cybermind/providers';
import type { SkillRegistry } from './registry.js';
import { orchestrate, routeTaskToSkill, type OrchestratedTask } from './orchestrator.js';

export interface TeamToolDeps {
  registry: SkillRegistry;
  provider: LLMProvider;
  toolPool: AgentTool[];
  concurrency?: number;
}

/**
 * `spawn_team` — the main agent's parallel multi-agent primitive. Give it a
 * list of independent tasks and it runs them as concurrent sub-agents (bounded
 * by `concurrency`), then returns a synthesised, labelled summary of every
 * result. This is what lets CyberCoder fan out work like Claude Code's agent
 * teams — e.g. "research auth libs" + "review current auth code" + "plan the
 * migration" all at once.
 */
export function buildSpawnTeamTool(deps: TeamToolDeps): AgentTool {
  return {
    schema: {
      name: 'spawn_team',
      description:
        'Run multiple sub-agent tasks IN PARALLEL and get a combined summary. Use when a goal splits into independent pieces (e.g. research + review + plan). Each task names a skill (or omit it to auto-route) and a prompt. Returns every sub-agent\'s result, labelled.',
      inputSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: 'Independent tasks to run concurrently.',
            items: {
              type: 'object',
              properties: {
                skill: { type: 'string', description: 'Skill to run. Omit to auto-route from the prompt.' },
                prompt: { type: 'string', description: 'Task description for the sub-agent.' },
                label: { type: 'string', description: 'Short label for this task.' },
              },
              required: ['prompt'],
            },
          },
        },
        required: ['tasks'],
      },
    },
    async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
      const rawTasks = Array.isArray(input.tasks) ? input.tasks : [];
      if (rawTasks.length === 0) return 'Error: spawn_team requires a non-empty "tasks" array.';

      const tasks: OrchestratedTask[] = [];
      for (const rt of rawTasks) {
        const obj = rt as Record<string, unknown>;
        const prompt = String(obj.prompt ?? '').trim();
        if (!prompt) continue;
        const skill = obj.skill
          ? String(obj.skill).trim()
          : routeTaskToSkill(prompt, deps.registry) ?? '';
        if (!skill) return 'Error: no skills installed to run the team.';
        tasks.push({ skill, prompt, label: obj.label ? String(obj.label) : undefined });
      }
      if (tasks.length === 0) return 'Error: spawn_team received no valid tasks.';

      const results = await orchestrate(tasks, {
        registry: deps.registry,
        provider: deps.provider,
        toolPool: deps.toolPool,
        concurrency: deps.concurrency ?? 3,
      });

      const lines: string[] = [`# Team results (${results.length} agents)`];
      results.forEach((r, i) => {
        const label = r.task.label || r.task.skill;
        lines.push(`\n## ${i + 1}. ${label} (${r.task.skill}) — ${r.ok ? 'ok' : 'failed'} · ${r.durationMs}ms`);
        if (r.ok) lines.push(r.summary || '(no output)');
        else lines.push(`Error: ${r.error ?? 'unknown'}`);
      });
      return lines.join('\n');
    },
  };
}
