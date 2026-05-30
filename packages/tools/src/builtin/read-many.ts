import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentTool } from '../types.js';

const MAX_BYTES_PER_FILE = 200_000;
const MAX_FILES = 20;

/**
 * `read_many` — read several files in ONE tool call. Cuts agent-loop round
 * trips (and tokens) dramatically when the model needs to understand a feature
 * spread across many files. Read-only, so it runs in parallel with other reads.
 */
export const readManyTool: AgentTool = {
  schema: {
    name: 'read_many',
    description:
      'Read multiple files at once and return their numbered contents, separated by headers. Use this instead of many read_file calls when you need several files to understand a feature. Max 20 files.',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Absolute or relative file paths to read.',
        },
      },
      required: ['paths'],
    },
  },
  destructive: false,
  async execute(input, ctx) {
    const paths = Array.isArray(input.paths) ? input.paths.map(String) : [];
    if (paths.length === 0) throw new Error('read_many requires a non-empty "paths" array');
    const limited = paths.slice(0, MAX_FILES);

    const blocks = limited.map((p) => {
      const abs = resolve(ctx.cwd, p);
      try {
        const st = statSync(abs);
        if (!st.isFile()) return `### ${p}\n[not a file]`;
        const raw = readFileSync(abs);
        const text =
          raw.byteLength > MAX_BYTES_PER_FILE
            ? raw.subarray(0, MAX_BYTES_PER_FILE).toString('utf8') + '\n[truncated]'
            : raw.toString('utf8');
        return `### ${p}\n${numberLines(text)}`;
      } catch (err) {
        return `### ${p}\n[error: ${err instanceof Error ? err.message : String(err)}]`;
      }
    });

    const extra = paths.length > MAX_FILES ? `\n\n[${paths.length - MAX_FILES} more files omitted; request them separately]` : '';
    return blocks.join('\n\n') + extra;
  },
};

function numberLines(text: string): string {
  const lines = text.split('\n');
  const width = String(lines.length).length;
  return lines.map((l, i) => `${String(i + 1).padStart(width, ' ')}\t${l}`).join('\n');
}
