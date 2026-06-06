import type { Skill } from '@cybermind/skills';
import type { CommandContext, SlashCommandHandler } from './index.js';
import { getSkillRegistry } from '../runtime/chat.js';

/**
 * `/skills` — list installed skills grouped by source.
 *
 * Replaces the M1 stub. Install/publish flows land alongside the marketplace
 * client in M13; for now /skills is read-only.
 */
export function buildSkillsCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'skills',
    description: 'List installed skills, or "/skills reload" to rescan after adding one.',
    category: 'skills',
    usage: '/skills [list|reload]',
    run: (args: string) => {
      const registry = getSkillRegistry();
      const sub = args.trim().toLowerCase();
      if (sub === 'reload') {
        registry.reload();
        ctx.appendMessage({
          id: `skills-${Date.now()}`,
          role: 'system',
          content: `Reloaded skills. ${registry.list().length} installed.`,
          createdAt: Date.now(),
        });
        return;
      }
      const grouped = registry.bySource();
      const lines: string[] = ['Installed skills:'];
      for (const source of ['bundled', 'user', 'project', 'marketplace'] as const) {
        const items = grouped[source];
        if (items.length === 0) continue;
        lines.push('');
        lines.push(`  [${source}]`);
        for (const s of items.sort((a: Skill, b: Skill) => a.frontmatter.name.localeCompare(b.frontmatter.name))) {
          lines.push(`    ${s.frontmatter.name.padEnd(20)} — ${s.frontmatter.description}`);
        }
      }
      const total = registry.list().length;
      if (total === 0) {
        lines.push('  (none found — add SKILL.md files under .codeva/skills/)');
      } else {
        lines.push('');
        lines.push(`  Total: ${total} skill(s). Shortcuts: /research /plan /code-review /debug /security /commit /web`);
      }
      ctx.appendMessage({
        id: `skills-${Date.now()}`,
        role: 'system',
        content: lines.join('\n'),
        createdAt: Date.now(),
      });
    },
  };
}

/**
 * Slash-command shortcut to spawn one of the canonical sub-agents directly,
 * e.g. `/research where is auth handled`. The user prompt is forwarded as the
 * sub-agent's task; we tell the main agent to invoke spawn_subagent on the
 * next chat turn.
 *
 * Implementation strategy: rather than running the sub-agent synchronously
 * (which would block the UI), we inject a synthesized user message that
 * instructs the main agent to call spawn_subagent for us. This keeps the
 * tool-call event stream consistent with normal agent runs.
 */
function buildSkillShortcut(
  ctx: CommandContext,
  name: string,
  skill: string,
  description: string,
): SlashCommandHandler {
  return {
    name,
    description,
    category: 'agent',
    usage: `/${name} <task description>`,
    run: (args: string) => {
      const task = args.trim();
      if (!task) {
        ctx.appendMessage({
          id: `${name}-${Date.now()}`,
          role: 'system',
          content: `/${name} needs a task description. Try: /${name} where is authentication handled?`,
          createdAt: Date.now(),
        });
        return;
      }
      const registry = getSkillRegistry();
      if (!registry.has(skill)) {
        ctx.appendMessage({
          id: `${name}-${Date.now()}`,
          role: 'system',
          content: `Skill "${skill}" is not installed. Add it under .codeva/skills/<name>/SKILL.md (project) or ~/.codeva/skills/ (global), then run /skills reload.`,
          createdAt: Date.now(),
        });
        return;
      }
      // Surface a friendly system note then submit the synthesized prompt as
      // if the user typed it. The main agent will see the request and invoke
      // spawn_subagent itself.
      ctx.appendMessage({
        id: `${name}-${Date.now()}`,
        role: 'system',
        content: `Delegating to /${skill} sub-agent…`,
        createdAt: Date.now(),
      });
      ctx.submitUserPrompt?.(`Use spawn_subagent to run the "${skill}" skill on this task: ${task}`);
    },
  };
}

export function buildResearchCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(
    ctx,
    'research',
    'research',
    'Spawn the read-only codebase exploration sub-agent.',
  );
}

export function buildPlanCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(
    ctx,
    'plan',
    'plan',
    'Spawn the planning sub-agent to break down a task.',
  );
}

export function buildCodeReviewCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(
    ctx,
    'code-review',
    'code-review',
    'Spawn the code-review sub-agent on a diff, file, or commit.',
  );
}

export function buildDebugCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(ctx, 'debug', 'debugger', 'Spawn the systematic root-cause debugging sub-agent.');
}

export function buildSecurityCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(ctx, 'security', 'security-audit', 'Spawn the read-only security audit sub-agent.');
}

export function buildCommitCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(ctx, 'commit', 'commit', 'Stage and write Conventional Commits from the working tree.');
}

export function buildWebCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(ctx, 'web', 'web-research', 'Spawn the live web-research sub-agent (search + fetch + cite).');
}

export function buildFixCommand(ctx: CommandContext): SlashCommandHandler {
  return buildSkillShortcut(ctx, 'fix', 'test-fixer', 'Run tests and self-heal the code until green (bounded).');
}

/**
 * `/goal` — registry entry for discovery in /help. The actual goal loop is
 * intercepted in app.tsx (it needs the goal-mode driver), so this handler only
 * runs if invoked outside that path; it explains usage.
 */
export function buildGoalCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'goal',
    description: 'Work autonomously toward an objective until it is done (multi-round).',
    category: 'agent',
    usage: '/goal <objective>',
    run: (args: string) => {
      ctx.submitUserPrompt?.(args.trim()
        ? `Work toward this goal until complete: ${args.trim()}`
        : 'Usage: /goal <objective>');
    },
  };
}
