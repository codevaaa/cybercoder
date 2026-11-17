import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AgentTool } from '../types.js';

const MAX_MATCHES = 200;
const MAX_FILE_BYTES = 2_000_000;
const MAX_PATTERN_CHARS = 512;
const MAX_INCLUDE_CHARS = 256;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', '.next', '.cache']);

export const grepTool: AgentTool = {
  schema: {
    name: 'grep',
    description:
      'Search files for a regex pattern (case-insensitive by default). Returns up to 200 matching lines with file:line prefix. Skips node_modules and other build dirs.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression to search for.' },
        path: { type: 'string', description: 'Directory or file to search. Defaults to cwd.' },
        case_sensitive: { type: 'boolean', default: false },
        include: { type: 'string', description: 'Optional glob-like extension filter, e.g. "*.ts".' },
      },
      required: ['pattern'],
    },
  },
  destructive: false,
  async execute(input, ctx) {
    const pattern = String(input.pattern ?? '');
    if (!pattern) throw new Error('grep requires a pattern');
    const root = resolve(ctx.cwd, String(input.path ?? '.'));
    const include = typeof input.include === 'string' && input.include ? input.include : undefined;
    return grepWorkspace(pattern, root, {
      ...(include ? { include } : {}),
      caseSensitive: Boolean(input.case_sensitive),
    });
  },
};

export interface GrepWorkspaceOptions {
  include?: string;
  caseSensitive?: boolean;
}

/** Search a directory without following symlinks or invoking a shell. */
export function grepWorkspace(pattern: string, root: string, options: GrepWorkspaceOptions = {}): string {
  if (!pattern) throw new Error('grep requires a pattern');
  if (pattern.length > MAX_PATTERN_CHARS) throw new Error(`grep patterns are limited to ${MAX_PATTERN_CHARS} characters.`);
  const normalizedInclude = options.include?.replace(/\\/g, '/');
  if (normalizedInclude && normalizedInclude.length > MAX_INCLUDE_CHARS) {
    throw new Error(`grep include filters are limited to ${MAX_INCLUDE_CHARS} characters.`);
  }
  const flags = options.caseSensitive ? '' : 'i';
  const re = new RegExp(pattern, flags);
  const includePattern = normalizedInclude && !normalizedInclude.includes('/')
    ? `**/${normalizedInclude}`
    : normalizedInclude;
  const include = includePattern ? globToRegex(includePattern) : null;
  const matches: string[] = [];

  walk(root, (file) => {
    if (matches.length >= MAX_MATCHES) return false;
    if (include && !include.test(file.replace(/\\/g, '/'))) return true;
    try {
      const stat = lstatSync(file);
      if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_FILE_BYTES) return true;
      const text = readFileSync(file, 'utf8');
      const lines = text.split('\n');
      for (let i = 0; i < lines.length && matches.length < MAX_MATCHES; i++) {
        const line = lines[i] ?? '';
        if (re.test(line)) {
          matches.push(`${file}:${i + 1}: ${line}`);
        }
      }
    } catch {
      // ignore unreadable files
    }
    return true;
  });

  if (matches.length === 0) return `(no matches for /${pattern}/${flags})`;
  return matches.join('\n');
}

function globToRegex(glob: string): RegExp {
  let pattern = '';
  let braceDepth = 0;
  for (let index = 0; index < glob.length; index++) {
    const char = glob[index];
    if (!char) continue;
    if (char === '*' && glob[index + 1] === '*') {
      index++;
      if (glob[index + 1] === '/') {
        pattern += '(?:.*/)?';
        index++;
      } else {
        pattern += '.*';
      }
    } else if (char === '*') {
      pattern += '[^/]*';
    } else if (char === '?') {
      pattern += '[^/]';
    } else if (char === '{') {
      braceDepth++;
      pattern += '(?:';
    } else if (char === '}' && braceDepth > 0) {
      braceDepth--;
      pattern += ')';
    } else if (char === ',' && braceDepth > 0) {
      pattern += '|';
    } else {
      pattern += /[.+^$()|[\]\\]/.test(char) ? `\\${char}` : char;
    }
  }
  return new RegExp(`${pattern}$`, 'i');
}

function walk(root: string, visit: (file: string) => boolean): void {
  const stack = [root];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let stat;
    try {
      stat = lstatSync(cur);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile()) {
      if (!visit(cur)) return;
      continue;
    }
    if (!stat.isDirectory()) continue;
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
      if (e.isDirectory() || e.isFile()) stack.push(join(cur, e.name));
    }
  }
}
