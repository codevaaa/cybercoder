import * as vscode from 'vscode'

/**
 * CyberCoder backend client for the VS Code extension. Mirrors the CLI auth +
 * completion flow: exchange an API key for a session, then stream completions
 * through /cli/complete. The API key is stored in VS Code SecretStorage.
 */

export interface AuthUser {
  id: string
  email?: string
  name?: string
  plan?: string
}

export interface AuthResult {
  success: boolean
  session_id: string
  user: AuthUser
  quota?: unknown
  expires_at?: string
}

const SECRET_API_KEY = 'cybercoder.apiKey'
const SECRET_SESSION = 'cybercoder.sessionId'
const SECRET_PROVIDER_PREFIX = 'cybercoder.provider.'

export class CyberCoderApi {
  private secrets: vscode.SecretStorage
  private sessionId: string | undefined

  constructor(private context: vscode.ExtensionContext) {
    this.secrets = context.secrets
  }

  private baseUrl(): string {
    return vscode.workspace
      .getConfiguration('cybercoder')
      .get<string>('apiBaseUrl', 'https://cybercli-api.onrender.com/api/v1')
      .replace(/\/$/, '')
  }

  async getApiKey(): Promise<string | undefined> {
    return this.secrets.get(SECRET_API_KEY)
  }

  async setApiKey(key: string): Promise<void> {
    await this.secrets.store(SECRET_API_KEY, key)
  }

  /** Store a third-party / local provider key (anthropic, openai, ollama_host). */
  async setProviderKey(provider: string, value: string): Promise<void> {
    await this.secrets.store(SECRET_PROVIDER_PREFIX + provider, value)
  }

  async getProviderKey(provider: string): Promise<string | undefined> {
    return this.secrets.get(SECRET_PROVIDER_PREFIX + provider)
  }

  async clear(): Promise<void> {
    await this.secrets.delete(SECRET_API_KEY)
    await this.secrets.delete(SECRET_SESSION)
    for (const p of ['anthropic', 'openai', 'groq', 'gemini', 'ollama_host']) await this.secrets.delete(SECRET_PROVIDER_PREFIX + p)
    this.sessionId = undefined
  }

  async isSignedIn(): Promise<boolean> {
    if (await this.getApiKey()) return true
    // A connected third-party / local provider also counts as signed in.
    for (const p of ['anthropic', 'openai', 'groq', 'gemini', 'ollama_host']) {
      if (await this.getProviderKey(p)) return true
    }
    return false
  }

  /** Exchange the stored API key for a session. Returns the user profile. */
  async authenticate(apiKey?: string): Promise<AuthResult> {
    const key = apiKey ?? (await this.getApiKey())
    if (!key) throw new Error('No API key. Sign in first.')

    const res = await fetch(`${this.baseUrl()}/cli/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        machine_id: vscode.env.machineId,
        machine_name: 'VS Code',
        os: process.platform,
        shell: 'vscode-extension',
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '/',
      }),
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(err.error || `Authentication failed (${res.status})`)
    }

    const data = (await res.json()) as AuthResult
    this.sessionId = data.session_id
    if (apiKey) await this.setApiKey(apiKey)
    if (data.session_id) await this.secrets.store(SECRET_SESSION, data.session_id)
    return data
  }

  private async ensureSession(): Promise<string> {
    if (this.sessionId) return this.sessionId
    const stored = await this.secrets.get(SECRET_SESSION)
    if (stored) {
      this.sessionId = stored
      return stored
    }
    const auth = await this.authenticate()
    return auth.session_id
  }

  private async headers(): Promise<Record<string, string>> {
    const key = await this.getApiKey()
    const session = await this.ensureSession()
    return {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(session ? { 'x-cli-session': session } : {}),
    }
  }

  /** Stream a chat completion. Yields content chunks. Re-auths once on 401. */
  async *streamComplete(
    payload: {
      messages: Array<{ role: string; content: string }>
      model?: string
      temperature?: number
      system?: string
    },
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    let headers = await this.headers()
    let res = await fetch(`${this.baseUrl()}/cli/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    })

    if (res.status === 401) {
      // Session likely expired — re-authenticate once and retry.
      await this.authenticate()
      headers = await this.headers()
      res = await fetch(`${this.baseUrl()}/cli/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, stream: true }),
        signal,
      })
    }

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Completion failed (${res.status})${txt ? `: ${txt.slice(0, 200)}` : ''}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const t = line.trim()
        if (!t.startsWith('data: ')) continue
        const d = t.slice(6).trim()
        if (d === '[DONE]') return
        try {
          const parsed = JSON.parse(d) as { content?: string; error?: string }
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.content) yield parsed.content
        } catch {
          /* ignore partial chunks */
        }
      }
    }
  }

  async getModels(): Promise<{ models: unknown[]; plan: string }> {
    const res = await fetch(`${this.baseUrl()}/cli/models`, { headers: await this.headers() })
    if (!res.ok) throw new Error(`Failed to fetch models (${res.status})`)
    return (await res.json()) as { models: unknown[]; plan: string }
  }
}
