import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentTool } from './core-types.js';

/**
 * Lightweight MCP (Model Context Protocol) client over stdio — dependency-free.
 *
 * MCP servers speak JSON-RPC 2.0 over stdin/stdout. This client launches the
 * configured servers, performs the initialize handshake, lists their tools, and
 * exposes each remote tool as a CyberCoder AgentTool (named `mcp__<server>__<tool>`).
 * That means ANY MCP server (databases, browsers, GitHub, Slack, custom APIs)
 * instantly becomes available to the agent — the same extensibility Claude Code
 * has, with zero extra runtime deps.
 *
 * Config (.codeva/mcp.json project, or ~/.codeva/mcp.json global):
 * {
 *   "mcpServers": {
 *     "filesystem": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "."] },
 *     "github":     { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-github"], "env": { "GITHUB_TOKEN": "..." } }
 *   }
 * }
 */

interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface RpcPending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
}

class McpServer {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, RpcPending>();
  private buffer = '';
  public tools: McpToolDef[] = [];

  constructor(public readonly name: string, private readonly cfg: McpServerConfig) {}

  async start(timeoutMs = 15_000): Promise<void> {
    // On Windows, npx/npm resolve to .cmd shims that need the shell; on POSIX
    // we spawn directly (no shell) to avoid argument-injection risk.
    const isWin = process.platform === 'win32';
    const needsShell = isWin && /^(npx|npm|yarn|pnpm)(\.cmd)?$/i.test(this.cfg.command);
    this.proc = spawn(this.cfg.command, this.cfg.args ?? [], {
      env: { ...process.env, ...(this.cfg.env ?? {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: needsShell,
    }) as ChildProcessWithoutNullStreams;

    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk: string) => this.onData(chunk));
    this.proc.on('error', () => this.failAll(new Error(`MCP server '${this.name}' failed to spawn`)));
    this.proc.on('exit', () => this.failAll(new Error(`MCP server '${this.name}' exited`)));

    // Handshake: initialize → tools/list.
    await this.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'cybercoder', version: '0.1.0' },
    }, timeoutMs);
    this.notify('notifications/initialized', {});
    const listed = (await this.rpc('tools/list', {}, timeoutMs)) as { tools?: McpToolDef[] };
    this.tools = listed?.tools ?? [];
  }

  async callTool(toolName: string, args: Record<string, unknown>, timeoutMs = 60_000): Promise<string> {
    const res = (await this.rpc('tools/call', { name: toolName, arguments: args }, timeoutMs)) as {
      content?: Array<{ type: string; text?: string }>;
      isError?: boolean;
    };
    const text = (res?.content ?? [])
      .map((c) => (c.type === 'text' ? c.text ?? '' : `[${c.type}]`))
      .join('\n');
    return res?.isError ? `[MCP error] ${text}` : text || '[no content]';
  }

  stop(): void {
    try {
      this.proc?.kill();
    } catch {
      /* ignore */
    }
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    // Messages are newline-delimited JSON (or Content-Length framed; we handle
    // the common newline-delimited form used by stdio servers).
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as { id?: number; result?: unknown; error?: { message?: string } };
        if (typeof msg.id === 'number' && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(msg.error.message ?? 'MCP error'));
          else p.resolve(msg.result);
        }
      } catch {
        /* ignore non-JSON lines (some servers log to stdout) */
      }
    }
  }

  private rpc(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    if (!this.proc) return Promise.reject(new Error('MCP server not started'));
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP '${this.name}' ${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.proc!.stdin.write(payload);
    });
  }

  private notify(method: string, params: unknown): void {
    if (!this.proc) return;
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }

  private failAll(err: Error): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}

function readMcpConfig(cwd: string): McpConfig {
  for (const path of [join(cwd, '.codeva', 'mcp.json'), join(homedir(), '.codeva', 'mcp.json')]) {
    try {
      if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) as McpConfig;
    } catch {
      /* ignore malformed */
    }
  }
  return {}
}

/**
 * Connect to all configured MCP servers and return their tools as AgentTools.
 * Returns an empty array (and never throws) when no servers are configured or a
 * server fails — MCP is additive and must never break the core session.
 */
export async function loadMcpTools(cwd: string = process.cwd()): Promise<{ tools: AgentTool[]; servers: McpServer[] }> {
  const cfg = readMcpConfig(cwd);
  const servers: McpServer[] = [];
  const tools: AgentTool[] = [];
  const entries = Object.entries(cfg.mcpServers ?? {});

  await Promise.all(
    entries.map(async ([name, sc]) => {
      const server = new McpServer(name, sc);
      try {
        await server.start();
        servers.push(server);
        for (const t of server.tools) {
          tools.push({
            schema: {
              name: `mcp__${name}__${t.name}`,
              description: `[MCP:${name}] ${t.description}`,
              inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
            },
            destructive: true, // MCP tools can do anything; gate them by default
            async execute(input) {
              return server.callTool(t.name, input);
            },
          });
        }
      } catch (err) {
        // Surface as a no-op; the session continues without this server.
        // eslint-disable-next-line no-console
        console.error(`[mcp] ${name} unavailable: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  return { tools, servers };
}

export { McpServer };
