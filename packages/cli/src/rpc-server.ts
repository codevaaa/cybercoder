import { createInterface } from 'node:readline'
import { runChat, getRouter, getSkillRegistry, getCheckpoints } from './runtime/chat.js'
import { builtinTools } from '@cybermind/tools'
import { getGitContext, gitContextPrompt } from './utils/git-context.js'
import { projectMemoryPrompt } from './utils/project-memory.js'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { execSync } from 'node:child_process'

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

// ── Method handlers ──

async function handleMethod(id: number, method: string, params: Record<string, unknown> = {}): Promise<void> {
  try {
    switch (method) {
      case 'ping':
        respond(id, { pong: true, version: '0.1.22', cwd })
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
        const pattern = String(params.pattern || '')
        const include = String(params.include || '.')
        try {
          const out = execSync(`grep -rn --include="${include}" "${pattern}" .`, { cwd, encoding: 'utf8', timeout: 10000, windowsHide: true }).slice(0, 16000)
          respond(id, { matches: out })
        } catch (e: any) {
          respond(id, { matches: e.stdout?.slice(0, 16000) || '' })
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
        } catch (e: any) {
          event('tool_end', { name: 'run_command', ok: false })
          respond(id, { output: (e.stdout || '') + (e.stderr || ''), exitCode: e.status || 1 })
        }
        break
      }

      case 'git': {
        const op = String(params.operation || 'status')
        try {
          const out = execSync(`git ${op}`, { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true })
          respond(id, { output: out.slice(0, 12000) })
        } catch (e: any) {
          respond(id, { output: (e.stdout || '') + (e.stderr || ''), error: e.message })
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
        const system = String(params.system || '')

        let fullText = ''
        await runChat(
          messages.map(m => ({ id: `rpc-${Date.now()}`, role: m.role as 'user' | 'assistant', content: m.content, createdAt: Date.now() })),
          {
            model,
            onEvent: (evt) => {
              if (evt.type === 'text') {
                fullText += evt.text
                event('token', { content: evt.text })
              } else if (evt.type === 'tool_start') {
                event('tool_start', { name: evt.name, input: evt.input })
              } else if (evt.type === 'tool_end') {
                event('tool_end', { name: evt.name, output: evt.output?.slice(0, 4000) })
              } else if (evt.type === 'error') {
                event('error', { message: evt.message })
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
  } catch (err) {
    respondError(id, (err as Error).message || 'Internal error')
  }
}

// ── Main loop ──

export function startRpcServer(): void {
  // Signal readiness
  event('ready', { version: '0.1.22', cwd, tools: builtinTools().map(t => t.schema.name) })

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
