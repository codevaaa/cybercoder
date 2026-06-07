/**
 * Model catalog for the extension's picker.
 * Exclusively exposes the 4 Codeva Mythological Swarm Personas.
 * Everything routes through the unified CyberCoder Cloud Gateway.
 */

export interface ModelEntry {
  id: string // engine id
  label: string
  detail: string
}

export interface ModelGroup {
  group: string
  models: ModelEntry[]
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    group: 'Codeva Mythological Swarm',
    models: [
      { id: 'auto', label: 'Auto (recommended)', detail: 'Routes to the best available persona for the task' },
      { id: 'madhav', label: 'Madhav (Pro - Strategic Mastermind)', detail: 'Deep codebase understanding, complex architecture planning' },
      { id: 'kali', label: 'Kali (Standard - Destroyer of Bugs)', detail: 'Relentless debugging, finding edge-case vulnerabilities' },
      { id: 'abhimanyu', label: 'Abhimanyu (Basic - Deep Context)', detail: 'Deep-dive local reasoning for breaking complex logic traps' },
      { id: 'trinity', label: 'Trinity (Free - The Powerhouse)', detail: 'Fast, logic-perfect execution for free tier users' },
    ],
  }
]

/** Flat QuickPick items with group separators. */
export function pickerItems(): Array<{ label: string; description?: string; detail?: string; id?: string; kind?: number }> {
  const items: Array<{ label: string; description?: string; detail?: string; id?: string; kind?: number }> = []
  for (const g of MODEL_GROUPS) {
    items.push({ label: g.group, kind: -1 /* Separator */ })
    for (const m of g.models) items.push({ label: m.label, description: m.id, detail: m.detail, id: m.id })
  }
  return items
}
