import { createInterface } from 'node:readline'
import { runChat } from './runtime/chat.js'
import { builtinTools, grepWorkspace } from '@cybermind/tools'
import { getGitContext } from './utils/git-context.js'
import { projectMemoryPrompt } from './utils/project-memory.js'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import { CYBERMIND_VERSION } from '@cybermind/shared'

/**
 * RPC Server mode for the CyberCoder CLI.
 *
 * When started with `--rpc`, the CLI runs as a persistent JSON-RPC server
 * communicating over stdin/stdout (newline-delimited JSON). This is how the
 * VS Code extension drives the full CLI agent locally — giving it access to
 * all tools, skills, sub-agents, MCP, checkpoints, etc.
 *
 * Protocol:
 *   Request:  { id: number, method: string, params?: object }
 *   Response: { id: number, result?: any, error?: { message: string } }
 *   Event:    { event: string, data?: any }
 */

function send(msg: object): void {
  process.stdout.write(JSON.stringify(msg) + '\n')
}

function event(name: string, data?: unknown): void {
  send({ event: name, data })
}

function respond(id: number, result: unknown): void {
  send({ id, result })
}

function respondError(id: number, message: string): void {
  send({ id, error: { message } })
}

const cwd = process.cwd()

/** Search project files without passing model-controlled text to a shell. */
export function grepRpcWorkspace(pattern: string, include: string | undefined, root: string): string {
  return grepWorkspace(pattern, root, {
    ...(include ? { include } : {}),
    caseSensitive: true,
  }).slice(0, 16000)
}

const gitRpcOperations = new Map<string, string[]>([
  ['status', ['status']],
  ['diff', ['diff']],
  ['diff --cached', ['diff', '--cached']],
  ['diff --stat', ['diff', '--stat']],
  ['branch --show-current', ['branch', '--show-current']],
  ['log -1 --oneline', ['log', '-1', '--oneline']],
])

/** Keep the RPC read-only git surface to known operations and argument arrays. */
export function gitRpcArguments(operation: string): string[] | null {
  const args = gitRpcOperations.get(operation.trim())
  return args ? [...args] : null
}

interface ChildProcessExecutionError {
  message?: string;
  stdout?: string | Buffer;
  stderr?: string | Buffer;
  status?: number | null;
}

function executionErrorDetails(error: unknown): {
  message: string;
  output: string;
  status: number;
} {
  const details: ChildProcessExecutionError =
    typeof error === 'object' && error !== null ? error : {};
  const output = [details.stdout, details.stderr]
    .map((stream) => typeof stream === 'string' ? stream : stream?.toString('utf8') ?? '')
    .join('');

  return {
    message: error instanceof Error ? error.message : String(error),
    output,
    status: typeof details.status === 'number' ? details.status : 1,
  };
}

// ── Method handlers ──

async function handleMethod(id: number, method: string, params: Record<string, unknown> = {}): Promise<void> {
  try {
    switch (method) {
      case 'ping':
        respond(id, { pong: true, version: CYBERMIND_VERSION, cwd })
        break

      case 'read_file': {
        const path = resolve(cwd, String(params.path || ''))
        const text = readFileSync(path, 'utf8')
        const lines = text.split('\n').slice(0, Number(params.limit || 2000))
        respond(id, { content: lines.map((l, i) => `${i + 1}\t${l}`).join('\n') })
        break
      }

      case 'write_file': {
        const path = resolve(cwd, String(params.path || ''))
        const dir = join(path, '..')
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(path, String(params.content || ''), 'utf8')
        respond(id, { written: path })
        break
      }

      case 'list_dir': {
        const path = resolve(cwd, String(params.path || '.'))
        const entries = readdirSync(path, { withFileTypes: true })
        respond(id, { entries: entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' })) })
        break
      }

      case 'grep': {
        const pattern = String(params.pattern ?? '')
        const include = typeof params.include === 'string' && params.include ? params.include : undefined
        try {
          const out = grepRpcWorkspace(pattern, include, cwd)
          respond(id, { matches: out })
        } catch (error) {
          respond(id, { matches: executionErrorDetails(error).output.slice(0, 16000) })
        }
        break
      }

      case 'run_command': {
        const command = String(params.command || '')
        event('tool_start', { name: 'run_command', summary: `Run: ${command}` })
        try {
          const out = execSync(command, { cwd, encoding: 'utf8', timeout: 120000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 })
          event('tool_end', { name: 'run_command', ok: true })
          respond(id, { output: out.slice(0, 20000), exitCode: 0 })
        } catch (error) {
          const details = executionErrorDetails(error)
          event('tool_end', { name: 'run_command', ok: false })
          respond(id, { output: details.output, exitCode: details.status })
        }
        break
      }

      case 'git': {
        const op = String(params.operation || 'status')
        const args = gitRpcArguments(op)
        if (!args) {
          respondError(id, 'Unsupported git operation.')
          break
        }
        try {
          const out = execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true })
          respond(id, { output: out.slice(0, 12000) })
        } catch (error) {
          const details = executionErrorDetails(error)
          respond(id, { output: details.output, error: details.message })
        }
        break
      }

      case 'git_context': {
        const ctx = getGitContext(cwd)
        respond(id, ctx)
        break
      }

      case 'project_memory': {
        const mem = projectMemoryPrompt(cwd)
        respond(id, { memory: mem })
        break
      }

      case 'complete': {
        // Full agentic completion using the CLI's agent loop
        const messages = (params.messages as Array<{ role: string; content: string }>) || []
        const model = String(params.model || 'auto')
        const systemPrompt = String(params.system || '')

        let fullText = ''
        await runChat(
          messages.map(m => ({ id: `rpc-${Date.now()}`, role: m.role as 'user' | 'assistant', content: m.content, createdAt: Date.now() })),
          {
            model,
            systemPrompt,
            onEvent: (evt) => {
              if (evt.type === 'text') {
                fullText += evt.text
                event('token', { content: evt.text })
              } else if (evt.type === 'tool_call') {
                event('tool_start', { name: evt.name, input: evt.input })
              } else if (evt.type === 'tool_result') {
                event('tool_end', { name: evt.name, output: evt.output.slice(0, 4000), ok: evt.ok })
              } else if (evt.type === 'done' && evt.reason === 'error') {
                event('error', { message: evt.error ?? 'Agent turn failed' })
              }
            },
          },
        )
        event('done', {})
        respond(id, { content: fullText })
        break
      }

      case 'shutdown':
        respond(id, { ok: true })
        setTimeout(() => process.exit(0), 100)
        break

      default:
        respondError(id, `Unknown method: ${method}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    respondError(id, message || 'Internal error')
  }
}

// ── Main loop ──

export function startRpcServer(): void {
  // Signal readiness
  event('ready', { version: CYBERMIND_VERSION, cwd, tools: builtinTools().map(t => t.schema.name) })

  const rl = createInterface({ input: process.stdin, terminal: false })
  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    try {
      const msg = JSON.parse(trimmed)
      if (typeof msg.id === 'number' && typeof msg.method === 'string') {
        handleMethod(msg.id, msg.method, msg.params || {})
      }
    } catch {
      // Ignore malformed input
    }
  })

  rl.on('close', () => process.exit(0))
}
