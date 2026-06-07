import * as vscode from 'vscode'

export class CyberCoderCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>()
  public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event

  // Store active diffs (we could track these from chatPanel.ts)
  private activeDiffs = new Map<string, vscode.Range[]>()

  public registerDiff(uri: vscode.Uri, range: vscode.Range) {
    const key = uri.toString()
    const ranges = this.activeDiffs.get(key) || []
    ranges.push(range)
    this.activeDiffs.set(key, ranges)
    this.onDidChangeCodeLensesEmitter.fire()
  }

  public clearDiffs(uri: vscode.Uri) {
    this.activeDiffs.delete(uri.toString())
    this.onDidChangeCodeLensesEmitter.fire()
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | null {
    const ranges = this.activeDiffs.get(document.uri.toString())
    if (!ranges || ranges.length === 0) return null

    const lenses: vscode.CodeLens[] = []
    for (const range of ranges) {
      lenses.push(new vscode.CodeLens(range, {
        title: '$(check) Accept Edit',
        command: 'cybercoder.acceptEdit',
        arguments: [document.uri, range]
      }))
      lenses.push(new vscode.CodeLens(range, {
        title: '$(close) Reject Edit',
        command: 'cybercoder.rejectEdit',
        arguments: [document.uri, range]
      }))
    }
    return lenses
  }
}
