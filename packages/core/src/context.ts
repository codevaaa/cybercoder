import type { ProviderMessage } from '@cybermind/providers';

/**
 * Token-budget & context-window engineering for the agent loop.
 *
 * Free providers ship small context windows (8k–32k) and charge for every
 * re-sent token, so disciplined context management is the single biggest
 * lever on quality and cost. This module provides:
 *
 *   - estimateTokens()      cheap heuristic token counter (no tokenizer dep)
 *   - trimToolOutput()      cap a single tool result before it enters context
 *   - manageContext()       drop/summarise old turns when nearing the budget
 *
 * The design mirrors how Claude Code keeps its working context tight: recent
 * turns are kept verbatim, older turns are collapsed into a compact synopsis,
 * and bulky tool outputs are truncated with a clear marker.
 */

/** Rough token estimate: ~4 chars/token for English+code. Fast, dependency-free. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Sum estimated tokens across a message list (incl. tool-call payloads). */
export function estimateMessagesTokens(messages: ProviderMessage[]): number {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content);
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        total += estimateTokens(tc.name) + estimateTokens(JSON.stringify(tc.input));
      }
    }
  }
  return total;
}

export interface TrimOptions {
  /** Max characters to keep from a single tool output. Default 12k (~3k tokens). */
  maxChars?: number;
  /** Keep this many chars from the head and tail when truncating the middle. */
  headTail?: number;
}

/**
 * Cap a single tool result. For large outputs we keep the head and tail (the
 * most information-dense parts of file reads, command output, and grep hits)
 * and elide the middle with a clear, model-readable marker.
 */
export function trimToolOutput(output: string, opts: TrimOptions = {}): string {
  const maxChars = opts.maxChars ?? 12_000;
  if (output.length <= maxChars) return output;

  const headTail = opts.headTail ?? Math.floor(maxChars / 2) - 40;
  const head = output.slice(0, headTail);
  const tail = output.slice(output.length - headTail);
  const elided = output.length - head.length - tail.length;
  return `${head}\n\n… [${elided} chars elided to save context — re-read with offset/limit if you need the middle] …\n\n${tail}`;
}

export interface ContextBudget {
  /** Total model context window in tokens. */
  windowTokens: number;
  /** Fraction of the window we allow history to occupy before compacting. */
  highWater?: number;
  /** Always keep at least this many of the most recent messages verbatim. */
  keepRecent?: number;
}

export interface ManagedContext {
  messages: ProviderMessage[];
  /** True if we dropped/condensed anything. */
  compacted: boolean;
  /** Estimated tokens after management. */
  tokens: number;
  /** Human-readable note describing what happened (for telemetry/UI). */
  note?: string;
}

/**
 * Keep the working context under budget. When estimated history exceeds
 * `windowTokens * highWater`, collapse the oldest messages (beyond the recent
 * window) into a single synopsis system message, preserving tool-call integrity
 * by never splitting an assistant tool-call from its tool result.
 *
 * This is a *structural* compaction (no LLM call) so it is instant and free;
 * the LLM-based `/compact` remains available for semantic summaries.
 */
export function manageContext(
  messages: ProviderMessage[],
  budget: ContextBudget,
): ManagedContext {
  const highWater = budget.highWater ?? 0.75;
  const keepRecent = budget.keepRecent ?? 6;
  const limit = Math.floor(budget.windowTokens * highWater);

  const tokens = estimateMessagesTokens(messages);
  if (tokens <= limit || messages.length <= keepRecent + 1) {
    return { messages, compacted: false, tokens };
  }

  // Split into "old" (to condense) and "recent" (keep verbatim).
  const splitAt = messages.length - keepRecent;
  const old = messages.slice(0, splitAt);
  let recent = messages.slice(splitAt);

  // Never let `recent` begin with an orphaned tool result whose assistant
  // tool-call lives in `old` — pull the boundary back if needed.
  while (recent.length && recent[0]!.role === 'tool') {
    recent = recent.slice(1);
  }

  const synopsis = condense(old);
  const synopsisMsg: ProviderMessage = {
    role: 'system',
    content: synopsis,
  };

  const next = [synopsisMsg, ...recent];
  return {
    messages: next,
    compacted: true,
    tokens: estimateMessagesTokens(next),
    note: `context auto-compacted: ${old.length} older turns → synopsis (${tokens} → ~${estimateMessagesTokens(next)} tok)`,
  };
}

/**
 * Build a compact, structural synopsis of older messages without an LLM call.
 * Captures the gist: what the user asked, what files/commands the assistant
 * touched, and the last assistant conclusion.
 */
function condense(old: ProviderMessage[]): string {
  const userAsks: string[] = [];
  const toolActions: string[] = [];
  let lastAssistant = '';

  for (const m of old) {
    if (m.role === 'user') {
      const oneLine = m.content.replace(/\s+/g, ' ').trim().slice(0, 160);
      if (oneLine) userAsks.push(oneLine);
    } else if (m.role === 'assistant') {
      if (m.content.trim()) lastAssistant = m.content.replace(/\s+/g, ' ').trim().slice(0, 240);
      for (const tc of m.toolCalls ?? []) {
        const target =
          (tc.input.path as string) ||
          (tc.input.command as string) ||
          (tc.input.pattern as string) ||
          '';
        toolActions.push(`${tc.name}(${String(target).slice(0, 60)})`);
      }
    }
  }

  const parts = ['[Earlier conversation compacted to save context]'];
  if (userAsks.length) parts.push(`Goals: ${userAsks.slice(-4).join(' | ')}`);
  if (toolActions.length) {
    const uniq = Array.from(new Set(toolActions)).slice(-12);
    parts.push(`Actions taken: ${uniq.join(', ')}`);
  }
  if (lastAssistant) parts.push(`Last note: ${lastAssistant}`);
  return parts.join('\n');
}

/** Known context windows for model families. Used to pick a sane budget. */
export function windowForModel(model: string): number {
  const m = model.toLowerCase();
  if (m.includes('gpt-4o') || m.includes('claude') || m.includes('gemini-1.5') || m.includes('gemini-2')) return 128_000;
  if (m.includes('llama-3.1') || m.includes('llama-3.3')) return 128_000;
  if (m.includes('mixtral') || m.includes('mistral')) return 32_000;
  if (m.includes('gemma')) return 8_192;
  // Conservative default for unknown / small free models.
  return 16_000;
}
