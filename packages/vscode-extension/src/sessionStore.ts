import * as vscode from 'vscode'

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  history: Array<{ role: string; content: string }>
}

/**
 * Central session state shared by the sessions tree (sidebar) and the chat
 * panel (editor area). Persists to workspaceState so sessions survive reloads.
 * Emits change events so the tree refreshes when the panel mutates sessions.
 */
export class SessionStore {
  private sessions: ChatSession[]
  private activeId: string | null
  private readonly _onDidChange = new vscode.EventEmitter<void>()
  readonly onDidChange = this._onDidChange.event

  constructor(private readonly context: vscode.ExtensionContext) {
    this.sessions = context.workspaceState.get<ChatSession[]>('cybercoder.sessions', [])
    this.activeId = context.workspaceState.get<string | null>('cybercoder.activeSession', null)
    if (!this.sessions.length) this.create(false)
    if (!this.activeId) this.activeId = this.sessions[0]?.id ?? null
  }

  list(): ChatSession[] { return this.sessions }
  getActiveId(): string | null { return this.activeId }

  active(): ChatSession {
    let s = this.sessions.find((x) => x.id === this.activeId)
    if (!s) s = this.create(false)
    return s
  }

  get(id: string): ChatSession | undefined { return this.sessions.find((x) => x.id === id) }

  create(notify = true): ChatSession {
    const s: ChatSession = { id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, title: 'New session', createdAt: Date.now(), history: [] }
    this.sessions.unshift(s)
    this.activeId = s.id
    this.persist()
    if (notify) this._onDidChange.fire()
    return s
  }

  setActive(id: string): void {
    if (this.sessions.some((s) => s.id === id)) {
      this.activeId = id
      this.persist()
      this._onDidChange.fire()
    }
  }

  rename(id: string, title: string): void {
    const s = this.get(id)
    if (s) { s.title = title; this.persist(); this._onDidChange.fire() }
  }

  remove(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id)
    if (this.activeId === id) this.activeId = this.sessions[0]?.id ?? null
    if (!this.sessions.length) this.create(false)
    this.persist()
    this._onDidChange.fire()
  }

  touch(): void { this.persist(); this._onDidChange.fire() }

  private persist(): void {
    void this.context.workspaceState.update('cybercoder.sessions', this.sessions.slice(0, 50))
    void this.context.workspaceState.update('cybercoder.activeSession', this.activeId)
  }

  ago(ts: number): string {
    const d = Math.floor((Date.now() - ts) / 86400000)
    if (d <= 0) return 'today'
    if (d === 1) return '1d'
    return `${d}d`
  }
}
