import * as vscode from 'vscode'
import { CyberCoderApi } from './api.js'
import { SessionStore } from './sessionStore.js'
import { SessionsTreeProvider } from './sessionsTree.js'
import { ChatPanel } from './chatPanel.js'
import { BugScanner } from './bugScanner.js'

let api: CyberCoderApi
let store: SessionStore
let scanner: BugScanner
let statusBar: vscode.StatusBarItem

export function activate(context: vscode.ExtensionContext): void {
  api = new CyberCoderApi(context)
  store = new SessionStore(context)
  scanner = new BugScanner(context, api)

  // Sessions rail in the activity bar (like Claude Code's left rail).
  const tree = new SessionsTreeProvider(store)
  context.subscriptions.push(vscode.window.registerTreeDataProvider('cybercoder.sessions', tree))

  // Status bar entry.
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  statusBar.text = '$(sparkle) CyberCoder'
  statusBar.tooltip = 'Open CyberCoder chat'
  statusBar.command = 'cybercoder.openChat'
  statusBar.show()
  context.subscriptions.push(statusBar)

  const panel = () => ChatPanel.show(context, api, store, scanner)
  const register = (id: string, fn: (...a: any[]) => any) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, fn))

  register('cybercoder.openChat', () => panel())
  register('cybercoder.newChat', () => { store.create(true); panel().newSession() })
  register('cybercoder.openSession', (id: string) => panel().openSession(id))
  register('cybercoder.renameSession', async (item: any) => {
    const id = item?.id || store.getActiveId()
    if (!id) return
    const t = await vscode.window.showInputBox({ prompt: 'Rename session', value: store.get(id)?.title })
    if (t) store.rename(id, t)
  })
  register('cybercoder.deleteSession', (item: any) => { const id = item?.id || store.getActiveId(); if (id) store.remove(id) })
  register('cybercoder.signIn', () => signIn())
  register('cybercoder.signOut', () => signOut())
  register('cybercoder.connectProvider', () => connectProvider())
  register('cybercoder.selectModel', () => selectModel())
  register('cybercoder.scanFile', () => panel().runBugScan('file'))
  register('cybercoder.scanWorkspace', () => panel().runBugScan('workspace'))

  register('cybercoder.explainSelection', () => withSelection((code, lang) =>
    panel().sendPrompt(`Explain the following ${lang} code in detail:\n\n\`\`\`${lang}\n${code}\n\`\`\``)))
  register('cybercoder.refactorSelection', () => withSelection((code, lang) =>
    panel().sendPrompt(`Refactor this ${lang} code for readability and performance. Return the full replacement in a single code block, then explain the changes:\n\n\`\`\`${lang}\n${code}\n\`\`\``)))
  register('cybercoder.fixSelection', () => withSelection((code, lang) =>
    panel().sendPrompt(`Find and fix bugs in this ${lang} code. Return the corrected code in a single code block:\n\n\`\`\`${lang}\n${code}\n\`\`\``)))
  register('cybercoder.generateTests', () => withSelection((code, lang) =>
    panel().sendPrompt(`Write thorough unit tests for this ${lang} code:\n\n\`\`\`${lang}\n${code}\n\`\`\``)))
  register('cybercoder.addToChat', () => withSelection((code, lang) =>
    panel().addContext('selection', `\`\`\`${lang}\n${code}\n\`\`\``)))

  void updateStatus()
}

export function deactivate(): void { statusBar?.dispose() }

function withSelection(fn: (code: string, lang: string) => void): void {
  const ed = vscode.window.activeTextEditor
  if (!ed || ed.selection.isEmpty) { void vscode.window.showWarningMessage('Select some code first.'); return }
  fn(ed.document.getText(ed.selection), ed.document.languageId)
}

async function signIn(): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: 'Paste your Codeva API key (web app → Code tab → API Access Keys)',
    password: true, ignoreFocusOut: true, placeHolder: 'sk_cyber_...',
    validateInput: (v) => (v && v.trim().length > 8 ? null : 'Enter a valid API key'),
  })
  if (!key) { void vscode.env.openExternal(vscode.Uri.parse('https://cybermindcli.info/settings/api-keys')); return }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Verifying API key…' },
    async () => {
      try {
        const auth = await api.authenticate(key.trim())
        void vscode.window.showInformationMessage(`CyberCoder: signed in${auth.user?.email ? ` as ${auth.user.email}` : ''} (${auth.user?.plan || 'free'} plan).`)
      } catch (err) {
        await api.clear()
        void vscode.window.showErrorMessage(`Sign in failed: ${(err as Error).message}`)
      }
    },
  )
  await updateStatus()
}

/** Connect a provider by storing its key. We scan the key shape before saving. */
async function connectProvider(): Promise<void> {
  const provider = await vscode.window.showQuickPick(
    [
      { label: 'Anthropic (Claude)', detail: 'Direct Claude models — key starts with sk-ant-', id: 'anthropic', pfx: 'sk-ant-' },
      { label: 'OpenAI (GPT)', detail: 'Direct GPT models — key starts with sk-', id: 'openai', pfx: 'sk-' },
      { label: 'Groq (free, fast)', detail: 'Llama 3.3 70B & more — key starts with gsk_', id: 'groq', pfx: 'gsk_' },
      { label: 'Google Gemini', detail: 'Gemini 2.0 Flash & Pro — key starts with AIza', id: 'gemini', pfx: 'AIza' },
      { label: 'Ollama (local / cloud)', detail: 'Run local or cloud models like gemma4:31b-cloud — no key', id: 'ollama', pfx: '' },
    ],
    { placeHolder: 'Connect a provider (BYOK — talks directly to the provider, no backend needed)' },
  )
  if (!provider) return

  if (provider.id === 'ollama') {
    const host = await vscode.window.showInputBox({ prompt: 'Ollama host', value: 'http://localhost:11434', ignoreFocusOut: true })
    if (host) {
      await api.setProviderKey('ollama_host', host.trim())
      void vscode.window.showInformationMessage('Ollama connected. Local + cloud models (e.g. gemma4:31b-cloud) are available. Pick one via "Select Model".')
    }
    await updateStatus()
    return
  }

  const key = await vscode.window.showInputBox({
    prompt: `Paste your ${provider.label} API key`, password: true, ignoreFocusOut: true, placeHolder: `${provider.pfx}...`,
  })
  if (!key) return

  if (provider.pfx && !key.startsWith(provider.pfx)) {
    const proceed = await vscode.window.showWarningMessage(`That doesn't look like a ${provider.label} key (expected ${provider.pfx}…). Save anyway?`, 'Save', 'Cancel')
    if (proceed !== 'Save') return
  }
  await api.setProviderKey(provider.id, key.trim())
  void vscode.window.showInformationMessage(`${provider.label} connected. CyberCoder will stream directly from it.`)
  await updateStatus()
}

async function signOut(): Promise<void> {
  await api.clear()
  void vscode.window.showInformationMessage('CyberCoder: signed out.')
  await updateStatus()
}

const PROVIDER_MODELS = [
  'auto',
  'anthropic/claude-3-5-sonnet-20241022', 'anthropic/claude-3-5-haiku-20241022',
  'openai/gpt-4o', 'openai/gpt-4o-mini',
  'groq/llama-3.3-70b-versatile', 'groq/llama-3.1-8b-instant',
  'gemini/gemini-2.0-flash', 'gemini/gemini-2.5-pro',
  'ollama/gemma4:31b-cloud', 'ollama/llama3.3:70b-cloud', 'ollama/qwen2.5-coder:32b', 'ollama/llama3.2',
]
async function selectModel(): Promise<void> {
  let models = [...PROVIDER_MODELS]
  try {
    const res = await api.getModels()
    const ids = (res.models || []).map((m: any) => m.id || m.name).filter(Boolean)
    if (ids.length) models = ['auto', ...ids, ...PROVIDER_MODELS.slice(1)]
  } catch { /* offline — use provider list */ }
  const pick = await vscode.window.showQuickPick([...new Set(models)], { placeHolder: 'Select default model (provider/model)' })
  if (pick) {
    await vscode.workspace.getConfiguration('cybercoder').update('defaultModel', pick, vscode.ConfigurationTarget.Global)
    void vscode.window.showInformationMessage(`CyberCoder model: ${pick}`)
  }
}

async function updateStatus(): Promise<void> {
  const ready = await api.isSignedIn()
  statusBar.text = ready ? '$(sparkle) CyberCoder' : '$(sparkle) CyberCoder: Connect'
}
