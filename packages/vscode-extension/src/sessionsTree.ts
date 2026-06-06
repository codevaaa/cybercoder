import * as vscode from 'vscode'
import { SessionStore } from './sessionStore.js'

/** A session row in the activity-bar tree. */
class SessionItem extends vscode.TreeItem {
  constructor(id: string, label: string, ago: string, active: boolean) {
    super(label, vscode.TreeItemCollapsibleState.None)
    this.id = id
    this.description = ago
    this.contextValue = 'cybercoderSession'
    this.iconPath = new vscode.ThemeIcon(active ? 'comment-discussion' : 'comment')
    this.tooltip = label
    this.command = { command: 'cybercoder.openSession', title: 'Open', arguments: [id] }
  }
}

/**
 * Sessions list shown in the CyberCoder activity-bar container — like Claude
 * Code's left "sessions" rail. Clicking a session opens the wide chat panel.
 */
export class SessionsTreeProvider implements vscode.TreeDataProvider<SessionItem> {
  private readonly _onDidChange = new vscode.EventEmitter<void>()
  readonly onDidChangeTreeData = this._onDidChange.event

  constructor(private readonly store: SessionStore) {
    store.onDidChange(() => this._onDidChange.fire())
  }

  getTreeItem(el: SessionItem): vscode.TreeItem { return el }

  getChildren(): SessionItem[] {
    const active = this.store.getActiveId()
    return this.store.list().map((s) => new SessionItem(s.id, s.title, this.store.ago(s.createdAt), s.id === active))
  }
}
