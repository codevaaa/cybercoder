import { exec as execCallback } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { ApprovalGate, type ApprovalUI } from '@cybermind/tools';

const exec = promisify(execCallback);

/**
 * Hooks — event-driven automation, like Claude Code. Approved shell commands
 * can run when the agent edits a file, finishes a task, or before a tool runs.
 * Config is JSON at .codeva/hooks.json (project) or ~/.codeva/hooks.json
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
const approvalGates = new WeakMap<ApprovalUI, ApprovalGate>();

function getHookApprovalGate(ui: ApprovalUI): ApprovalGate {
  let gate = approvalGates.get(ui);
  if (!gate) {
    gate = new ApprovalGate(ui);
    approvalGates.set(ui, gate);
  }
  return gate;
}

function getHookTrustKey(event: HookEvent, cwd: string, command: string): string {
  const digest = createHash('sha256').update(`${cwd}\0${command}`).digest('hex').slice(0, 24);
  return `hook:${event}:${digest}`;
}

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
 * Run hooks for an event. Hook commands are arbitrary shell code, so each
 * matching command must be approved in the visible UI before it executes.
 * Without an interactive approval UI the hook is skipped (fail closed).
 */
export async function runHooks(
  event: HookEvent,
  subject = '',
  cwd: string = process.cwd(),
  approvalUI?: ApprovalUI,
): Promise<HookResult> {
  const rules = loadHooks(cwd)[event] ?? [];
  if (rules.length === 0) return { ran: false, blocked: false, output: '' };

  const outputs: string[] = [];
  let blocked = false;
  let ran = false;

  for (const rule of rules) {
    if (rule.match) {
      let re: RegExp;
      try {
        re = new RegExp(rule.match);
      } catch {
        outputs.push(`[hook ${event}] skipped: invalid match pattern`);
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
    if (!approvalUI) {
      outputs.push(`[hook ${event}] skipped: no approval UI is available`);
      continue;
    }

    const gate = getHookApprovalGate(approvalUI);
    let result: { stdout: string; stderr: string };
    try {
      const outcome = await gate.withApproval({
        toolName: getHookTrustKey(event, cwd, command),
        input: { command, event, subject, cwd },
        summary: `Run configured ${event} hook: ${command}`,
        destructive: true,
      }, async () => exec(command, {
        cwd,
        encoding: 'utf8',
        windowsHide: true,
        timeout: rule.timeoutMs ?? 30_000,
        maxBuffer: 1024 * 1024,
      }));
      if (!outcome.allowed) {
        outputs.push(`[hook ${event}] denied by user: ${command}`);
        continue;
      }
      result = outcome.value;
    } catch (error) {
      const e = error as { stdout?: string; stderr?: string; message?: string };
      const output = [e.stdout, e.stderr, e.message].filter(Boolean).join('\n');
      outputs.push(`[hook ${event}] ${command} (failed)\n${output}`.slice(0, 2000));
      ran = true;
      continue;
    }

    ran = true;
    const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
    outputs.push(`[hook ${event}] ${command}${output ? `\n${output.slice(0, 2000)}` : ''}`);
  }

  return { ran, blocked, output: outputs.join('\n') };
}
