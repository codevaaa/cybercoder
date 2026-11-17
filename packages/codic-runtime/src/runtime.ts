import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { runAgentLoop, type AgentEvent, type AgentTool, type ToolContext } from '../../core/src/agent-loop.js';
import type { ProviderMessage } from '../../providers/src/types.js';
import { readFileTool } from '../../tools/src/builtin/read-file.js';
import { readManyTool } from '../../tools/src/builtin/read-many.js';
import { writeFileTool } from '../../tools/src/builtin/write-file.js';
import { editTool } from '../../tools/src/builtin/edit.js';
import { listDirTool } from '../../tools/src/builtin/list-dir.js';
import { grepTool } from '../../tools/src/builtin/grep.js';
import { repoMapTool } from '../../tools/src/builtin/repo-map.js';
import { WorkspaceCheckpoints } from '../../tools/src/workspace-checkpoint.js';
import { CodevaProvider, type CodevaProviderOptions } from './provider.js';
import { CodicSubagentCoordinator, type SubagentProgressEvent } from './subagents.js';

const MAX_COMMAND_OUTPUT_BYTES = 200_000;
const DEFAULT_COMMAND_TIMEOUT_MS = 60_000;
const WORKSPACE_TOOLS = [readFileTool, readManyTool, writeFileTool, editTool, listDirTool, grepTool, repoMapTool];

export type CodicRuntimeEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'agent_event'; runId: string; event: AgentEvent }
  | SubagentProgressEvent
  | { type: 'approval_required'; runId: string; approvalId: string; toolName: string; input: Record<string, unknown>; summary: string; unsandboxed: boolean }
  | { type: 'tool_blocked'; runId: string; toolName: string; reason: string }
  | { type: 'checkpoint_created'; runId: string; checkpoint: CodicCheckpointSummary }
  | { type: 'run_finished'; runId: string; reason: 'end_turn' | 'max_iterations' | 'error' | 'cancelled'; error?: string };

export interface CodicCheckpointSummary {
  seq: number;
  label: string;
  createdAt: number;
  files: string[];
}

export interface CodicRuntimeOptions extends CodevaProviderOptions {
  workspaceRoot: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  approvalPolicy?: 'ask' | 'safe-reads' | 'full-access';
  onEvent: (event: CodicRuntimeEvent) => void;
  model?: string;
  maxIterations?: number;
  checkpointSessionId?: string;
  subagentsEnabled?: boolean;
  maxParallelSubagents?: number;
}

interface PendingApproval {
  resolve: (allowed: boolean) => void;
  runId: string;
}

/** Runs CyberCoder's agent loop against exactly one explicitly selected workspace. */
export class CodicRuntime {
  readonly workspaceRoot: string;
  private readonly provider: CodevaProvider;
  private readonly tools: AgentTool[];
  private readonly checkpoints: WorkspaceCheckpoints;
  private readonly subagentCoordinator: CodicSubagentCoordinator;
  private readonly pendingApprovals = new Map<string, PendingApproval>();
  private controller: AbortController | null = null;
  private currentRunId: string | null = null;

  constructor(private readonly options: CodicRuntimeOptions) {
    this.workspaceRoot = realpathSync(resolve(options.workspaceRoot));
    this.provider = new CodevaProvider(options);
    this.checkpoints = new WorkspaceCheckpoints(`codic-${options.checkpointSessionId ?? randomUUID()}`, this.workspaceRoot);
    const workspaceTools = createWorkspaceTools(
      this.workspaceRoot,
      this.checkpoints,
      options.approvalPolicy ?? 'ask',
      (input, signal) => this.runCommand(input, signal),
      (toolName, input, summary, signal, unsandboxed) => this.requestApproval(toolName, input, summary, signal, unsandboxed),
      () => this.currentRunId,
      (toolName, reason) => {
        if (this.currentRunId) this.emit({ type: 'tool_blocked', runId: this.currentRunId, toolName, reason });
      },
      (seq) => {
        const runId = this.currentRunId;
        const checkpoint = this.checkpoints.list().find((entry) => entry.seq === seq);
        if (runId && checkpoint) this.emit({
          type: 'checkpoint_created',
          runId,
          checkpoint: {
            seq,
            label: checkpoint.label,
            createdAt: checkpoint.createdAt,
            files: checkpoint.files.map((file) => relative(this.workspaceRoot, file.path)),
          },
        });
      },
    );
    this.subagentCoordinator = new CodicSubagentCoordinator({
        provider: this.provider,
        toolPool: createReadOnlyHelperTools(workspaceTools, this.workspaceRoot),
        getRunId: () => this.currentRunId,
        onProgress: (event) => this.emit(event),
        model: options.model ?? 'auto',
        reasoningEffort: options.reasoningEffort ?? 'low',
        maxSubagents: options.maxParallelSubagents,
      });
    this.tools = [
      ...workspaceTools,
      ...(options.subagentsEnabled === false ? [] : [this.subagentCoordinator.tool]),
    ];
  }

  /** Starts asynchronously and returns the run ID immediately. */
  start(messages: ProviderMessage[], systemPrompt?: string): string {
    if (this.controller) throw new Error('This task is already running.');
    const controller = new AbortController();
    const runId = randomUUID();
    this.controller = controller;
    this.currentRunId = runId;
    this.emit({ type: 'run_started', runId });
    void this.executeRun(runId, messages, systemPrompt, controller);
    return runId;
  }

  cancel(): void {
    this.subagentCoordinator.cancelAll();
    this.controller?.abort();
  }

  cancelSubagent(agentId: string): boolean {
    return this.subagentCoordinator.cancel(agentId);
  }

  resolveApproval(approvalId: string, allowed: boolean): boolean {
    const pending = this.pendingApprovals.get(approvalId);
    if (!pending || pending.runId !== this.currentRunId) return false;
    this.pendingApprovals.delete(approvalId);
    pending.resolve(allowed);
    return true;
  }

  listCheckpoints(): CodicCheckpointSummary[] {
    return this.checkpoints.list().map((checkpoint) => ({
      seq: checkpoint.seq,
      label: checkpoint.label,
      createdAt: checkpoint.createdAt,
      files: checkpoint.files.map((file) => relative(this.workspaceRoot, file.path)),
    }));
  }

  restoreCheckpoint(seq: number): { restored: number; deleted: number } {
    if (this.controller) throw new Error('Stop the active task before restoring a checkpoint.');
    if (!Number.isInteger(seq) || seq < 1) throw new Error('Choose a valid checkpoint.');
    const checkpoint = this.checkpoints.list().find((entry) => entry.seq === seq);
    if (!checkpoint) throw new Error('That checkpoint is no longer available.');
    for (const entry of this.checkpoints.list().filter((candidate) => candidate.seq >= seq)) {
      for (const file of entry.files) assertAccessiblePath(this.workspaceRoot, file.path, this.options.approvalPolicy === 'full-access');
    }
    return this.checkpoints.restore(seq);
  }

  private async executeRun(runId: string, messages: ProviderMessage[], systemPrompt: string | undefined, controller: AbortController): Promise<void> {
    let finished = false;
    try {
      for await (const event of runAgentLoop(messages, {
        provider: this.provider,
        model: this.options.model ?? 'auto',
        reasoningEffort: this.options.reasoningEffort ?? 'low',
        systemPrompt: workspaceSystemPrompt(this.workspaceRoot, systemPrompt, this.options.approvalPolicy ?? 'ask', this.options.subagentsEnabled !== false, this.options.maxParallelSubagents),
        tools: this.tools,
        cwd: this.workspaceRoot,
        maxIterations: this.options.maxIterations ?? 12,
        signal: controller.signal,
        approve: (toolName, input) => this.approveTool(toolName, input, controller.signal),
      })) {
        this.emit({ type: 'agent_event', runId, event });
        if (event.type === 'done') {
          finished = true;
          this.emit({
            type: 'run_finished',
            runId,
          reason: controller.signal.aborted ? 'cancelled' : event.reason,
          ...(!controller.signal.aborted && event.error ? { error: event.error } : {}),
          });
        }
      }
    } catch (error) {
      if (!finished) {
        finished = true;
        this.emit({
          type: 'run_finished',
          runId,
          reason: controller.signal.aborted ? 'cancelled' : 'error',
          ...(!controller.signal.aborted ? { error: safeMessage(error) } : {}),
        });
      }
    } finally {
      if (!finished) {
        this.emit({
          type: 'run_finished',
          runId,
          reason: controller.signal.aborted ? 'cancelled' : 'end_turn',
        });
      }
      if (this.currentRunId === runId) {
        this.controller = null;
        this.currentRunId = null;
      }
      for (const [approvalId, pending] of this.pendingApprovals) {
        if (pending.runId === runId) {
          this.pendingApprovals.delete(approvalId);
          pending.resolve(false);
        }
      }
    }
  }

  private approveTool(toolName: string, input: Record<string, unknown>, signal: AbortSignal): Promise<boolean> {
    if (this.options.approvalPolicy === 'full-access') return Promise.resolve(true);
    if (toolName !== 'run_command') return Promise.resolve(true);
    if (this.options.approvalPolicy === 'safe-reads' && isSafeReadOnlyCommand(input.command)) return Promise.resolve(true);
    const summary = `Run command: ${String(input.command ?? '').slice(0, 600)}`;
    return this.requestApproval(toolName, input, summary, signal, true);
  }

  private requestApproval(toolName: string, input: Record<string, unknown>, summary: string, signal: AbortSignal, unsandboxed: boolean): Promise<boolean> {
    const runId = this.currentRunId;
    if (!runId) return Promise.resolve(false);
    const approvalId = randomUUID();
    return new Promise<boolean>((resolveDecision) => {
      const settle = (allowed: boolean) => {
        signal.removeEventListener('abort', onAbort);
        resolveDecision(allowed);
      };
      const onAbort = () => {
        this.pendingApprovals.delete(approvalId);
        settle(false);
      };
      this.pendingApprovals.set(approvalId, { resolve: settle, runId });
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
      this.emit({
        type: 'approval_required',
        runId,
        approvalId,
        toolName,
        input,
        summary,
        unsandboxed,
      });
    });
  }

  private async runCommand(input: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    const command = typeof input.command === 'string' ? input.command.trim() : '';
    if (!command) throw new Error('A command is required.');
    const requestedCwd = typeof input.cwd === 'string' ? input.cwd : this.workspaceRoot;
    const cwd = assertAccessiblePath(this.workspaceRoot, requestedCwd, this.options.approvalPolicy === 'full-access');
    const timeoutMs = Math.min(Math.max(Number(input.timeout_ms) || DEFAULT_COMMAND_TIMEOUT_MS, 1_000), 5 * 60_000);
    const windows = process.platform === 'win32';
    const executable = windows ? (process.env.ComSpec || 'cmd.exe') : '/bin/bash';
    const encodedPowerShellCommand = Buffer.from(`$ProgressPreference = 'SilentlyContinue'; ${command}`, 'utf16le').toString('base64');
    const args = windows
      ? ['/d', '/s', '/c', `powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand ${encodedPowerShellCommand}`]
      : ['--noprofile', '--norc', '-c', command];
    const env = allowlistedEnvironment(process.env, windows);

    return await new Promise<string>((resolveOutput, reject) => {
      const child = spawn(executable, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const output: Buffer[] = [];
      let outputSize = 0;
      let wasTruncated = false;
      let settled = false;
      const append = (chunk: Buffer): void => {
        if (outputSize >= MAX_COMMAND_OUTPUT_BYTES) { wasTruncated = true; child.kill(); return; }
        const remaining = MAX_COMMAND_OUTPUT_BYTES - outputSize;
        const accepted = chunk.byteLength > remaining ? chunk.subarray(0, remaining) : chunk;
        output.push(accepted);
        outputSize += accepted.byteLength;
        if (accepted.byteLength !== chunk.byteLength) { wasTruncated = true; child.kill(); }
      };
      child.stdout.on('data', append);
      child.stderr.on('data', append);
      const timer = setTimeout(() => { wasTruncated = true; child.kill(); }, timeoutMs);
      const abort = (): void => { child.kill(); };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(error);
      });
      child.once('close', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        const tail = wasTruncated ? '\n[output capped or process stopped at timeout]' : '';
        const cancelled = signal?.aborted ? '\n[command cancelled]' : '';
        resolveOutput(`exit ${code ?? -1}\n${Buffer.concat(output).toString('utf8')}${tail}${cancelled}`);
      });
    });
  }

  private emit(event: CodicRuntimeEvent): void {
    try {
      this.options.onEvent(event);
    } catch {
      // A closed renderer must not interrupt a local task.
    }
  }
}

export function isSafeReadOnlyCommand(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const command = value.trim();
  return /^(?:pwd|Get-Location|git status(?: --short)?|git diff(?: --stat)?|git branch --show-current|ls|dir|Get-ChildItem(?: -Name)?)$/i.test(command);
}

function createWorkspaceTools(
  workspaceRoot: string,
  checkpoints: WorkspaceCheckpoints,
  approvalPolicy: 'ask' | 'safe-reads' | 'full-access',
  runCommand: (input: Record<string, unknown>, signal?: AbortSignal) => Promise<string>,
  requestApproval: (toolName: string, input: Record<string, unknown>, summary: string, signal: AbortSignal, unsandboxed: boolean) => Promise<boolean>,
  getRunId: () => string | null,
  onBlocked: (toolName: string, reason: string) => void,
  onCheckpoint: (seq: number) => void,
): AgentTool[] {
  const fileTools: AgentTool[] = WORKSPACE_TOOLS.map((tool) => ({
    ...tool,
    async execute(input: Record<string, unknown>, context: ToolContext) {
      let safeInput: Record<string, unknown>;
      try {
        const outsidePaths = pathsOutsideWorkspace(workspaceRoot, input);
        let outsideApproved = approvalPolicy === 'full-access';
        if (outsidePaths.length && !outsideApproved) {
          const summary = `${tool.schema.name.replace(/_/g, ' ')} outside the selected project: ${outsidePaths.slice(0, 4).join(', ')}${outsidePaths.length > 4 ? ` (+${outsidePaths.length - 4} more)` : ''}`;
          if (!context.signal) throw new Error('This action cannot be approved because the task is no longer active.');
          outsideApproved = await requestApproval(tool.schema.name, input, summary, context.signal, true);
          if (!outsideApproved) throw new Error('The out-of-project file action was denied.');
        }
        safeInput = constrainToolPaths(workspaceRoot, input, outsideApproved);
      } catch (error) {
        const reason = safeMessage(error);
        if (reason.includes('selected workspace') || reason.includes('out-of-project file action was denied')) onBlocked(tool.schema.name, reason);
        throw error;
      }
      if (tool.destructive) {
        const paths = [safeInput.path, ...(Array.isArray(safeInput.paths) ? safeInput.paths : [])]
          .filter((value): value is string => typeof value === 'string');
        if (paths.length) {
          const seq = checkpoints.snapshot(paths, `${tool.schema.name} ${paths.join(', ')}`);
          if (getRunId()) onCheckpoint(seq);
        }
      }
      return tool.execute(safeInput, { ...context, cwd: workspaceRoot });
    },
    async verify(input: Record<string, unknown>, output: string, context: ToolContext) {
      if (!tool.verify) return null;
      // Verification repeats only the path that just passed the policy gate in execute().
      return tool.verify(constrainToolPaths(workspaceRoot, input, true), output, { ...context, cwd: workspaceRoot });
    },
  }));

  fileTools.push({
    schema: {
      name: 'run_command',
      description: approvalPolicy === 'full-access'
        ? 'Run a shell command on the host with the user-selected full-access permission. Network and local files are available; stay focused on the requested project task.'
        : 'Run one shell command in the selected project. It executes on the host and requires explicit approval unless it is an exact read-only command allowed by the selected policy.',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command; the exact command is shown before approval.' },
          cwd: { type: 'string', description: 'Optional directory inside the selected workspace.' },
          timeout_ms: { type: 'integer', minimum: 1000, maximum: 300000 },
        },
        required: ['command'],
      },
    },
    destructive: true,
    execute: (input, context) => runCommand(input, context.signal),
  });
  return fileTools;
}

/**
 * Read-only helpers must stay strictly inside the selected project even when
 * the parent task has Full access. Reuse the registered readers, but apply a
 * non-interactive path gate before their normal approval-aware wrappers run.
 */
function createReadOnlyHelperTools(tools: AgentTool[], workspaceRoot: string): AgentTool[] {
  const readOnlyNames = new Set(['read_file', 'read_many', 'list_dir', 'grep', 'repo_map']);
  return tools.filter((tool) => readOnlyNames.has(tool.schema.name)).map((tool) => ({
    ...tool,
    destructive: false,
    async execute(input: Record<string, unknown>, context: ToolContext): Promise<string> {
      // Resolve existing inputs to their canonical in-project path before the
      // reader opens them. Passing the checked alias path leaves a symlink
      // replacement window between validation and readFileSync/readdirSync.
      const safeInput = constrainReadOnlyToolPaths(workspaceRoot, input);
      return tool.execute(safeInput, { ...context, cwd: workspaceRoot });
    },
    async verify(input: Record<string, unknown>, output: string, context: ToolContext): Promise<string | null> {
      if (!tool.verify) return null;
      const safeInput = constrainReadOnlyToolPaths(workspaceRoot, input);
      return tool.verify(safeInput, output, { ...context, cwd: workspaceRoot });
    },
  }));
}

/** Resolve helper read paths once and pass only the verified target to readers. */
export function constrainReadOnlyToolPaths(root: string, input: Record<string, unknown>): Record<string, unknown> {
  const canonicalRoot = realpathSync(root);
  const result = { ...input };
  if (Array.isArray(result.paths)) {
    result.paths = result.paths.map((path) => resolveReadOnlyPath(canonicalRoot, String(path)));
  }
  if (typeof result.path === 'string') result.path = resolveReadOnlyPath(canonicalRoot, result.path);
  return result;
}

function resolveReadOnlyPath(root: string, requestedPath: string): string {
  if (!requestedPath || requestedPath.includes('\0')) throw new Error('The requested path is invalid.');
  const absolute = resolve(root, requestedPath);
  if (!isWithin(root, absolute)) throw new Error('This action is limited to the selected workspace.');
  let real: string;
  try {
    real = realpathSync(absolute);
  } catch {
    throw new Error('The requested path could not be verified safely.');
  }
  if (!isWithin(root, real)) throw new Error('This action is limited to the selected workspace.');
  return real;
}

function constrainToolPaths(root: string, input: Record<string, unknown>, allowOutside = false): Record<string, unknown> {
  const result = { ...input };
  if (Array.isArray(result.paths)) result.paths = result.paths.map((path) => assertAccessiblePath(root, String(path), allowOutside));
  if (typeof result.path === 'string') result.path = assertAccessiblePath(root, result.path, allowOutside);
  return result;
}

function pathsOutsideWorkspace(root: string, input: Record<string, unknown>): string[] {
  const candidates = [
    ...(Array.isArray(input.paths) ? input.paths.map(String) : []),
    ...(typeof input.path === 'string' ? [input.path] : []),
  ]
  return candidates
    .filter((requested) => !isWorkspaceScopedPath(root, requested))
    .map((requested) => resolve(root, requested))
}

function isWorkspaceScopedPath(root: string, requestedPath: string): boolean {
  if (!requestedPath || requestedPath.includes('\0')) return false;
  const absolute = resolve(root, requestedPath);
  if (!isWithin(root, absolute)) return false;
  let existing = absolute;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return false;
    existing = parent;
  }
  try {
    return isWithin(root, realpathSync(existing));
  } catch {
    return false;
  }
}

function assertAccessiblePath(root: string, requestedPath: string, allowOutside: boolean): string {
  if (!requestedPath || requestedPath.includes('\0')) throw new Error('The requested path is invalid.');
  const absolute = resolve(root, requestedPath);
  if (!allowOutside && !isWithin(root, absolute)) throw new Error('This action is limited to the selected workspace.');
  let existing = absolute;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) throw new Error('The requested path does not exist.');
    existing = parent;
  }
  try {
    const real = realpathSync(existing);
    if (!allowOutside && !isWithin(root, real)) throw new Error('This action is limited to the selected workspace.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('limited to the selected workspace')) throw error;
    throw new Error('The requested path could not be verified safely.');
  }
  return absolute;
}

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

function workspaceSystemPrompt(root: string, extra: string | undefined, approvalPolicy: 'ask' | 'safe-reads' | 'full-access', subagentsEnabled: boolean, maxParallelSubagents = 3): string {
  const fullAccess = approvalPolicy === 'full-access';
  return [
    'You are Codic, a coding agent working in the user-selected project.',
    `Workspace root: ${root}`,
    fullAccess
      ? 'The user explicitly selected Full access for this task. You may use the host shell, network, and files outside this project when the task requires it. Keep changes focused, report external file changes clearly, and do not inspect unrelated personal data.'
      : 'Use the available tools to inspect and change files. Keep file access inside this workspace. Ask before accessing a path outside it.',
    subagentsEnabled
      ? `For independent research, planning, or review tasks, you may call spawn_subagents to run up to ${Math.max(1, Math.min(3, maxParallelSubagents))} read-only specialists in parallel. They inherit your selected model and reasoning effort, can only read the selected workspace, and cannot edit files, run shell commands, or use the network. Synthesize their findings before acting.`
      : 'Helper agents are disabled for this task. Do not call or claim to have used subagents.',
    fullAccess ? 'Shell commands can run without another approval because the user selected Full access.' : 'Before running a shell command, explain its purpose briefly; the user must approve each command.',
    extra ?? '',
  ].filter(Boolean).join('\n\n');
}

function allowlistedEnvironment(source: NodeJS.ProcessEnv, windows: boolean): NodeJS.ProcessEnv {
  const names = windows
    ? ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'ComSpec']
    : ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM'];
  const env: NodeJS.ProcessEnv = {};
  for (const name of names) if (source[name]) env[name] = source[name];
  return env;
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The agent task failed.';
}
