import { homedir } from 'node:os';
import { join } from 'node:path';
import type { CommandContext, SlashCommandHandler } from './index.js';
import { loadHooks, reloadHooks } from '../runtime/hooks.js';

/**
 * `/hooks` — view configured automation hooks, or reload after editing the
 * config. Hooks live in .codeva/hooks.json (project) or ~/.codeva/hooks.json.
 */
export function buildHooksCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'hooks',
    description: 'View or reload event automation hooks (postEdit, postTask, preCommand…).',
    category: 'config',
    usage: '/hooks [reload]',
    run: (args: string) => {
      const reply = (content: string) =>
        ctx.appendMessage({ id: `hooks-${Date.now()}`, role: 'system', content, createdAt: Date.now() });

      if (args.trim() === 'reload') {
        reloadHooks();
        reply('Hooks reloaded.');
        return;
      }

      const cfg = loadHooks();
      const events = Object.keys(cfg);
      if (events.length === 0) {
        reply(
          'No hooks configured.\n\n' +
            `Create ${join(process.cwd(), '.codeva', 'hooks.json')} (project) or ` +
            `${join(homedir(), '.codeva', 'hooks.json')} (global). Example:\n\n` +
            '{\n' +
            '  "postEdit":  [{ "match": "\\\\.ts$", "command": "npx prettier --write {file}" }],\n' +
            '  "postCommand": [{ "command": "echo done" }],\n' +
            '  "preCommand": [{ "match": "rm -rf", "command": "echo blocked", "block": true }]\n' +
            '}\n\n' +
            'Events: preEdit, postEdit, postWrite, preCommand, postCommand, postTask, sessionStart.',
        );
        return;
      }

      const lines = ['Configured hooks:'];
      for (const ev of events) {
        const rules = cfg[ev] ?? [];
        lines.push(`  ${ev}:`);
        for (const r of rules) {
          lines.push(`    - ${r.block ? '[BLOCK] ' : ''}${r.match ? `(${r.match}) ` : ''}${r.command}`);
        }
      }
      reply(lines.join('\n'));
    },
  };
}
