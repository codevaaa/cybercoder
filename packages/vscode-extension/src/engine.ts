import * as vscode from 'vscode'
import { CyberCoderApi } from './api.js'

/**
 * CyberCoder completion engine for the extension.
 *
 * Like Claude Code, this talks DIRECTLY to the chosen provider's streaming API
 * using the user's own key (BYOK) — no dependency on a backend being up. That
 * is what makes the engine actually work. Supported providers:
 *   - anthropic  (Claude — Messages API, SSE)
 *   - openai     (GPT — Chat Completions, SSE)
 *   - groq       (OpenAI-compatible, very fast free tier)
 *   - gemini     (Google — streamGenerateContent SSE)
 *   - ollama     (local or cloud, e.g. gemma4:31b-cloud — /api/chat NDJSON)
 *   - codeva     (fallback: the Codeva cloud gateway via the CLI session)
 *
 * The active provider is chosen from the selected model id's prefix, or from
 * whatever provider key the user connected.
 */

export interface Msg { role: string; content: string }

interface ProviderKeys {
  anthropic?: string
  openai?: string
  groq?: string
  gemini?: string
  ollamaHost?: string
}

export class Engine {
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

  /** True if ANY usable engine path is configured. */
  async isReady(): Promise<boolean> {
    const k = await this.keys()
    if (k.anthropic || k.openai || k.groq || k.gemini || k.ollamaHost) return true
    return this.api.isSignedIn() // Codeva cloud fallback
  }

  /** Resolve the provider + concrete model for a model id like "anthropic/claude-3-5-sonnet". */
  private resolve(modelId: string, keys: ProviderKeys): { provider: string; model: string } {
    const id = (modelId || 'auto').trim()
    if (id.includes('/')) {
      const [p, ...rest] = id.split('/')
      const model = rest.join('/')
      if (['anthropic', 'openai', 'groq', 'gemini', 'ollama'].includes(p)) return { provider: p, model }
    }
    // 'auto' or bare id → pick by available key, preferring quality.
    if (keys.anthropic) return { provider: 'anthropic', model: id === 'auto' ? 'claude-3-5-sonnet-20241022' : id }
    if (keys.openai) return { provider: 'openai', model: id === 'auto' ? 'gpt-4o-mini' : id }
    if (keys.groq) return { provider: 'groq', model: id === 'auto' ? 'llama-3.3-70b-versatile' : id }
    if (keys.gemini) return { provider: 'gemini', model: id === 'auto' ? 'gemini-2.0-flash' : id }
    if (keys.ollamaHost) return { provider: 'ollama', model: id === 'auto' ? 'llama3.2' : id }
    return { provider: 'codeva', model: id }
  }

  async *stream(
    payload: { messages: Msg[]; model?: string; temperature?: number; system?: string },
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const keys = await this.keys()
    const { provider, model } = this.resolve(payload.model || 'auto', keys)

    switch (provider) {
      case 'anthropic': yield* this.anthropic(model, payload, keys.anthropic!, signal); return
      case 'openai': yield* this.openaiCompat('https://api.openai.com/v1', keys.openai!, model, payload, signal); return
      case 'groq': yield* this.openaiCompat('https://api.groq.com/openai/v1', keys.groq!, model, payload, signal); return
      case 'gemini': yield* this.gemini(model, payload, keys.gemini!, signal); return
      case 'ollama': yield* this.ollama(keys.ollamaHost || 'http://localhost:11434', model, payload, signal); return
      default: yield* this.api.streamComplete(payload, signal); return
    }
  }

  // ── Anthropic Messages API (SSE) ──
  private async *anthropic(model: string, p: { messages: Msg[]; temperature?: number; system?: string }, key: string, signal?: AbortSignal) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model, max_tokens: 4096, temperature: p.temperature ?? 0.7, stream: true,
        ...(p.system ? { system: p.system } : {}),
        messages: p.messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content })),
      }),
    })
    if (!res.ok || !res.body) throw new Error(`Anthropic ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
    for await (const data of sse(res.body)) {
      try {
        const j = JSON.parse(data)
        if (j.type === 'content_block_delta' && j.delta?.text) yield j.delta.text as string
      } catch { /* ignore */ }
    }
  }

  // ── OpenAI-compatible (OpenAI, Groq) ──
  private async *openaiCompat(base: string, key: string, model: string, p: { messages: Msg[]; temperature?: number; system?: string }, signal?: AbortSignal) {
    const messages = p.system ? [{ role: 'system', content: p.system }, ...p.messages] : p.messages
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, temperature: p.temperature ?? 0.7, stream: true }),
    })
    if (!res.ok || !res.body) throw new Error(`${base.includes('groq') ? 'Groq' : 'OpenAI'} ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
    for await (const data of sse(res.body)) {
      if (data === '[DONE]') return
      try {
        const j = JSON.parse(data)
        const t = j.choices?.[0]?.delta?.content
        if (t) yield t as string
      } catch { /* ignore */ }
    }
  }

  // ── Google Gemini (SSE) ──
  private async *gemini(model: string, p: { messages: Msg[]; temperature?: number; system?: string }, key: string, signal?: AbortSignal) {
    const contents = p.messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`
    const res = await fetch(url, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, ...(p.system ? { systemInstruction: { parts: [{ text: p.system }] } } : {}), generationConfig: { temperature: p.temperature ?? 0.7 } }),
    })
    if (!res.ok || !res.body) throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
    for await (const data of sse(res.body)) {
      try {
        const j = JSON.parse(data)
        const t = j.candidates?.[0]?.content?.parts?.[0]?.text
        if (t) yield t as string
      } catch { /* ignore */ }
    }
  }

  // ── Ollama (local or cloud) — /api/chat NDJSON ──
  private async *ollama(host: string, model: string, p: { messages: Msg[]; temperature?: number; system?: string }, signal?: AbortSignal) {
    const messages = p.system ? [{ role: 'system', content: p.system }, ...p.messages] : p.messages
    const res = await fetch(`${host.replace(/\/$/, '')}/api/chat`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true, options: { temperature: p.temperature ?? 0.7 } }),
    })
    if (!res.ok || !res.body) throw new Error(`Ollama ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}. Is Ollama running? (ollama serve)`)
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        try {
          const j = JSON.parse(t)
          if (j.message?.content) yield j.message.content as string
          if (j.done) return
        } catch { /* ignore partial */ }
      }
    }
  }
}

/** Shared SSE line reader: yields the payload after each "data: ". */
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
    for (const line of lines) {
      const t = line.trim()
      if (t.startsWith('data:')) yield t.slice(5).trim()
    }
  }
}
