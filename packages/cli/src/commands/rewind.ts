import type { CommandContext, SlashCommandHandler } from './index.js';
import { getCheckpoints } from '../runtime/chat.js';

/**
 * `/rewind` — real filesystem time-travel. Every destructive edit snapshots the
 * affected file first, so this restores your working tree to an earlier state.
 *
 *   /rewind                — list checkpoints (newest first)
 *   /rewind <n>            — restore the workspace to checkpoint #n (undoes all
 *                           edits made after it)
 *   /rewind last          — undo the most recent edit
 */
export function buildRewindCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'rewind',
    description: 'Filesystem time-travel: undo agent file edits to an earlier checkpoint.',
    category: 'safety',
    usage: '/rewind [n|last]',
    run: (args: string) => {
      const trimmed = args.trim();
      const reply = (content: string) =>
        ctx.appendMessage({ id: `rewind-${Date.now()}`, role: 'system', content, createdAt: Date.now() });

      const cp = getCheckpoints();
      const list = cp.list();

      if (!trimmed) {
        if (list.length === 0) {
          reply('No file checkpoints yet. They are created automatically before each edit.');
          return;
        }
        const lines = ['File checkpoints (newest first):'];
        for (const e of list) {
          const when = new Date(e.createdAt).toLocaleTimeString();
          const files = e.files.map((f) => cp.rel(f.path)).join(', ');
          lines.push(`  #${e.seq}  ${when}  ${e.label}  [${files}]`);
        }
        lines.push('');
        lines.push('Restore with: /rewind <n>  ·  undo last edit: /rewind last');
        reply(lines.join('\n'));
        return;
      }

      let seq: number;
      if (trimmed === 'last') {
        if (list.length === 0) {
          reply('Nothing to undo.');
          return;
        }
        seq = list[0]!.seq;
      } else {
        seq = parseInt(trimmed, 10);
        if (Number.isNaN(seq)) {
          reply(`Invalid checkpoint '${trimmed}'. Use /rewind to list, then /rewind <n>.`);
          return;
        }
      }

      const result = cp.restore(seq);
      reply(`Rewound to checkpoint #${seq}. Restored ${result.restored} file(s), removed ${result.deleted} newly-created file(s).`);
    },
  };
}
