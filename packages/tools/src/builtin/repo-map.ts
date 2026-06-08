import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative, extname } from 'node:path';
import type { AgentTool } from '../types.js';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage',
  '.turbo', '.cache', 'vendor', '__pycache__', '.venv', 'venv', '.idea', '.vscode',
]);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.rb', '.php', '.c', '.cpp', '.h', '.cs']);
const MAX_FILES = 400;
const MAX_SYMBOLS_PER_FILE = 12;

/**
 * `repo_map` — build a compact map of the codebase: directory tree + the top
 * exported symbols (functions, classes, components) per code file. This lets
 * the agent navigate by structure instead of repeatedly grepping, saving tokens
 * and round trips. Read-only.
 */
export const repoMapTool: AgentTool = {
  schema: {
    name: 'repo_map',
    description:
      'Build a compact map of the project: directory structure plus the key exported symbols (functions/classes/components) in each code file. Call this FIRST on an unfamiliar repo to understand its layout efficiently.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Root to map (default: cwd).' },
        max_depth: { type: 'integer', description: 'Max directory depth (default 4).' },
      },
    },
  },
  destructive: false,
  async execute(input, ctx) {
    const root = resolve(ctx.cwd, String(input.path ?? '.'));
    const maxDepth = Number(input.max_depth ?? 4);
    const files: string[] = [];

    const walk = (dir: string, depth: number) => {
      if (depth > maxDepth || files.length >= MAX_FILES) return;
      let entries: import('node:fs').Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (files.length >= MAX_FILES) break;
        if (e.name.startsWith('.') && e.name !== '.codeva') continue;
        if (IGNORE_DIRS.has(e.name)) continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full, depth + 1);
        else if (e.isFile() && CODE_EXT.has(extname(e.name))) files.push(full);
      }
    };
    walk(root, 0);

    if (files.length === 0) return 'No code files found to map.';

    const byDir = new Map<string, string[]>();
    for (const f of files) {
      const rel = relative(root, f);
      const dir = rel.includes('/') || rel.includes('\\') ? rel.replace(/[\\/][^\\/]+$/, '') : '.';
      if (!byDir.has(dir)) byDir.set(dir, []);
      byDir.get(dir)!.push(f);
    }

    const lines: string[] = [`# Repo map: ${relative(ctx.cwd, root) || '.'} (${files.length} code files)`];
    const dirs = [...byDir.keys()].sort();
    for (const dir of dirs) {
      lines.push(`\n## ${dir}/`);
      for (const f of byDir.get(dir)!.sort()) {
        const name = f.replace(/^.*[\\/]/, '');
        const symbols = extractSymbols(f);
        if (symbols.length) {
          lines.push(`- ${name}: ${symbols.join(', ')}`);
        } else {
          lines.push(`- ${name}`);
        }
      }
    }
    const out = lines.join('\n');
    return out.length > 16_000 ? out.slice(0, 16_000) + '\n…[map truncated]' : out;
  },
};

/** Extract top-level exported/defined symbols from a code file (regex-based, fast). */
function extractSymbols(file: string): string[] {
  let text: string;
  try {
    const st = statSync(file);
    if (st.size > 400_000) return [];
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const symbols = new Set<string>();
  const imports = new Set<string>();
  
  const patterns = [
    /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/g,
    /export\s+(?:const|let|var)\s+([A-Za-z0-9_]+)/g,
    /export\s+interface\s+([A-Za-z0-9_]+)/g,
    /export\s+type\s+([A-Za-z0-9_]+)/g,
    /(?:^|\n)\s*(?:public|private|protected\s+)?(?:async\s+)?def\s+([A-Za-z0-9_]+)/g, // python
    /(?:^|\n)func\s+(?:\([^)]*\)\s+)?([A-Za-z0-9_]+)/g, // go
    /(?:^|\n)(?:pub\s+)?fn\s+([A-Za-z0-9_]+)/g, // rust
  ];
  
  const importPatterns = [
    /import\s+.*?from\s+['"]([^'"]+)['"]/g,
    /require\(['"]([^'"]+)['"]\)/g,
    /from\s+([A-Za-z0-9_.]+)\s+import/g, // python
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && symbols.size < MAX_SYMBOLS_PER_FILE) {
      if (m[1] && m[1].length > 1) symbols.add(m[1]);
    }
  }
  
  for (const re of importPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && imports.size < 5) { // max 5 imports per file for brevity
      if (m[1] && m[1].length > 1) imports.add(m[1]);
    }
  }
  
  const result = [...symbols].slice(0, MAX_SYMBOLS_PER_FILE);
  if (imports.size > 0) {
    result.push(`(imports: ${[...imports].join(', ')})`);
  }
  return result;
}
