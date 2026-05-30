import type { LLMProvider, ProviderMessage } from '@cybermind/providers';
import { runAgentLoop, type AgentEvent, type AgentTool } from './agent-loop.js';

/**
 * Plan / Act modes + goal-driven execution.
 *
 * - PLAN pass: a read-only reasoning turn that produces an ordered task list
 *   (no file writes). This mirrors Claude Code's plan mode.
 * - ACT pass: the normal agent loop, but kept running across turns until a
 *   completion condition holds (like `/goal`): the model declares the goal met
 *   with a sentinel, or we hit the round cap.
 */

export interface PlanResult {
  plan: string;
  steps: string[];
}

const PLAN_SYSTEM = `You are in PLANNING mode. Produce a concise, ordered implementation
plan for the user's goal. Use read-only tools (read_file, read_many, list_dir,
grep, web_search) to ground the plan in the actual codebase. DO NOT modify any
files or run mutating commands. End with a numbered task list, one task per line,
prefixed "STEP:".`;

/**
 * Run a read-only planning pass. Returns the assistant's plan text plus the
 * extracted STEP: lines.
 */
export async function runPlan(
  messages: ProviderMessage[],
  opts: {
    provider: LLMProvider;
    model?: string;
    tools: AgentTool[];
    signal?: AbortSignal;
    onEvent?: (e: AgentEvent) => void;
  },
): Promise<PlanResult> {
  // Only expose read-only tools during planning.
  const readonly = opts.tools.filter((t) => !t.destructive);
  let text = '';
  for await (const evt of runAgentLoop(messages, {
    provider: opts.provider,
    systemPrompt: PLAN_SYSTEM,
    model: opts.model ?? 'auto',
    tools: readonly,
    maxIterations: 6,
    signal: opts.signal,
  })) {
    opts.onEvent?.(evt);
    if (evt.type === 'text') text += evt.text;
  }
  const steps = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('STEP:'))
    .map((l) => l.replace(/^STEP:\s*/, ''));
  return { plan: text.trim(), steps };
}

export interface GoalOptions {
  provider: LLMProvider;
  model?: string;
  tools: AgentTool[];
  systemPrompt?: string;
  signal?: AbortSignal;
  /** Max ACT rounds before stopping (each round = one full agent loop). */
  maxRounds?: number;
  onEvent?: (e: AgentEvent) => void;
}

const GOAL_SENTINEL = 'GOAL_COMPLETE';

const GOAL_SYSTEM_SUFFIX = `\n\nYou are working toward a GOAL until it is fully achieved.
After each round, assess whether the goal is met. When — and only when — the goal
is fully complete and verified, end your message with the exact token ${GOAL_SENTINEL}
on its own line. If not complete, keep going: take the next concrete action.`;

/**
 * Goal-driven loop: repeatedly run the agent until it emits GOAL_COMPLETE or we
 * hit `maxRounds`. Between rounds the assistant's own output is fed back so it
 * continues the work (with full tool access).
 */
export async function* runGoal(
  initialMessages: ProviderMessage[],
  opts: GoalOptions,
): AsyncIterable<AgentEvent & { round?: number }> {
  const maxRounds = opts.maxRounds ?? 8;
  const system = `${opts.systemPrompt ?? ''}${GOAL_SYSTEM_SUFFIX}`;
  const buffer: ProviderMessage[] = [...initialMessages];

  for (let round = 0; round < maxRounds; round++) {
    if (opts.signal?.aborted) {
      yield { type: 'done', reason: 'error', error: 'aborted', round };
      return;
    }

    let roundText = '';
    let endedTurn = false;
    for await (const evt of runAgentLoop(buffer, {
      provider: opts.provider,
      systemPrompt: system,
      model: opts.model ?? 'auto',
      tools: opts.tools,
      signal: opts.signal,
    })) {
      if (evt.type === 'text') roundText += evt.text;
      if (evt.type === 'done') endedTurn = true;
      yield { ...evt, round };
    }

    // Persist the assistant's turn so the next round has context.
    buffer.push({ role: 'assistant', content: roundText });

    if (roundText.includes(GOAL_SENTINEL)) {
      yield { type: 'done', reason: 'end_turn', round };
      return;
    }
    if (!endedTurn) {
      // Loop hit an error/abort already surfaced; stop.
      return;
    }
    // Nudge the model to continue toward the goal next round.
    buffer.push({
      role: 'user',
      content: `Continue working toward the goal. If it is fully done and verified, reply with ${GOAL_SENTINEL}.`,
    });
  }
  yield { type: 'done', reason: 'max_iterations' };
}
