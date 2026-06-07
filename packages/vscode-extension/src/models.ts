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
      { id: 'codeva-madhav-v1', label: 'Madhav (Strategic Mastermind)', detail: 'Deep codebase understanding, complex architecture planning' },
      { id: 'codeva-kali-v1', label: 'Kali (Destroyer of Bugs)', detail: 'Relentless debugging, finding edge-case vulnerabilities' },
      { id: 'codeva-arjun-v1', label: 'Arjun (Precision Archer)', detail: 'Lightning fast UI generation, quick inline edits' },
      { id: 'codeva-abhimanyu-v1', label: 'Abhimanyu (Fearless Breaker)', detail: 'Fast, deep-dive local reasoning for breaking complex logic traps' },
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
