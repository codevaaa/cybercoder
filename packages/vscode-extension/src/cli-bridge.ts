import * as vscode from 'vscode'
import { spawn, ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

/**
 * CLI Bridge — spawns the bundled CyberCoder CLI as a child process and
 * communicates via stdio JSON-RPC. This is the architecture that makes the
 * extension 200+ MB (like Claude Code): the full agent with all tools, skills,
 * sub-agents, MCP, checkpoints, etc. runs locally as a persistent process.
 *
 * Protocol: newline-delimited JSON over stdin/stdout.
 * Request:  { id, method, params }
 * Response: { id, result } or { id, error }
 * Event:    { event, data } (no id — one-way from CLI to extension)
 *
 * The CLI binary is expected at:
 *   <extensionPath>/bin/cybercoder[.exe]
 * Built via `bun build --compile` or `pkg` in the CI pipeline.
 */

export interface RpcRequest {
  id: number
  method: string
  params?: Record<string, unknown>
}

export interface RpcResponse {
  id: number
  result?: unknown
  error?: { message: string; code?: number }
}

export interface RpcEvent {
  event: string
  data?: unknown
}

type Callback = (res: RpcResponse) => void

export class CliBridge {
  private process: ChildProcess | null = null
  private nextId = 1
  private pending = new Map<number, Callback>()
  private buffer = ''
  private ready = false
  private eventHandlers = new Map<string, Array<(data: unknown) => void>>()

  constructor(private readonly extensionPath: string) {}

  /** Path to the bundled CLI binary. */
  private binPath(): string {
    const isWin = process.platform === 'win32'
    const name = isWin ? 'cybercoder.exe' : 'cybercoder'
    // Check multiple locations: bin/, dist/bin/, and the extension root
    const candidates = [
      join(this.extensionPath, 'bin', name),
      join(this.extensionPath, 'dist', 'bin', name),
      join(this.extensionPath, name),
    ]
    for (const p of candidates) if (existsSync(p)) return p
    return candidates[0] // default path (will fail gracefully if missing)
  }

  /** True if the bundled CLI binary exists. */
  hasBundledCli(): boolean {
    return existsSync(this.binPath())
  }

  /** Start the CLI process. Returns true if successful. */
  async start(cwd?: string): Promise<boolean> {
    if (this.process && !this.process.killed) return true
    const bin = this.binPath()
    if (!existsSync(bin)) {
      // Fallback: try system-installed `cm` or `cybercoder`
      const fallback = process.platform === 'win32' ? 'cybercoder.cmd' : 'cm'
      try {
        this.process = spawn(fallback, ['--rpc'], {
          cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        })
      } catch {
        return false
      }
    } else {
      this.process = spawn(bin, ['--rpc'], {
        cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        env: { ...process.env, CYBERCODER_RPC: '1' },
      })
    }

    if (!this.process.stdout || !this.process.stdin) return false

    this.process.stdout.on('data', (chunk: Buffer) => this.onData(chunk))
    this.process.stderr?.on('data', (chunk: Buffer) => {
      // Log stderr for debugging but don't crash
      const msg = chunk.toString().trim()
      if (msg) console.log('[CyberCoder CLI]', msg)
    })
    this.process.on('exit', (code) => {
      this.ready = false
      this.process = null
      this.emit('exit', { code })
    })
    this.process.on('error', (err) => {
      this.ready = false
      this.process = null
      this.emit('error', { message: err.message })
    })

    // Wait for the CLI to signal readiness
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { this.ready = true; resolve(true) }, 3000)
      this.once('ready', () => { clearTimeout(timeout); this.ready = true; resolve(true) })
    })
  }

  /** Stop the CLI process. */
  stop(): void {
    if (this.process && !this.process.killed) {
      this.send({ id: this.nextId++, method: 'shutdown' })
      setTimeout(() => { try { this.process?.kill() } catch {} }, 2000)
    }
    this.process = null
    this.ready = false
    this.pending.clear()
  }

  /** Send an RPC request and wait for the response. */
  async call(method: string, params?: Record<string, unknown>, timeoutMs = 120000): Promise<unknown> {
    if (!this.process || this.process.killed) {
      const started = await this.start()
      if (!started) throw new Error('CLI process not available. Install CyberCoder CLI or check the bundled binary.')
    }

    const id = this.nextId++
    const req: RpcRequest = { id, method, params }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method} (${timeoutMs}ms)`))
      }, timeoutMs)

      this.pending.set(id, (res) => {
        clearTimeout(timer)
        this.pending.delete(id)
        if (res.error) reject(new Error(res.error.message))
        else resolve(res.result)
      })

      this.send(req)
    })
  }

  /** Subscribe to CLI events (streaming tokens, tool status, etc.). */
  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, [])
    this.eventHandlers.get(event)!.push(handler)
  }

  once(event: string, handler: (data: unknown) => void): void {
    const wrapped = (data: unknown) => { this.off(event, wrapped); handler(data) }
    this.on(event, wrapped)
  }

  off(event: string, handler: (data: unknown) => void): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) this.eventHandlers.set(event, handlers.filter((h) => h !== handler))
  }

  isRunning(): boolean { return this.ready && !!this.process && !this.process.killed }

  // ── Internal ──

  private send(msg: RpcRequest): void {
    if (!this.process?.stdin?.writable) return
    this.process.stdin.write(JSON.stringify(msg) + '\n')
  }

  private onData(chunk: Buffer): void {
    this.buffer += chunk.toString()
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const msg = JSON.parse(trimmed)
        if ('id' in msg && this.pending.has(msg.id)) {
          // RPC response
          this.pending.get(msg.id)!(msg as RpcResponse)
        } else if ('event' in msg) {
          // Event
          this.emit(msg.event, msg.data)
        }
      } catch {
        // Not JSON — log as CLI output
        console.log('[CLI]', trimmed)
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) handlers.forEach((h) => h(data))
  }
}
