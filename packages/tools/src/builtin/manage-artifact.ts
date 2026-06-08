import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentTool } from '../types.js';

const ARTIFACT_DIR = join('.cybercoder', 'artifacts');

function ensureDir(cwd: string) {
  const d = join(cwd, ARTIFACT_DIR);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

export const manageArtifactTool: AgentTool = {
  schema: {
    name: 'manage_artifact',
    description: 'Create, update, or read an artifact (like an implementation_plan.md or task.md) for long-term memory in the current session. Artifacts are saved to .cybercoder/artifacts/. Use this to maintain scratchpads and checklists without polluting context.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['read', 'write'], description: 'read or write' },
        filename: { type: 'string', description: 'Name of the artifact, e.g. "task.md" or "implementation_plan.md"' },
        content: { type: 'string', description: 'Markdown content to write. Required for write action.' }
      },
      required: ['action', 'filename'],
    },
  },
  destructive: false, // Writing to .cybercoder is safe
  async execute(input, ctx) {
    const cwd = ctx.cwd;
    const action = String(input.action);
    const filename = String(input.filename).replace(/[^a-zA-Z0-9_.-]/g, ''); // safe filename
    if (!filename) return 'Invalid filename';

    ensureDir(cwd);
    const filePath = join(cwd, ARTIFACT_DIR, filename);

    if (action === 'read') {
      if (!existsSync(filePath)) return `Artifact ${filename} does not exist.`;
      try {
        return readFileSync(filePath, 'utf8');
      } catch (e: any) {
        return `Failed to read artifact: ${e.message}`;
      }
    }

    if (action === 'write') {
      const content = String(input.content ?? '');
      try {
        writeFileSync(filePath, content, 'utf8');
        return `Artifact ${filename} saved successfully to ${ARTIFACT_DIR}/${filename}`;
      } catch (e: any) {
        return `Failed to write artifact: ${e.message}`;
      }
    }

    return 'Invalid action';
  },
};
