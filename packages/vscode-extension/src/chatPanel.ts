import * as vscode from 'vscode'
import { CyberCoderApi } from './api.js'
import { SessionStore } from './sessionStore.js'
import { getChatHtml } from './webview/html.js'
import type { BugScanner } from './bugScanner.js'
import { Engine } from './engine.js'
import { Agent } from './agent.js'
import { CliBridge } from './cli-bridge.js'
import type { Mode } from './tools.js'

interface WebviewMessage { type: string; [k: string]: unknown }

const MODE_SYSTEM: Record<string, string> = {
  ask: 'Before applying any file edit, describe the change and ask for approval.',
  edit: 'When asked to change code, return the full replacement in a single fenced code block ready to apply.',
  plan: 'First explore the code and present a clear, ordered plan before writing any code. Do not edit yet.',
  auto: 'Automatically pick the safest useful action. Run low-risk steps; flag risky ones.',
  bypass: 'Proceed without asking for approval unless an action is clearly destructive.',
}

/**
 * Wide chat panel that lives in the EDITOR area (like Claude Code's "Claude Code"
 * tab), not the narrow sidebar. The sessions rail stays in the activity bar.
 * Singleton panel; reveals if already open.
 */
export class ChatPanel {
  private static current: ChatPanel | undefined
  private panel: vscode.WebviewPanel
  private abort?: AbortController
  private mode: string
  private effort = 2
  private thinking = false
  private disposables: vscode.Disposable[] = []
  private engine: Engine
  private agent: Agent
  private cliBridge: CliBridge

  static show(
    context: vscode.ExtensionContext,
    api: CyberCoderApi,
    store: SessionStore,
    scanner: BugScanner,
  ): ChatPanel {
    if (ChatPanel.current) {
      ChatPanel.current.panel.reveal(vscode.ViewColumn.Active)
      return ChatPanel.current
    }
    const panel = vscode.window.createWebviewPanel(
      'cybercoder.chat',
      'CyberCoder',
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [context.extensionUri] },
    )
    ChatPanel.current = new ChatPanel(panel, context, api, store, scanner)
    return ChatPanel.current
  }

  static get instance(): ChatPanel | undefined { return ChatPanel.current }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly api: CyberCoderApi,
    private readonly store: SessionStore,
    private readonly scanner: BugScanner,
  ) {
    this.panel = panel
    this.mode = context.globalState.get<string>('cybercoder.mode', 'ask')
    this.engine = new Engine(api)
    this.agent = new Agent(api)
    this.cliBridge = new CliBridge(context.extensionPath)
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png')
    panel.webview.html = getChatHtml(panel.webview, context.extensionUri)
    panel.webview.onDidReceiveMessage((m: WebviewMessage) => this.onMessage(m), null, this.disposables)
    panel.onDidDispose(() => this.dispose(), null, this.disposables)
    this.store.onDidChange(() => this.pushSessions(), null, this.disposables)
    // Start CLI bridge in background (non-blocking)
    void this.initCliBridge()
    void this.pushAuthState()
  }

  reveal(): void { this.panel.reveal(vscode.ViewColumn.Active) }

  notifyModel(model: string): void { this.post({ type: 'modelChanged', model }) }

  openSession(id: string): void {
    this.store.setActive(id)
    this.reveal()
    this.renderActive()
  }

  newSession(): void {
    this.store.create(true)
    this.post({ type: 'cleared' })
  }

  async runBugScan(scope: 'file' | 'workspace'): Promise<void> {
    this.reveal()
    if (!(await this.engine.isReady())) {
      this.post({ type: 'authState', signedIn: false, plan: 'free' })
      void vscode.window.showWarningMessage('Connect a provider or sign in to run a bug scan.')
      return
    }
    const s = this.store.active()
    const label = scope === 'file' ? 'this file' : 'the workspace'
    this.post({ type: 'userMessage', text: `🐞 Autonomously scan ${label} for bugs and propose fixes` })
    this.post({ type: 'assistantStart' })
    this.abort = new AbortController()
    try {
      const report = await this.scanner.scan({ scope, signal: this.abort.signal, onChunk: (t) => this.post({ type: 'assistantChunk', text: t }) })
      s.history.push({ role: 'user', content: `Bug scan: ${label}` })
      s.history.push({ role: 'assistant', content: report })
      this.store.touch()
      this.post({ type: 'assistantDone' })
    } catch (err) {
      if (this.abort?.signal.aborted) this.post({ type: 'assistantDone', stopped: true })
      else this.post({ type: 'error', message: (err as Error).message })
    } finally { this.abort = undefined }
  }

  async addContext(label: string, content: string): Promise<void> {
    this.reveal()
    this.store.active().history.push({ role: 'user', content: `[${label}]\n${content}` })
    this.store.touch()
    this.post({ type: 'addContext', label })
  }

  async sendPrompt(prompt: string): Promise<void> {
    this.reveal()
    await this.handleUserMessage(prompt)
  }

  // ── internals ──
  private post(msg: WebviewMessage): void { void this.panel.webview.postMessage(msg) }

  private renderActive(): void {
    const s = this.store.active()
    this.post({ type: 'cleared' })
    for (const m of s.history) {
      if (m.role === 'user') this.post({ type: 'userMessage', text: m.content })
      else { this.post({ type: 'assistantStart' }); this.post({ type: 'assistantChunk', text: m.content }); this.post({ type: 'assistantDone' }) }
    }
    this.pushSessions()
  }

  private pushSessions(): void {
    this.post({
      type: 'sessions',
      activeId: this.store.getActiveId(),
      sessions: this.store.list().map((s) => ({ id: s.id, title: s.title, ago: this.store.ago(s.createdAt) })),
    })
  }

  private async pushAuthState(): Promise<void> {
    const signedIn = await this.engine.isReady()
    let plan = 'free'
    if (await this.api.isSignedIn()) { try { plan = (await this.api.authenticate()).user?.plan || 'free' } catch { /* ignore */ } }
    else if (signedIn) { plan = 'byok' }
    const version = (this.context.extension?.packageJSON?.version as string) || '0.1.0'
    this.post({
      type: 'authState', signedIn, plan, version,
      cliBridge: this.cliBridge.isRunning(),
      sessions: this.store.list().map((s) => ({ id: s.id, title: s.title, ago: this.store.ago(s.createdAt) })),
    })
  }

  /** Initialize CLI bridge — spawn the bundled binary for local tool execution. */
  private async initCliBridge(): Promise<void> {
    if (!this.cliBridge.hasBundledCli()) {
      console.log('[CyberCoder] No bundled CLI binary found, running in API-only mode.')
      return
    }
    try {
      const started = await this.cliBridge.start()
      if (started) {
        console.log('[CyberCoder] CLI bridge started successfully.')
        this.post({ type: 'cliBridgeStatus', active: true })
        // Wire CLI events to the webview
        this.cliBridge.on('token', (data: unknown) => {
          const d = data as { text?: string }
          if (d.text) this.post({ type: 'assistantChunk', text: d.text })
        })
        this.cliBridge.on('tool_start', (data: unknown) => {
          const d = data as { name?: string; summary?: string }
          this.post({ type: 'toolStart', name: d.name, summary: d.summary || d.name })
        })
        this.cliBridge.on('tool_end', (data: unknown) => {
          const d = data as { name?: string; ok?: boolean; output?: string }
          this.post({ type: 'toolEnd', name: d.name, ok: d.ok ?? true, output: d.output })
        })
        this.cliBridge.on('tool_output', (data: unknown) => {
          const d = data as { text?: string }
          if (d.text) this.post({ type: 'toolOutput', text: d.text })
        })
        this.cliBridge.on('done', () => {
          this.post({ type: 'assistantDone' })
        })
        this.cliBridge.on('error', (data: unknown) => {
          const d = data as { message?: string }
          this.post({ type: 'error', message: d.message || 'CLI bridge error' })
        })
        this.cliBridge.on('diff', (data: unknown) => {
          const d = data as { file?: string; hunks?: unknown[] }
          this.post({ type: 'diff', file: d.file, hunks: d.hunks })
        })
      }
    } catch (err) {
      console.log('[CyberCoder] CLI bridge failed to start:', (err as Error).message)
    }
  }

  private async onMessage(m: WebviewMessage): Promise<void> {
    switch (m.type) {
      case 'ready': await this.pushAuthState(); this.pushSessions(); this.renderActive(); break
      case 'send': await this.handleUserMessage(String(m.text || '')); break
      case 'stop': this.abort?.abort(); break
      case 'newChat': this.newSession(); break
      case 'openSession': this.openSession(String(m.id)); break
      case 'renameSession': { const t = await vscode.window.showInputBox({ prompt: 'Rename session', value: this.store.get(String(m.id))?.title }); if (t) this.store.rename(String(m.id), t); break }
      case 'deleteSession': this.store.remove(String(m.id)); this.renderActive(); break
      case 'login': await this.login(String(m.method || 'apikey')); break
      case 'setMode': this.mode = String(m.mode || 'ask'); void this.context.globalState.update('cybercoder.mode', this.mode); break
      case 'setEffort': this.effort = Number(m.value ?? 2); this.updateEffortConfig(); break
      case 'applyEdit': await this.applyToEditor(String(m.content || '')); break
      case 'copy': await vscode.env.clipboard.writeText(String(m.content || '')); void vscode.window.showInformationMessage('Copied'); break
      case 'ctx': await this.handleCtx(String(m.action || '')); break
      case 'slash':
        if (m.action === 'scanFile') await this.runBugScan('file')
        else if (m.action === 'scanWorkspace') await this.runBugScan('workspace')
        break
      default: break
    }
  }

  private async login(method: string): Promise<void> {
    if (method === 'byok') { await vscode.commands.executeCommand('cybercoder.connectProvider'); await this.pushAuthState(); return }
    if (method === 'subscription') {
      // Guide the user: create an API key on the website, then paste it here.
      const choice = await vscode.window.showInformationMessage(
        'To use your Codeva subscription in VS Code, create an API key on the website, then paste it here.',
        'Open API Keys page', 'I have a key',
      )
      if (choice === 'Open API Keys page') void vscode.env.openExternal(vscode.Uri.parse('https://cybermindcli.info/api-keys'))
      if (choice) { await vscode.commands.executeCommand('cybercoder.signIn'); await this.pushAuthState() }
      return
    }
    // 'apikey'
    await vscode.commands.executeCommand('cybercoder.signIn')
    await this.pushAuthState()
  }

  private async handleCtx(action: string): Promise<void> {
    switch (action) {
      case 'clear': this.store.active().history = []; this.store.touch(); this.post({ type: 'cleared' }); break
      case 'model': { await vscode.commands.executeCommand('cybercoder.selectModel'); this.post({ type: 'modelChanged', model: vscode.workspace.getConfiguration('cybercoder').get<string>('defaultModel', 'auto') }); break }
      case 'thinking': this.thinking = !this.thinking; this.post({ type: 'thinkingChanged', value: this.thinking }); break
      case 'help': void vscode.env.openExternal(vscode.Uri.parse('https://cybermindcli.info/help')); break
      case 'report': void vscode.env.openExternal(vscode.Uri.parse('https://github.com/codevaaa/cybercoder/issues')); break
      case 'account': void vscode.env.openExternal(vscode.Uri.parse('https://cybermindcli.info/settings/usage')); break
      case 'mcp': void vscode.env.openExternal(vscode.Uri.parse('https://cybermindcli.info/docs/mcp-server-connections')); break
      case 'memory': void vscode.window.showInformationMessage('CyberCoder project memory lives in the .cyber/ folder of your workspace.'); break
      case 'agents': case 'hooks': void vscode.window.showInformationMessage('Configure agents/hooks via the CyberCoder CLI (cm) in your terminal.'); break
      case 'attach': await this.attachFile(); break
      case 'mention': await this.mentionFile(); break
      case 'rewind': void vscode.window.showInformationMessage('Use /rewind in the CyberCoder CLI to restore a checkpoint.'); break
      case 'terminal': {
        // Auto-install CyberCoder CLI if not present, then start it.
        const t = vscode.window.createTerminal('CyberCoder')
        t.show()
        const isWin = process.platform === 'win32'
        const installCheck = isWin
          ? 'if (-not (Get-Command cm -ErrorAction SilentlyContinue)) { Write-Host "Installing CyberCoder CLI..."; npm install -g cybercoder-cli@latest }; cm'
          : 'command -v cm >/dev/null 2>&1 || { echo "Installing CyberCoder CLI..."; npm install -g cybercoder-cli@latest; }; cm'
        t.sendText(installCheck, true)
        break
      }
      default: break
    }
  }

  private async attachFile(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({ canSelectMany: false })
    if (!uris?.length) return
    const doc = await vscode.workspace.openTextDocument(uris[0])
    await this.addContext(vscode.workspace.asRelativePath(uris[0]), `\`\`\`${doc.languageId}\n${doc.getText().slice(0, 6000)}\n\`\`\``)
  }

  private async mentionFile(): Promise<void> {
    const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,py,go,rs,java,md,json}', '**/node_modules/**', 200)
    const pick = await vscode.window.showQuickPick(files.map((f) => vscode.workspace.asRelativePath(f)), { placeHolder: 'Mention a file' })
    if (!pick) return
    const uri = files.find((f) => vscode.workspace.asRelativePath(f) === pick)
    if (!uri) return
    const doc = await vscode.workspace.openTextDocument(uri)
    await this.addContext(pick, `\`\`\`${doc.languageId}\n${doc.getText().slice(0, 6000)}\n\`\`\``)
  }

  private editorContextBlock(): string {
    if (!vscode.workspace.getConfiguration('cybercoder').get('includeOpenEditors', true)) return ''
    const ed = vscode.window.activeTextEditor
    if (!ed) return ''
    const doc = ed.document
    const sel = ed.selection
    const rel = vscode.workspace.asRelativePath(doc.uri)
    const lang = doc.languageId
    if (!sel.isEmpty) return `\n\n[Active file: ${rel} (${lang}), lines ${sel.start.line + 1}-${sel.end.line + 1}]\n\`\`\`${lang}\n${doc.getText(sel).slice(0, 4000)}\n\`\`\``
    return `\n\n[Active file: ${rel} (${lang})]\n\`\`\`${lang}\n${doc.getText().slice(0, 2000)}\n\`\`\``
  }

  private async handleUserMessage(text: string): Promise<void> {
    if (!text.trim()) return
    // If CLI bridge is running, prefer it (full local tools). Otherwise fall back to API agent.
    if (this.cliBridge.isRunning()) {
      await this.handleViaCliBridge(text)
      return
    }
    if (!(await this.engine.isReady())) { this.post({ type: 'authState', signedIn: false, plan: 'free' }); return }

    const cfg = vscode.workspace.getConfiguration('cybercoder')
    const model = cfg.get<string>('defaultModel', 'auto')
    const temperature = cfg.get<number>('temperature', 0.7)
    const s = this.store.active()
    if (s.title === 'New session') { this.store.rename(s.id, text.trim().slice(0, 40)) }

    s.history.push({ role: 'user', content: text + this.editorContextBlock() })
    this.post({ type: 'userMessage', text })
    this.post({ type: 'assistantStart' })

    this.abort = new AbortController()
    let full = ''
    try {
      const system = [
        'You are CyberCoder, an autonomous AI coding agent inside VS Code. You can read, write, and edit files, search the codebase, and run terminal commands using the provided tools. Use tools to actually accomplish the task — do not just describe what to do. Be concise. When you finish, give a short summary.',
        MODE_SYSTEM[this.mode] || '',
        this.thinking ? 'Think step by step before acting.' : '',
      ].filter(Boolean).join(' ')

      full = await this.agent.run(
        { messages: s.history, model, temperature, system, mode: this.mode as Mode },
        {
          onText: (t) => { this.post({ type: 'assistantChunk', text: t }) },
          onToolStart: (name, summary) => this.post({ type: 'toolStart', name, summary }),
          onToolEnd: (name, ok) => this.post({ type: 'toolEnd', name, ok }),
          onStatus: (t) => this.post({ type: 'status', text: t }),
        },
        {
          approve: (summary) => this.approve(summary),
          status: (t) => this.post({ type: 'status', text: t }),
          signal: this.abort.signal,
        },
      )
      s.history.push({ role: 'assistant', content: full })
      this.store.touch()
      this.post({ type: 'assistantDone' })
    } catch (err) {
      if (this.abort.signal.aborted) this.post({ type: 'assistantDone', stopped: true })
      else this.post({ type: 'error', message: (err as Error).message })
    } finally { this.abort = undefined }
  }

  /** Handle message via CLI bridge — full local agentic loop with all tools. */
  private async handleViaCliBridge(text: string): Promise<void> {
    const s = this.store.active()
    if (s.title === 'New session') { this.store.rename(s.id, text.trim().slice(0, 40)) }

    s.history.push({ role: 'user', content: text + this.editorContextBlock() })
    this.post({ type: 'userMessage', text })
    this.post({ type: 'assistantStart' })

    const cfg = vscode.workspace.getConfiguration('cybercoder')
    const model = cfg.get<string>('defaultModel', 'auto')

    try {
      const result = await this.cliBridge.call('chat', {
        message: text + this.editorContextBlock(),
        model,
        mode: this.mode,
        effort: this.effort,
        thinking: this.thinking,
        history: s.history.slice(-20), // Last 20 messages for context
      }) as { text?: string } | string

      const responseText = typeof result === 'string' ? result : (result as any)?.text || ''
      if (responseText) {
        s.history.push({ role: 'assistant', content: responseText })
        this.store.touch()
      }
      this.post({ type: 'assistantDone' })
    } catch (err) {
      this.post({ type: 'error', message: (err as Error).message })
      this.post({ type: 'assistantDone' })
    }
  }

  /** Native approval prompt used by destructive tools in ask/plan mode. */
  private async approve(summary: string): Promise<boolean> {
    const pick = await vscode.window.showWarningMessage(`CyberCoder wants to: ${summary}`, { modal: false }, 'Allow', 'Deny')
    return pick === 'Allow'
  }

  /** Map effort slider (0-4) to actual model parameters. */
  private updateEffortConfig(): void {
    const cfg = vscode.workspace.getConfiguration('cybercoder')
    // Effort: 0=Low, 1=Med-Low, 2=Medium, 3=High, 4=Max
    const tempMap = [0.2, 0.4, 0.7, 0.9, 1.0]
    const tokensMap = [1024, 2048, 4096, 8192, 16384]
    void cfg.update('temperature', tempMap[this.effort] ?? 0.7, vscode.ConfigurationTarget.Global)
    void cfg.update('maxTokens', tokensMap[this.effort] ?? 4096, vscode.ConfigurationTarget.Global)
  }

  private async applyToEditor(content: string): Promise<void> {
    const ed = vscode.window.activeTextEditor
    if (!ed) { void vscode.window.showWarningMessage('Open a file to apply the edit.'); return }
    const m = content.match(/```[\w-]*\n([\s\S]*?)```/)
    const code = m ? m[1] : content
    const sel = ed.selection
    await ed.edit((b) => {
      if (sel.isEmpty) b.replace(new vscode.Range(ed.document.positionAt(0), ed.document.positionAt(ed.document.getText().length)), code)
      else b.replace(sel, code)
    })
    void vscode.window.showInformationMessage('CyberCoder applied the edit.')
  }

  private dispose(): void {
    ChatPanel.current = undefined
    this.abort?.abort()
    this.cliBridge.stop()
    this.disposables.forEach((d) => d.dispose())
  }
}
