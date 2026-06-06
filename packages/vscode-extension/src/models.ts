/**
 * Model catalog for the extension's picker — grouped by provider, mirroring the
 * website's model lineup. Codeva models use the Codeva names (Bheem, Madhav,
 * Arjun, Chanakya, …) and route through the Codeva cloud gateway. BYOK providers
 * (Anthropic/OpenAI/Groq/Gemini) and Ollama (local + cloud) are listed too.
 */

export interface ModelEntry {
  id: string // engine id, e.g. "codeva/madhav" or "groq/llama-3.3-70b-versatile"
  label: string
  detail: string
}

export interface ModelGroup {
  group: string
  models: ModelEntry[]
}

export const MODEL_GROUPS: ModelGroup[] = [
  {
    group: 'Codeva (subscription / API key)',
    models: [
      { id: 'auto', label: 'Auto (recommended)', detail: 'Routes to the best available model for the task' },
      { id: 'codeva/madhav', label: 'Madhav', detail: 'Supreme intelligence — deep reasoning & creative mastery' },
      { id: 'codeva/codeva', label: 'Codeva', detail: 'Flagship — reasoning, security analysis, technical ops' },
      { id: 'codeva/chanakya', label: 'Chanakya', detail: 'Chain-of-thought reasoning for multi-step problems' },
      { id: 'codeva/bheem', label: 'Bheem', detail: 'Reliable powerhouse — versatile everyday intelligence' },
      { id: 'codeva/arjun', label: 'Arjun', detail: 'Swift & precise — blazing fast lightweight responses' },
      { id: 'codeva/vishwakarma', label: 'Vishwakarma', detail: 'Code specialist — trained on millions of repos' },
      { id: 'codeva/panchayat', label: 'Panchayat (Council)', detail: 'Multi-model consensus — best answer from many minds' },
    ],
  },
  {
    group: 'Anthropic (BYOK)',
    models: [
      { id: 'anthropic/claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', detail: 'Best for everyday coding' },
      { id: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', detail: 'Fastest for quick answers' },
    ],
  },
  {
    group: 'OpenAI (BYOK)',
    models: [
      { id: 'openai/gpt-4o', label: 'GPT-4o', detail: 'Flagship multimodal' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', detail: 'Fast & cheap' },
    ],
  },
  {
    group: 'Groq (free, fast)',
    models: [
      { id: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B', detail: 'Free, very fast, strong general model' },
      { id: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B', detail: 'Free, sub-second responses' },
    ],
  },
  {
    group: 'Google Gemini (BYOK)',
    models: [
      { id: 'gemini/gemini-2.0-flash', label: 'Gemini 2.0 Flash', detail: 'Fast, huge context' },
      { id: 'gemini/gemini-2.5-pro', label: 'Gemini 2.5 Pro', detail: 'Deep reasoning' },
    ],
  },
  {
    group: 'Ollama Cloud (no local GPU)',
    models: [
      { id: 'ollama/kimi-k2.5:cloud', label: 'Kimi K2.5 (cloud)', detail: 'Moonshot AI reasoning' },
      { id: 'ollama/glm-5:cloud', label: 'GLM-5 (cloud)', detail: 'Zhipu GLM-5' },
      { id: 'ollama/minimax-m2.7:cloud', label: 'MiniMax M2.7 (cloud)', detail: 'Coding & agentic' },
      { id: 'ollama/qwen3.5:cloud', label: 'Qwen 3.5 (cloud)', detail: 'Alibaba Qwen 3.5' },
      { id: 'ollama/gemma4:31b-cloud', label: 'Gemma 4 31B (cloud)', detail: 'Google Gemma 4' },
      { id: 'ollama/glm-4.7-flash', label: 'GLM-4.7 Flash', detail: 'Zhipu fast' },
    ],
  },
  {
    group: 'Ollama Local',
    models: [
      { id: 'ollama/llama3.2', label: 'Llama 3.2 (local)', detail: 'Runs on your machine' },
      { id: 'ollama/qwen2.5-coder:32b', label: 'Qwen2.5 Coder 32B (local)', detail: 'Local code model' },
    ],
  },
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
