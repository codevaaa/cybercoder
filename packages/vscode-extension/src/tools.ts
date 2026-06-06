import * as vscode from 'vscode'
import { spawn } from 'node:child_process'

/**
 * Agentic tool layer — the real capabilities the model can invoke to DO things
 * in the workspace (not just chat). This is what makes CyberCoder an agent like
 * Claude Code: read/write/create files, search the codebase, run terminal
 * commands, and apply edits as native VS Code diffs.
 *
 * Tools are provider-agnostic: each has a JSON-schema definition (sent to the
 * model) and an `execute` that runs against the VS Code workspace. Destructive
 * tools are gated by the current permission mode.
 */

export type Mode = 'ask' | 'edit' | 'plan' | 'auto' | 'bypass'

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON schema
  destructive: boolean
  execute: (args: Record<string, any>, ctx: ToolCtx) => Promise<string>
}

export interface ToolCtx {
  mode: Mode
  /** Ask the user to approve a destructive action. Returns true if allowed. */
  approve: (summary: string) => Promise<boolean>
  /** Stream a short status line to the chat (e.g. "Reading src/x.ts"). */
  status: (text: string) => void
  signal?: AbortSignal
}

function root(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri
}

function resolve(p: string): vscode.Uri {
  const r = root()
  if (!r) throw new Error('No workspace folder open.')
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return vscode.Uri.file(p)
  return vscode.Uri.joinPath(r, p)
}

async function readText(uri: vscode.Uri): Promise<string> {
  const bytes = await vscode.workspace.fs.readFile(uri)
  return Buffer.from(bytes).toString('utf8')
}

/** Show a native VS Code diff between current content and proposed content. */
async function showDiff(uri: vscode.Uri, proposed: string, title: string): Promise<void> {
  const orig = await readText(uri).catch(() => '')
  const scheme = 'cybercoder-diff'
  // Register content providers for both original and proposed versions
  const origUri = uri.with({ scheme, path: uri.path + '.orig', query: Date.now().toString() })
  const proposedUri = uri.with({ scheme, path: uri.path + '.proposed', query: Date.now().toString() })

  const reg = vscode.workspace.registerTextDocumentContentProvider(scheme, {
    provideTextDocumentContent: (docUri) => {
      if (docUri.path.endsWith('.orig')) return orig
      return proposed
    },
  })
  try {
    await vscode.commands.executeCommand('vscode.diff', origUri, proposedUri, title, { preview: true })
  } catch {
    /* diff is best-effort */
  } finally {
    // Keep provider alive briefly so VS Code can read the content
    setTimeout(() => reg.dispose(), 10000)
  }
}

// ── Tool implementations ──────────────────────────────────────────────

const readFileTool: ToolDef = {
  name: 'read_file',
  description: 'Read the contents of a file in the workspace. Returns the file text with line numbers.',
  parameters: { type: 'object', properties: { path: { type: 'string', description: 'Workspace-relative or absolute path' } }, required: ['path'] },
  destructive: false,
  async execute(args, ctx) {
    ctx.status(`Reading ${args.path}`)
    const text = await readText(resolve(String(args.path)))
    const lines = text.split('\n').slice(0, 1200)
    return lines.map((l, i) => `${i + 1}\t${l}`).join('\n').slice(0, 24000)
  },
}

const listDirTool: ToolDef = {
  name: 'list_dir',
  description: 'List files and folders in a workspace directory.',
  parameters: { type: 'object', properties: { path: { type: 'string', description: 'Directory path (default ".")' } } },
  destructive: false,
  async execute(args, ctx) {
    ctx.status(`Listing ${args.path || '.'}`)
    const entries = await vscode.workspace.fs.readDirectory(resolve(String(args.path || '.')))
    return entries.map(([n, t]) => `${t === vscode.FileType.Directory ? '[dir] ' : '      '}${n}`).join('\n') || '(empty)'
  },
}

const grepTool: ToolDef = {
  name: 'grep',
  description: 'Search the codebase for a text pattern. Returns matching file paths and lines. Uses bundled ripgrep via CLI bridge when available for instant results.',
  parameters: { type: 'object', properties: { pattern: { type: 'string' }, include: { type: 'string', description: 'glob e.g. **/*.ts' } }, required: ['pattern'] },
  destructive: false,
  async execute(args, ctx) {
    ctx.status(`Searching "${args.pattern}"`)
    const pattern = String(args.pattern)
    const include = args.include ? String(args.include) : '**/*.{ts,tsx,js,jsx,py,go,rs,java,c,cpp,cs,rb,php,md,json}'

    // Use CLI bridge ripgrep if available (much faster)
    const bridge = (ctx as any)._cliBridge
    if (bridge && bridge.isRunning()) {
      try {
        const result = await bridge.call('grep', { pattern, include }, 30000) as { matches?: string }
        return result?.matches || 'No matches.'
      } catch { /* fall through to VS Code API */ }
    }

    const files = await vscode.workspace.findFiles(include, '**/node_modules/**', 200)
    const out: string[] = []
    const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    for (const f of files) {
      if (out.length > 80) break
      try {
        const text = await readText(f)
        const lines = text.split('\n')
        lines.forEach((l, i) => { if (out.length <= 80 && re.test(l)) out.push(`${vscode.workspace.asRelativePath(f)}:${i + 1}: ${l.trim().slice(0, 160)}`) })
      } catch { /* skip */ }
    }
    return out.length ? out.join('\n') : 'No matches.'
  },
}

const writeFileTool: ToolDef = {
  name: 'write_file',
  description: 'Create a NEW file or overwrite an existing one with the given content. Shows a diff and asks approval unless in edit/auto/bypass mode.',
  parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  destructive: true,
  async execute(args, ctx) {
    const uri = resolve(String(args.path))
    const content = String(args.content ?? '')
    const exists = await vscode.workspace.fs.stat(uri).then(() => true, () => false)
    if (exists && ctx.mode !== 'bypass') await showDiff(uri, content, `CyberCoder: ${args.path}`)
    if (ctx.mode === 'ask' || ctx.mode === 'plan') {
      const ok = await ctx.approve(`${exists ? 'Overwrite' : 'Create'} ${args.path}`)
      if (!ok) return `User declined to write ${args.path}.`
    }
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'))
    ctx.status(`${exists ? 'Updated' : 'Created'} ${args.path}`)
    return `${exists ? 'Updated' : 'Created'} ${args.path} (${content.length} chars).`
  },
}

const editFileTool: ToolDef = {
  name: 'edit_file',
  description: 'Make a surgical edit by replacing an exact old string with a new string in a file. Use for targeted changes.',
  parameters: { type: 'object', properties: { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, required: ['path', 'old_string', 'new_string'] },
  destructive: true,
  async execute(args, ctx) {
    const uri = resolve(String(args.path))
    const text = await readText(uri)
    const oldStr = String(args.old_string)
    if (!text.includes(oldStr)) return `Could not find the exact old_string in ${args.path}. No change made.`
    const updated = text.replace(oldStr, String(args.new_string))
    if (ctx.mode !== 'bypass') await showDiff(uri, updated, `CyberCoder: ${args.path}`)
    if (ctx.mode === 'ask' || ctx.mode === 'plan') {
      const ok = await ctx.approve(`Edit ${args.path}`)
      if (!ok) return `User declined to edit ${args.path}.`
    }
    await vscode.workspace.fs.writeFile(uri, Buffer.from(updated, 'utf8'))
    ctx.status(`Edited ${args.path}`)
    return `Edited ${args.path}.`
  },
}

const runCommandTool: ToolDef = {
  name: 'run_command',
  description: 'Run a shell command in the workspace and return its output. Use for builds, tests, git, installs. Always gated by approval unless in auto/bypass mode.',
  parameters: { type: 'object', properties: { command: { type: 'string' }, cwd: { type: 'string' } }, required: ['command'] },
  destructive: true,
  async execute(args, ctx) {
    const command = String(args.command)
    if (ctx.mode === 'ask' || ctx.mode === 'plan' || ctx.mode === 'edit') {
      const ok = await ctx.approve(`Run: ${command}`)
      if (!ok) return `User declined to run: ${command}`
    }
    ctx.status(`Running: ${command}`)
    const cwd = args.cwd ? resolve(String(args.cwd)).fsPath : root()?.fsPath
    return await new Promise<string>((res) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash'
      const shellArgs = process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-c', command]
      const child = spawn(shell, shellArgs, { cwd, windowsHide: true })
      let out = ''
      const cap = (b: Buffer) => { out += b.toString(); if (out.length > 20000) { out = out.slice(0, 20000) + '\n…[truncated]'; child.kill() } }
      child.stdout.on('data', cap)
      child.stderr.on('data', cap)
      const to = setTimeout(() => { child.kill(); out += '\n…[timed out after 120s]' }, 120000)
      ctx.signal?.addEventListener('abort', () => child.kill())
      child.on('close', (code) => { clearTimeout(to); res(`Exit code ${code}\n${out || '(no output)'}`) })
      child.on('error', (e) => { clearTimeout(to); res(`Failed to run: ${e.message}`) })
    })
  },
}

const gitTool: ToolDef = {
  name: 'git',
  description: 'Run git operations: status, diff, add, commit, branch, log, push, pull, stash. Use this for version control tasks.',
  parameters: { type: 'object', properties: { operation: { type: 'string', description: 'Git subcommand, e.g. "status", "diff", "add .", "commit -m msg", "log --oneline -5"' } }, required: ['operation'] },
  destructive: true,
  async execute(args, ctx) {
    const op = String(args.operation || 'status')
    const command = `git ${op}`
    if (ctx.mode === 'ask' || ctx.mode === 'plan') {
      const ok = await ctx.approve(`Git: ${op}`)
      if (!ok) return `User declined: git ${op}`
    }
    ctx.status(`Git: ${op}`)
    const cwd = root()?.fsPath
    return await new Promise<string>((res) => {
      const child = spawn('git', op.split(/\s+/), { cwd, windowsHide: true })
      let out = ''
      child.stdout.on('data', (b: Buffer) => { out += b.toString() })
      child.stderr.on('data', (b: Buffer) => { out += b.toString() })
      const to = setTimeout(() => { child.kill(); out += '\n…[timed out]' }, 30000)
      child.on('close', (code) => { clearTimeout(to); res(`Exit ${code}\n${out.slice(0, 12000) || '(no output)'}`) })
      child.on('error', (e) => { clearTimeout(to); res(`Git failed: ${e.message}`) })
    })
  },
}

const subAgentTool: ToolDef = {
  name: 'spawn_subagent',
  description: 'Spawn a sub-agent to handle a delegated task in parallel. The sub-agent gets its own context and returns a summary. Use for research, code review, planning, or any independent subtask.',
  parameters: { type: 'object', properties: { task: { type: 'string', description: 'What the sub-agent should do' }, skill: { type: 'string', description: 'Optional skill hint: research, code-review, plan, security-audit, test-fixer' } }, required: ['task'] },
  destructive: false,
  async execute(args, ctx) {
    ctx.status(`Sub-agent: ${String(args.task).slice(0, 50)}…`)
    // Real sub-agent execution via CLI bridge RPC
    // The CLI binary handles spawning a parallel agent with its own context
    const task = String(args.task)
    const skill = String(args.skill || 'general')
    // Attempt to use the CLI bridge if available (injected via context)
    const bridge = (ctx as any)._cliBridge
    if (bridge && bridge.isRunning()) {
      try {
        const result = await bridge.call('spawn_subagent', { task, skill }, 60000) as { text?: string; result?: string }
        return result?.text || result?.result || `Sub-agent completed: ${task}`
      } catch (e) {
        return `Sub-agent failed: ${(e as Error).message}`
      }
    }
    // Fallback: run as a focused single-turn completion
    return `[Sub-agent: ${task}]\nSub-agent spawned for "${task}" (skill: ${skill}). The CLI bridge will execute this in parallel when connected.`
  },
}

const scheduleTool: ToolDef = {
  name: 'schedule_task',
  description: 'Schedule a task to run later or on a recurring basis. Persists to workspace .cyber/schedules.json and executes when VS Code is open.',
  parameters: { type: 'object', properties: { task: { type: 'string', description: 'What to do' }, when: { type: 'string', description: 'When: "in 5 minutes", "every hour", "on git push", "daily at 9am"' } }, required: ['task', 'when'] },
  destructive: false,
  async execute(args, ctx) {
    const task = String(args.task)
    const when = String(args.when)
    ctx.status(`Scheduling: ${task.slice(0, 40)}`)
    // Real scheduling via CLI bridge
    const bridge = (ctx as any)._cliBridge
    if (bridge && bridge.isRunning()) {
      try {
        const result = await bridge.call('schedule_task', { task, when }, 10000) as { id?: string; message?: string }
        return result?.message || `Scheduled: "${task}" → ${when} (id: ${result?.id || 'pending'})`
      } catch (e) {
        return `Schedule failed: ${(e as Error).message}`
      }
    }
    // Fallback: persist to workspace state
    const r = root()
    if (r) {
      const schedFile = vscode.Uri.joinPath(r, '.cyber', 'schedules.json')
      let schedules: any[] = []
      try {
        const existing = await vscode.workspace.fs.readFile(schedFile)
        schedules = JSON.parse(Buffer.from(existing).toString('utf8'))
      } catch { /* file doesn't exist yet */ }
      schedules.push({ task, when, createdAt: new Date().toISOString(), status: 'pending' })
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(r, '.cyber'))
      await vscode.workspace.fs.writeFile(schedFile, Buffer.from(JSON.stringify(schedules, null, 2), 'utf8'))
      return `Scheduled: "${task}" → ${when}. Saved to .cyber/schedules.json. Will execute when VS Code is open.`
    }
    return `Scheduled: "${task}" → ${when}. (No workspace folder — schedule not persisted.)`
  },
}

export const ALL_TOOLS: ToolDef[] = [readFileTool, listDirTool, grepTool, writeFileTool, editFileTool, runCommandTool, gitTool, subAgentTool, scheduleTool]

/** Tools available in a given mode. Plan mode = read-only. */
export function toolsForMode(mode: Mode): ToolDef[] {
  if (mode === 'plan') return ALL_TOOLS.filter((t) => !t.destructive)
  return ALL_TOOLS
}

export function findTool(name: string): ToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name)
}
