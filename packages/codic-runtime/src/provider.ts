import type {
  ChatChunk,
  ChatRequest,
  LLMProvider,
  ProviderInfo,
  ProviderMessage,
} from '../../providers/src/types.js';

export interface CodevaProviderOptions {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

type ServerEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; toolCall: { id: string; name: string; input: Record<string, unknown> } }
  | { type: 'usage'; inputTokens: number; outputTokens: number; estimated?: boolean }
  | { type: 'done'; reason?: string }
  | { type: 'error'; error: string };

export class CodevaProvider implements LLMProvider {
  readonly info: ProviderInfo = {
    id: 'cybermind-cloud',
    displayName: 'Codeva AI',
    requiresNetwork: true,
    ready: true,
  };

  private readonly fetchImpl: typeof fetch;
  private readonly options: CodevaProviderOptions;

  constructor(options: CodevaProviderOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listModels(): Promise<string[]> {
    const token = await this.requireToken();
    const response = await this.fetchImpl(`${this.baseUrl()}/codic/models`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as { models?: Array<string | { id?: string }> };
    if (!response.ok) throw new Error(readError(body, response.status));
    return (body.models ?? []).map((model) => typeof model === 'string' ? model : model.id ?? '').filter(Boolean);
  }

  async *chat(request: ChatRequest): AsyncIterable<ChatChunk> {
    let response: Response;
    try {
      const token = await this.requireToken();
      const messages = toApiMessages(request.messages, request.systemPrompt);
      response = await this.fetchImpl(`${this.baseUrl()}/codic/turns`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model: request.model,
          messages,
          tools: request.tools?.map((tool) => ({
            type: 'function',
            function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
          })),
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: true,
        }),
        signal: request.signal,
      });
    } catch (error) {
      if (request.signal?.aborted) {
        yield { type: 'done', reason: 'error', error: 'aborted' };
        return;
      }
      yield { type: 'done', reason: 'error', error: safeError(error) };
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      yield { type: 'done', reason: 'error', error: readError(body, response.status) };
      return;
    }

    if (!response.body) {
      yield { type: 'done', reason: 'error', error: 'The model service returned an empty stream.' };
      return;
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (request.signal?.aborted) {
          await reader.cancel().catch(() => undefined);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const event = parseEvent(frame);
          if (!event) continue;
          if (event.type === 'error') {
            await reader.cancel().catch(() => undefined);
            yield { type: 'done', reason: 'error', error: event.error };
            return;
          }
          if (event.type === 'text') yield { type: 'text', text: event.text };
          else if (event.type === 'tool_call') yield { type: 'tool_call', toolCall: event.toolCall };
          else if (event.type === 'usage') yield { type: 'usage', inputTokens: event.inputTokens, outputTokens: event.outputTokens, ...(event.estimated ? { estimated: true } : {}) };
          else if (event.type === 'done') {
            await reader.cancel().catch(() => undefined);
            yield { type: 'done', reason: normalizeDoneReason(event.reason) };
            return;
          }
        }
      }
      buffer += decoder.decode();
      const trailing = parseEvent(buffer);
      if (trailing?.type === 'text') yield { type: 'text', text: trailing.text };
      else if (trailing?.type === 'tool_call') yield { type: 'tool_call', toolCall: trailing.toolCall };
      else if (trailing?.type === 'error') {
        yield { type: 'done', reason: 'error', error: trailing.error };
        return;
      } else if (trailing?.type === 'done') {
        yield { type: 'done', reason: normalizeDoneReason(trailing.reason) };
        return;
      }
      if (request.signal?.aborted) yield { type: 'done', reason: 'error', error: 'aborted' };
      else yield { type: 'done', reason: 'end_turn' };
    } catch (error) {
      yield { type: 'done', reason: 'error', error: request.signal?.aborted ? 'aborted' : safeError(error) };
    } finally {
      reader.releaseLock();
    }
  }

  private async requireToken(): Promise<string> {
    const token = await this.options.getAccessToken();
    if (!token) throw new Error('Sign in to Codeva before starting an agent task.');
    return token;
  }

  private baseUrl(): string {
    return this.options.apiBaseUrl.replace(/\/+$/, '');
  }
}

function toApiMessages(messages: ProviderMessage[], systemPrompt?: string): Record<string, unknown>[] {
  const allMessages: ProviderMessage[] = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;
  return allMessages.map((message) => ({
    role: message.role,
    content: message.content,
    ...(message.toolCalls?.length ? {
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: JSON.stringify(call.input) },
      })),
    } : {}),
    ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
  }));
}

function parseEvent(frame: string): ServerEvent | null {
  const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart()).join('\n').trim();
  if (!data || data === '[DONE]') return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(data) as Record<string, unknown>;
  } catch {
    return { type: 'error', error: 'The model service sent an invalid event.' };
  }

  if (parsed.type === 'text' && typeof parsed.text === 'string') return { type: 'text', text: parsed.text };
  if (parsed.type === 'tool_call' && isToolCall(parsed.toolCall)) return { type: 'tool_call', toolCall: parsed.toolCall };
  if (parsed.type === 'usage' && Number.isFinite(parsed.inputTokens) && Number.isFinite(parsed.outputTokens)) {
    return { type: 'usage', inputTokens: Number(parsed.inputTokens), outputTokens: Number(parsed.outputTokens), estimated: parsed.estimated === true };
  }
  if (parsed.type === 'done') return { type: 'done', reason: typeof parsed.reason === 'string' ? parsed.reason : undefined };
  if (parsed.type === 'error') {
    const detail = parsed.error;
    if (typeof detail === 'string') return { type: 'error', error: detail };
    if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') {
      return { type: 'error', error: detail.message };
    }
    return { type: 'error', error: 'The model service failed.' };
  }
  return null;
}

function isToolCall(value: unknown): value is { id: string; name: string; input: Record<string, unknown> } {
  if (!value || typeof value !== 'object') return false;
  const call = value as Record<string, unknown>;
  return typeof call.id === 'string' && typeof call.name === 'string' &&
    Boolean(call.input) && typeof call.input === 'object' && !Array.isArray(call.input);
}

function readError(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const candidate = (body as Record<string, unknown>).error;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (candidate && typeof candidate === 'object' && 'message' in candidate && typeof candidate.message === 'string') return candidate.message;
  }
  return `The model service returned HTTP ${status}.`;
}

function safeError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'The model service could not be reached.';
}

function normalizeDoneReason(reason?: string): 'end_turn' | 'tool_use' | 'max_tokens' | 'stop' | 'error' {
  if (reason === 'tool_use' || reason === 'max_tokens' || reason === 'stop') return reason;
  return 'end_turn';
}
