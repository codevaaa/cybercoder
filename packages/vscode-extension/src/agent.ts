import * as vscode from 'vscode'
import { CyberCoderApi } from './api.js'
import { ToolDef, ToolCtx, toolsForMode, findTool, Mode } from './tools.js'

/**
 * Agentic loop for the extension. This is the layer that makes CyberCoder a
 * real agent (like Claude Code) rather than a chatbot: the model can call tools
 * (read/write files, search, run commands), we execute them against the VS Code
 * workspace, feed results back, and repeat until the model produces a final
 * answer. Supports OpenAI-compatible tool-calling (OpenAI, Groq, Ollama) and
 * Anthropic's tool_use. Falls back to plain streaming for Gemini/Codeva.
 */

export interface AgentMsg { role: string; content: string }

export interface AgentEvents {
  onText: (t: string) => void
  onToolStart: (name: string, summary: string) => void
  onToolEnd: (name: string, ok: boolean) => void
  onStatus: (t: string) => void
}

interface ProviderKeys {
  anthropic?: string; openai?: string; groq?: string; gemini?: string; ollamaHost?: string
}

const MAX_STEPS = 12

export class Agent {
  constructor(private readonly api: CyberCoderApi) {}

  private async keys(): Promise<ProviderKeys> {
    return {
      anthropic: await this.api.getProviderKey('anthropic'),
      openai: await this.api.getProviderKey('openai'),
      groq: await this.api.getProviderKey('groq'),
      gemini: await this.api.getProviderKey('gemini'),
      ollamaHost: await this.api.getProviderKey('ollama_host'),
    }
  }

  private resolve(modelId: string, k: ProviderKeys): { provider: string; model: string } {
    const id = (modelId || 'auto').trim()
    if (id.includes('/')) {
      const [p, ...rest] = id.split('/')
      if (['anthropic', 'openai', 'groq', 'gemini', 'ollama', 'codeva'].includes(p)) return { provider: p, model: rest.join('/') }
    }
    if (k.anthropic) return { provider: 'anthropic', model: id === 'auto' ? 'claude-3-5-sonnet-20241022' : id }
    if (k.groq) return { provider: 'groq', model: id === 'auto' ? 'llama-3.3-70b-versatile' : id }
    if (k.openai) return { provider: 'openai', model: id === 'auto' ? 'gpt-4o-mini' : id }
    if (k.ollamaHost) return { provider: 'ollama', model: id === 'auto' ? 'llama3.2' : id }
    if (k.gemini) return { provider: 'gemini', model: id === 'auto' ? 'gemini-2.0-flash' : id }
    return { provider: 'codeva', model: id === 'auto' ? 'auto' : id }
  }

  /**
   * Run the agentic loop. Returns the final assistant text. Tools are chosen by
   * the current mode (plan = read-only). For providers without tool-calling
   * (gemini/codeva) we degrade to a single streamed answer.
   */
  async run(
    opts: { messages: AgentMsg[]; model?: string; temperature?: number; system?: string; mode: Mode },
    ev: AgentEvents,
    ctx: Omit<ToolCtx, 'mode'>,
  ): Promise<string> {
    const k = await this.keys()
    const { provider, model } = this.resolve(opts.model || 'auto', k)
    const tools = toolsForMode(opts.mode)
    const toolCtx: ToolCtx = { ...ctx, mode: opts.mode }

    if (provider === 'anthropic') return this.anthropicAgent(model, opts, tools, toolCtx, ev, k.anthropic!)
    if (provider === 'openai') return this.openaiAgent('https://api.openai.com/v1', k.openai!, model, opts, tools, toolCtx, ev)
    if (provider === 'groq') return this.openaiAgent('https://api.groq.com/openai/v1', k.groq!, model, opts, tools, toolCtx, ev)
    if (provider === 'ollama') return this.openaiAgent(`${(k.ollamaHost || 'http://localhost:11434').replace(/\/$/, '')}/v1`, 'ollama', model, opts, tools, toolCtx, ev)
    // Gemini / Codeva: no tool-calling here — single streamed answer.
    return this.plainStream(provider, model, opts, ev, k)
  }

  // ── OpenAI-compatible agent loop (OpenAI / Groq / Ollama /v1) ──
  private openaiToolSpec(tools: ToolDef[]) {
    return tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }))
  }

  private async openaiAgent(
    base: string, key: string, model: string,
    opts: { messages: AgentMsg[]; temperature?: number; system?: string },
    tools: ToolDef[], toolCtx: ToolCtx, ev: AgentEvents,
  ): Promise<string> {
    const msgs: any[] = []
    if (opts.system) msgs.push({ role: 'system', content: opts.system })
    msgs.push(...opts.messages)
    const toolSpec = this.openaiToolSpec(tools)
    let finalText = ''

    for (let step = 0; step < MAX_STEPS; step++) {
      if (toolCtx.signal?.aborted) break
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST', signal: toolCtx.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: msgs, temperature: opts.temperature ?? 0.4, tools: toolSpec, tool_choice: 'auto' }),
      })
      if (!res.ok) throw new Error(`${base.includes('groq') ? 'Groq' : base.includes('11434') ? 'Ollama' : 'OpenAI'} ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
      const data = await res.json() as any
      const choice = data.choices?.[0]
      const m = choice?.message
      if (!m) break

      if (m.content) { ev.onText(m.content); finalText += m.content }

      const calls = m.tool_calls
      if (!calls || calls.length === 0) break // model is done

      msgs.push({ role: 'assistant', content: m.content || '', tool_calls: calls })
      for (const call of calls) {
        const name = call.function?.name
        let args: Record<string, any> = {}
        try { args = JSON.parse(call.function?.arguments || '{}') } catch { /* ignore */ }
        const result = await this.runTool(name, args, toolCtx, ev)
        msgs.push({ role: 'tool', tool_call_id: call.id, content: result.slice(0, 24000) })
      }
    }
    return finalText
  }

  // ── Anthropic agent loop (tool_use) ──
  private anthropicToolSpec(tools: ToolDef[]) {
    return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }))
  }

  private async anthropicAgent(
    model: string,
    opts: { messages: AgentMsg[]; temperature?: number; system?: string },
    tools: ToolDef[], toolCtx: ToolCtx, ev: AgentEvents, key: string,
  ): Promise<string> {
    const msgs: any[] = opts.messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    const toolSpec = this.anthropicToolSpec(tools)
    let finalText = ''

    for (let step = 0; step < MAX_STEPS; step++) {
      if (toolCtx.signal?.aborted) break
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: toolCtx.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: 4096, temperature: opts.temperature ?? 0.4, ...(opts.system ? { system: opts.system } : {}), tools: toolSpec, messages: msgs }),
      })
      if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
      const data = await res.json() as any
      const blocks = data.content || []
      const toolUses = blocks.filter((b: any) => b.type === 'tool_use')
      for (const b of blocks) if (b.type === 'text' && b.text) { ev.onText(b.text); finalText += b.text }

      if (toolUses.length === 0) break

      msgs.push({ role: 'assistant', content: blocks })
      const results: any[] = []
      for (const tu of toolUses) {
        const result = await this.runTool(tu.name, tu.input || {}, toolCtx, ev)
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: result.slice(0, 24000) })
      }
      msgs.push({ role: 'user', content: results })
    }
    return finalText
  }

  private async runTool(name: string, args: Record<string, any>, ctx: ToolCtx, ev: AgentEvents): Promise<string> {
    const tool = findTool(name)
    if (!tool) return `Unknown tool: ${name}`
    ev.onToolStart(name, summarize(name, args))
    try {
      const out = await tool.execute(args, ctx)
      ev.onToolEnd(name, true)
      return out
    } catch (e) {
      ev.onToolEnd(name, false)
      return `Tool ${name} failed: ${(e as Error).message}`
    }
  }

  // ── Plain streaming fallback (Gemini / Codeva) ──
  private async plainStream(
    provider: string, model: string,
    opts: { messages: AgentMsg[]; temperature?: number; system?: string },
    ev: AgentEvents, k: ProviderKeys,
  ): Promise<string> {
    let full = ''
    if (provider === 'gemini') {
      const contents = opts.messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(k.gemini!)}`
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}), generationConfig: { temperature: opts.temperature ?? 0.5 } }) })
      if (!res.ok || !res.body) throw new Error(`Gemini ${res.status}`)
      for await (const d of sse(res.body)) { try { const j = JSON.parse(d); const t = j.candidates?.[0]?.content?.parts?.[0]?.text; if (t) { ev.onText(t); full += t } } catch { /* ignore */ } }
      return full
    }
    // Codeva cloud
    for await (const chunk of this.api.streamComplete({ messages: opts.messages, model, temperature: opts.temperature, system: opts.system })) {
      ev.onText(chunk); full += chunk
    }
    return full
  }
}

function summarize(name: string, args: Record<string, any>): string {
  if (name === 'run_command') return `Run: ${args.command}`
  if (name === 'write_file') return `Write ${args.path}`
  if (name === 'edit_file') return `Edit ${args.path}`
  if (name === 'read_file') return `Read ${args.path}`
  if (name === 'grep') return `Search "${args.pattern}"`
  if (name === 'list_dir') return `List ${args.path || '.'}`
  return name
}

async function* sse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) { const t = line.trim(); if (t.startsWith('data:')) yield t.slice(5).trim() }
  }
}
