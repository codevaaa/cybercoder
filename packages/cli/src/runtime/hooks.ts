import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Hooks — event-driven automation, like Claude Code. Run shell commands
 * automatically when the agent edits a file, finishes a task, or before a tool
 * runs. Config is JSON at .codeva/hooks.json (project) or ~/.codeva/hooks.json
 * (global); project overrides global per event.
 *
 * Example .codeva/hooks.json:
 * {
 *   "postEdit":  [{ "match": "\\.ts$", "command": "npx prettier --write {file}" }],
 *   "postTask":  [{ "command": "npm test" }],
 *   "preCommand":[{ "match": "rm -rf", "command": "echo blocked", "block": true }]
 * }
 */
export type HookEvent = 'postEdit' | 'preEdit' | 'postWrite' | 'preCommand' | 'postCommand' | 'postTask' | 'sessionStart';

export interface HookRule {
  /** Optional regex matched against the file path (edit/write) or command. */
  match?: string;
  /** Shell command to run. `{file}` is replaced with the affected path. */
  command: string;
  /** If true and match hits on a preCommand/preEdit, block the action. */
  block?: boolean;
  /** Max ms to allow the hook command to run (default 30s). */
  timeoutMs?: number;
}

type HooksConfig = Partial<Record<HookEvent, HookRule[]>>;

function readHooksFile(path: string): HooksConfig {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as HooksConfig;
  } catch {
    /* ignore malformed */
  }
  return {};
}

let cached: HooksConfig | null = null;

/** Load + merge global and project hook configs (project wins per event). */
export function loadHooks(cwd: string = process.cwd()): HooksConfig {
  if (cached) return cached;
  const global = readHooksFile(join(homedir(), '.codeva', 'hooks.json'));
  const project = readHooksFile(join(cwd, '.codeva', 'hooks.json'));
  const merged: HooksConfig = { ...global };
  for (const key of Object.keys(project) as HookEvent[]) {
    merged[key] = project[key];
  }
  cached = merged;
  return merged;
}

/** Force a reload (after the user edits hooks.json via /hooks). */
export function reloadHooks(): void {
  cached = null;
}

export interface HookResult {
  ran: boolean;
  blocked: boolean;
  output: string;
}

/**
 * Run all hooks for an event. `subject` is the file path (edit/write events) or
 * the command (command events). Returns combined output and whether a `block`
 * rule matched (caller should abort the action when blocked is true).
 */
export function runHooks(event: HookEvent, subject = '', cwd: string = process.cwd()): HookResult {
  const rules = loadHooks(cwd)[event] ?? [];
  if (rules.length === 0) return { ran: false, blocked: false, output: '' };

  const outputs: string[] = [];
  let blocked = false;

  for (const rule of rules) {
    if (rule.match) {
      let re: RegExp;
      try {
        re = new RegExp(rule.match);
      } catch {
        continue;
      }
      if (!re.test(subject)) continue;
    }
    if (rule.block) {
      blocked = true;
      outputs.push(`[hook] blocked by rule (match: ${rule.match ?? '*'})`);
      continue;
    }
    const command = rule.command.replace(/\{file\}/g, subject);
    try {
      const out = execSync(command, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        timeout: rule.timeoutMs ?? 30_000,
      });
      outputs.push(`[hook ${event}] ${command}\n${out.trim().slice(0, 2000)}`);
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      outputs.push(`[hook ${event}] ${command} (failed)\n${(e.stdout || '') + (e.stderr || e.message || '')}`.slice(0, 2000));
    }
  }

  return { ran: outputs.length > 0 || blocked, blocked, output: outputs.join('\n') };
}
