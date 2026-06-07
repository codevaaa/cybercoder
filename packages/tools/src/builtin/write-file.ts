import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SecretScanner } from '@cybermind/shared';
import type { AgentTool } from '../types.js';

export const writeFileTool: AgentTool = {
  schema: {
    name: 'write_file',
    description:
      'Create a new file at the given path with the given UTF-8 content. Fails if the file already exists — use edit for modifications. Parent directories are created.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path.' },
        content: { type: 'string', description: 'Full UTF-8 file content.' },
      },
      required: ['path', 'content'],
    },
  },
  destructive: true,
  async execute(input, ctx) {
    const path = String(input.path ?? '');
    const content = String(input.content ?? '');
    if (!path) throw new Error('write_file requires a path');
    const abs = resolve(ctx.cwd, path);
    if (existsSync(abs)) {
      throw new Error(`Refusing to overwrite existing file ${abs}. Use the edit tool instead.`);
    }

    // 🛡️ 100% Secure Coding: Scan content for secrets before writing
    const secrets = SecretScanner.scan(content);
    if (secrets.length > 0) {
      throw new Error(`[SECURITY ALERT] Refusing to write file ${path}. Detected secrets: ${secrets.join(', ')}`);
    }
    const dir = dirname(abs);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(abs, content, 'utf8');
    return `Wrote ${Buffer.byteLength(content, 'utf8')} bytes to ${abs}.`;
  },
  // Self-correction: confirm the file now exists with the expected size.
  async verify(input, _output, ctx) {
    try {
      const abs = resolve(ctx.cwd, String(input.path ?? ''));
      const content = String(input.content ?? '');
      if (!existsSync(abs)) return 'write_file verification failed: file does not exist after writing.';
      const written = readFileSync(abs, 'utf8');
      if (written.length !== content.length) {
        return `write_file verification warning: written size (${written.length}) differs from intended (${content.length}).`;
      }
      return null;
    } catch (err) {
      return `write_file verification error: ${err instanceof Error ? err.message : String(err)}`;
    }
  },
};
