import * as vscode from 'vscode'
import { CyberCoderApi } from './api.js'
import { Engine } from './engine.js'

/**
 * Autonomous bug detection for the CyberCoder extension.
 *
 * Two layers, both real:
 *  1. Static layer — collects VS Code's own diagnostics (from every installed
 *     language server / linter: TS, ESLint, Pylance, etc.) across the workspace.
 *     This is real, compiler-grade signal with zero AI cost.
 *  2. AI layer — sends the offending files + diagnostics to the model and asks
 *     for root-cause analysis and concrete fixes (returned as fenced code blocks
 *     so they can be applied). The model also looks for bugs the linters miss
 *     (logic errors, race conditions, security issues).
 *
 * Results are published to a dedicated DiagnosticCollection so they show up in
 * the Problems panel and as squiggles, exactly like a native linter.
 */
export class BugScanner {
  private diag: vscode.DiagnosticCollection
  private engine: Engine

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly api: CyberCoderApi,
  ) {
    this.diag = vscode.languages.createDiagnosticCollection('cybercoder')
    this.engine = new Engine(api)
    context.subscriptions.push(this.diag)
  }

  /** Collect VS Code diagnostics for a single document (or the whole workspace). */
  private collectDiagnostics(uri?: vscode.Uri): Array<{ file: string; items: vscode.Diagnostic[] }> {
    const all = uri
      ? ([[uri, vscode.languages.getDiagnostics(uri)]] as [vscode.Uri, vscode.Diagnostic[]][])
      : vscode.languages.getDiagnostics()
    const out: Array<{ file: string; items: vscode.Diagnostic[] }> = []
    for (const [u, items] of all) {
      const real = items.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error || d.severity === vscode.DiagnosticSeverity.Warning,
      )
      if (real.length) out.push({ file: u.fsPath, items: real })
    }
    return out
  }

  private fmtDiag(d: vscode.Diagnostic): string {
    const sev = d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning'
    return `  - [${sev}] line ${d.range.start.line + 1}: ${d.message}${d.source ? ` (${d.source})` : ''}`
  }

  /**
   * Scan the active file (or workspace) for bugs. Returns a markdown report and
   * streams progress to the provided sink (the chat view) when given.
   */
  async scan(
    opts: { scope: 'file' | 'workspace'; onChunk?: (t: string) => void; signal?: AbortSignal },
  ): Promise<string> {
    if (!(await this.engine.isReady())) {
      throw new Error('Connect a provider or sign in to run an AI bug scan.')
    }

    const editor = vscode.window.activeTextEditor
    const targetUri = opts.scope === 'file' ? editor?.document.uri : undefined
    if (opts.scope === 'file' && !targetUri) throw new Error('Open a file to scan.')

    const diagnostics = this.collectDiagnostics(targetUri)

    // Build the context: offending files (trimmed) + their diagnostics. If there
    // are no linter diagnostics, still run an AI review of the active file.
    const parts: string[] = []
    let filesIncluded = 0
    const MAX_FILES = opts.scope === 'file' ? 1 : 8

    if (diagnostics.length) {
      for (const { file, items } of diagnostics.slice(0, MAX_FILES)) {
        try {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file))
          const rel = vscode.workspace.asRelativePath(file)
          parts.push(
            `### File: ${rel} (${doc.languageId})\nReported problems:\n${items.map((d) => this.fmtDiag(d)).join('\n')}\n\n\`\`\`${doc.languageId}\n${doc.getText().slice(0, 6000)}\n\`\`\``,
          )
          filesIncluded++
        } catch {
          /* skip unreadable file */
        }
      }
    } else if (editor) {
      const doc = editor.document
      const rel = vscode.workspace.asRelativePath(doc.uri)
      parts.push(`### File: ${rel} (${doc.languageId})\nNo linter problems reported — perform a deep review for logic, security, and edge-case bugs.\n\n\`\`\`${doc.languageId}\n${doc.getText().slice(0, 7000)}\n\`\`\``)
      filesIncluded++
    }

    if (!filesIncluded) {
      return 'No files to scan. Open a file or a folder with linter diagnostics.'
    }

    const system =
      'You are CyberCoder running an autonomous bug-detection pass. For each file: (1) confirm or dismiss each reported problem with a one-line reason, (2) find additional bugs the linter missed — logic errors, null/undefined, race conditions, resource leaks, injection/security issues, off-by-one, and incorrect error handling, (3) for each real bug, give a concrete fix as a fenced code block with the file path on the line above it. Rank issues by severity (Critical → High → Medium → Low). Be precise; do not invent problems.'

    const userMsg = `Autonomously detect and fix bugs in the following ${filesIncluded} file(s). Scope: ${opts.scope}.\n\n${parts.join('\n\n')}`

    let full = ''
    for await (const chunk of this.engine.stream(
      { messages: [{ role: 'user', content: userMsg }], model: 'auto', temperature: 0.2, system },
      opts.signal,
    )) {
      full += chunk
      opts.onChunk?.(chunk)
    }

    // Surface the linter diagnostics we used into our own collection so they're
    // visible in the Problems panel attributed to CyberCoder.
    this.publish(diagnostics)
    return full
  }

  private publish(diagnostics: Array<{ file: string; items: vscode.Diagnostic[] }>): void {
    this.diag.clear()
    for (const { file, items } of diagnostics) {
      this.diag.set(
        vscode.Uri.file(file),
        items.map((d) => {
          const nd = new vscode.Diagnostic(d.range, `[CyberCoder] ${d.message}`, d.severity)
          nd.source = 'CyberCoder'
          return nd
        }),
      )
    }
  }
}
