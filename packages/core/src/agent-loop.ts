import { createLogger } from '@cybermind/shared';
import { resolve } from 'node:path';
import {
  manageContext,
  trimToolOutput,
  windowForModel,
  type ContextBudget,
} from './context.js';
import type {
  ChatChunk,
  ChatRequest,
  LLMProvider,
  ProviderMessage,
  ProviderToolCall,
  ToolSchema,
} from '@cybermind/providers';

const log = createLogger('core:agent');

export interface AgentTool {
  schema: ToolSchema;
  /** Executor receives the parsed input and returns a string result for the model. */
  execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
  /** Mutating or externally connected tools require approval and execute sequentially. */
  destructive?: boolean;
  /**
   * Optional verifier run after a successful execute(). Return an error string
   * to signal the result is bad (triggers self-correction); return null when OK.
   * Example: the `edit` tool re-reads the file to confirm the change applied.
   */
  verify?: (input: Record<string, unknown>, output: string, ctx: ToolContext) => Promise<string | null>;
}

export interface ToolContext {
  cwd: string;
  /** Caller-provided approval gate. Throw or return false to deny. */
  approve?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
  /** Signal for stopping a long-running tool when the user cancels a task. */
  signal?: AbortSignal;
}

export interface AgentLoopOptions {
  provider: LLMProvider;
  systemPrompt?: string;
  model?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  tools?: AgentTool[];
  /** Workspace root used by tools. Defaults to the process working directory for existing CLI callers. */
  cwd?: string;
  /** Approval callback for tools that request permission before execution. */
  approve?: ToolContext['approve'];
  /** Hard cap on tool-use iterations to prevent runaway loops. */
  maxIterations?: number;
  /** Cancel the entire loop. */
  signal?: AbortSignal;
  /**
   * Context-window budget. When omitted, a budget is inferred from the model.
   * History is auto-compacted (structurally, no extra LLM call) once it nears
   * the high-water mark, and individual tool outputs are trimmed before they
   * enter the working buffer.
   */
  contextBudget?: Partial<ContextBudget>;
  /** Max characters to keep from a single tool result. Default 12k. */
  maxToolOutputChars?: number;
  /** Bounded provider retry policy. Defaults to three exponential retries. */
  retryPolicy?: Partial<ProviderRetryPolicy>;
}

export interface ProviderRetryPolicy {
  /** Retries after the initial request. */
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_POLICY: ProviderRetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown>; id: string }
  | { type: 'tool_result'; name: string; id: string; output: string; ok: boolean }
  | { type: 'usage'; inputTokens: number; outputTokens: number; estimated?: boolean; cost?: number }
  | { type: 'iteration'; index: number; max: number }
  | { type: 'context'; note: string; tokens: number }
  | { type: 'subagent_progress'; agentId: string; skill: string; status: 'started' | 'working' | 'completed' | 'failed' | 'cancelled'; message?: string }
  | { type: 'done'; reason: 'end_turn' | 'max_iterations' | 'error'; error?: string };

/**
 * Run a single agent turn: send `messages` to the provider, stream text,
 * execute any tool calls, and loop until the model emits end_turn or we
 * hit `maxIterations`. Yields rich events the UI can render.
 */
export async function* runAgentLoop(
  messages: ProviderMessage[],
  opts: AgentLoopOptions,
): AsyncIterable<AgentEvent> {
  const tools = opts.tools ?? [];
  const toolMap = new Map(tools.map((t) => [t.schema.name, t] as const));
  const toolSchemas = tools.map((t) => t.schema);
  const max = opts.maxIterations ?? 10;
  const ctx: ToolContext = {
    cwd: resolve(opts.cwd ?? process.cwd()),
    ...(opts.approve ? { approve: opts.approve } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  };
  const maxToolChars = opts.maxToolOutputChars ?? 12_000;

  // Resolve the context budget from explicit opts or the model family.
  const budget: ContextBudget = {
    windowTokens: opts.contextBudget?.windowTokens ?? windowForModel(opts.model ?? 'auto'),
    highWater: opts.contextBudget?.highWater ?? 0.75,
    keepRecent: opts.contextBudget?.keepRecent ?? 6,
  };

  // Mutable conversation buffer the loop appends tool results into.
  let buffer: ProviderMessage[] = [...messages];

  for (let iter = 0; iter < max; iter++) {
    if (opts.signal?.aborted) {
      yield { type: 'done', reason: 'error', error: 'aborted' };
      return;
    }
    yield { type: 'iteration', index: iter, max };

    // ── Context engineering: keep the working buffer under budget ──
    const managed = manageContext(buffer, budget);
    if (managed.compacted) {
      buffer = managed.messages;
      yield { type: 'context', note: managed.note ?? 'context compacted', tokens: managed.tokens };
    }

    const req: ChatRequest = {
      model: opts.model ?? 'auto',
      effort: opts.reasoningEffort ?? 'low',
      messages: buffer,
      systemPrompt: opts.systemPrompt,
      tools: toolSchemas.length > 0 ? toolSchemas : undefined,
      signal: opts.signal,
    };

    let assistantText = '';
    let assistantToolCalls: ProviderToolCall[] = [];
    let stopReason: ChatChunk & { type: 'done' } = { type: 'done', reason: 'end_turn' };

    // ── Provider call with bounded retry/backoff for rate limits and transient errors ──
    let attempt = 0;
    const retryPolicy = { ...DEFAULT_RETRY_POLICY, ...opts.retryPolicy };
    while (true) {
      assistantText = '';
      assistantToolCalls = [];
      stopReason = { type: 'done', reason: 'end_turn' };
      let sawError: string | undefined;

      for await (const chunk of opts.provider.chat(req)) {
        if (chunk.type === 'text') {
          assistantText += chunk.text;
          yield { type: 'text', text: chunk.text };
        } else if (chunk.type === 'tool_call') {
          assistantToolCalls.push(chunk.toolCall);
          yield {
            type: 'tool_call',
            name: chunk.toolCall.name,
            input: chunk.toolCall.input,
            id: chunk.toolCall.id,
          };
        } else if (chunk.type === 'usage') {
          yield {
            type: 'usage',
            inputTokens: chunk.inputTokens,
            outputTokens: chunk.outputTokens,
            ...(chunk.estimated ? { estimated: true } : {}),
            ...(chunk.cost !== undefined ? { cost: chunk.cost } : {}),
          };
        } else if (chunk.type === 'done') {
          stopReason = chunk;
          if (chunk.reason === 'error') sawError = chunk.error;
        }
      }

      // Retry transient failures only before any output has reached the user.
      if (sawError && attempt < retryPolicy.maxRetries && !assistantText && assistantToolCalls.length === 0 && isTransient(sawError)) {
        attempt++;
        const waitMs = providerRetryDelayMs(sawError, attempt, retryPolicy);
        log.warn('provider transient error; waiting before retry', { attempt, waitMs, error: sawError });
        yield { type: 'context', note: `provider busy; retry ${attempt}/${retryPolicy.maxRetries} in ${formatWait(waitMs)}: ${sawError}`, tokens: managed.tokens };
        const completed = await delay(waitMs, opts.signal);
        if (!completed) {
          yield { type: 'done', reason: 'error', error: 'aborted while waiting to retry' };
          return;
        }
        continue;
      }
      break;
    }

    // Persist the assistant turn so subsequent iterations have the context.
    buffer.push({
      role: 'assistant',
      content: assistantText,
      toolCalls: assistantToolCalls.length ? assistantToolCalls : undefined,
    });

    if (stopReason.reason === 'error') {
      yield { type: 'done', reason: 'error', error: stopReason.error };
      return;
    }

    if (assistantToolCalls.length === 0) {
      yield { type: 'done', reason: 'end_turn' };
      return;
    }

    // ── Execute tool calls: read-only ones in parallel, destructive ones
    //    strictly sequentially (so writes never race). Results are appended
    //    in the model's original call order to preserve tool_call ↔ result
    //    pairing required by the providers. ──
    const results = await executeToolCalls(assistantToolCalls, toolMap, ctx, maxToolChars);

    for (const r of results) {
      yield { type: 'tool_result', name: r.name, id: r.id, output: r.output, ok: r.ok };
      buffer.push({ role: 'tool', content: r.output, toolCallId: r.id });
    }
    // Loop continues: model receives tool results, may emit more text/tools.
  }

  yield { type: 'done', reason: 'max_iterations' };
}

interface ToolRunResult {
  name: string;
  id: string;
  output: string;
  ok: boolean;
}

/**
 * Execute a batch of tool calls. Read-only tools run concurrently for speed;
 * destructive tools (write/edit/run_command) run sequentially to avoid races.
 * Each tool may declare a `verify()` hook — if it reports a problem, the error
 * is surfaced to the model so it can self-correct on the next iteration.
 */
async function executeToolCalls(
  calls: ProviderToolCall[],
  toolMap: Map<string, AgentTool>,
  ctx: ToolContext,
  maxToolChars: number,
): Promise<ToolRunResult[]> {
  const results: ToolRunResult[] = new Array(calls.length);

  const runOne = async (tc: ProviderToolCall, index: number): Promise<void> => {
    const tool = toolMap.get(tc.name);
    if (!tool) {
      results[index] = { name: tc.name, id: tc.id, output: `Tool '${tc.name}' is not registered.`, ok: false };
      return;
    }
    try {
      if (ctx.approve) {
        const ok = await ctx.approve(tc.name, tc.input);
        if (!ok) {
          results[index] = { name: tc.name, id: tc.id, output: `[user denied tool '${tc.name}']`, ok: false };
          return;
        }
      }
      let output = await tool.execute(tc.input, ctx);

      // Post-execution verification (e.g. edit re-reads the file).
      if (tool.verify) {
        const problem = await tool.verify(tc.input, output, ctx);
        if (problem) {
          results[index] = {
            name: tc.name,
            id: tc.id,
            output: `${output}\n\n[verify] ${problem}`,
            ok: false,
          };
          return;
        }
      }

      output = trimToolOutput(output, { maxChars: maxToolChars });
      results[index] = { name: tc.name, id: tc.id, output, ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('tool execution failed', { tool: tc.name, err: msg });
      results[index] = { name: tc.name, id: tc.id, output: `Error: ${msg}`, ok: false };
    }
  };

  // Partition into read-only (parallel) and destructive (sequential) groups,
  // preserving original indices for stable result ordering.
  const parallel: Array<Promise<void>> = [];
  const sequential: Array<{ tc: ProviderToolCall; index: number }> = [];

  calls.forEach((tc, index) => {
    const tool = toolMap.get(tc.name);
    if (tool && tool.destructive) {
      sequential.push({ tc, index });
    } else {
      parallel.push(runOne(tc, index));
    }
  });

  await Promise.all(parallel);
  for (const { tc, index } of sequential) {
    await runOne(tc, index);
  }

  return results;
}

function isTransient(error: string): boolean {
  const e = error.toLowerCase();
  return (
    e.includes('429') ||
    e.includes('rate limit') ||
    e.includes('timeout') ||
    e.includes('econnreset') ||
    e.includes('etimedout') ||
    e.includes('503') ||
    e.includes('502') ||
    e.includes('overloaded') ||
    e.includes('fetch failed')
  );
}

export function providerRetryDelayMs(
  error: string,
  retryNumber: number,
  policy: ProviderRetryPolicy = DEFAULT_RETRY_POLICY,
): number {
  const retryAfter = error.match(/retry[- ]after\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec(?:onds?)?)?/i);
  if (retryAfter) {
    const amount = Number(retryAfter[1]);
    const unit = retryAfter[2]?.toLowerCase();
    const suggested = unit?.startsWith('m') ? amount : amount * 1_000;
    if (Number.isFinite(suggested) && suggested >= 0) return Math.min(suggested, policy.maxDelayMs);
  }
  return Math.min(policy.baseDelayMs * 2 ** Math.max(0, retryNumber - 1), policy.maxDelayMs);
}

function formatWait(ms: number): string {
  return ms < 1_000 ? `${Math.ceil(ms)}ms` : `${(ms / 1_000).toFixed(1)}s`;
}

function delay(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(false);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
