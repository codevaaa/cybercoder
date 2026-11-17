import { createLogger } from '@cybermind/shared';
import type { ChatChunk, ChatRequest, LLMProvider, ProviderInfo, ProviderMessage } from './types.js';

const log = createLogger('providers:anthropic');

export interface AnthropicProviderOptions {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

type ToolBlock = { id: string; name: string; json: string };

/** Native Messages API adapter with streaming text, tool calls and token usage. */
export class AnthropicProvider implements LLMProvider {
  public readonly info: ProviderInfo;
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultModel: string;

  constructor(options: AnthropicProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    this.baseURL = (options.baseURL ?? 'https://api.anthropic.com').replace(/\/+$/, '');
    this.defaultModel = options.defaultModel ?? 'claude-3-5-sonnet-latest';
    this.info = {
      id: 'anthropic',
      displayName: 'Anthropic Claude',
      requiresNetwork: true,
      ready: Boolean(this.apiKey),
    };
  }

  async listModels(): Promise<string[]> {
    return ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5', this.defaultModel];
  }

  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    if (!this.apiKey) {
      yield { type: 'done', reason: 'error', error: 'Anthropic API key is not configured.' };
      return;
    }

    const body: Record<string, unknown> = {
      model: req.model && req.model !== 'auto' ? req.model : this.defaultModel,
      max_tokens: req.maxTokens ?? 4096,
      stream: true,
      messages: toAnthropicMessages(req.messages),
    };
    if (req.systemPrompt) body.system = req.systemPrompt;
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.tools?.length) {
      body.tools = req.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
    }

    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: req.signal,
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => response.statusText);
        yield { type: 'done', reason: 'error', error: `Anthropic HTTP ${response.status}: ${detail}` };
        return;
      }
      if (!response.body) {
        yield { type: 'done', reason: 'error', error: 'Anthropic response body is empty.' };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const toolBlocks = new Map<number, ToolBlock>();
      let buffer = '';
      let eventType = '';
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;
      let stopReason = 'end_turn';
      let streamDone = false;

      const handleEvent = (raw: string): { text?: string } | undefined => {
        if (!raw.trim()) return undefined;
        let data: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
          data = parsed as Record<string, unknown>;
        } catch {
          return undefined;
        }

        const type = eventType || String(data.type ?? '');
        if (type === 'message_start') {
          const message = asRecord(data.message);
          const usage = asRecord(message?.usage);
          if (typeof usage?.input_tokens === 'number') inputTokens = usage.input_tokens;
        }
        if (type === 'message_delta') {
          const usage = asRecord(data.usage);
          const delta = asRecord(data.delta);
          if (typeof usage?.output_tokens === 'number') outputTokens = usage.output_tokens;
          if (typeof delta?.stop_reason === 'string') stopReason = delta.stop_reason;
        }
        const contentBlock = asRecord(data.content_block);
        if (type === 'content_block_start' && contentBlock?.type === 'tool_use') {
          toolBlocks.set(Number(data.index), {
            id: String(contentBlock.id ?? `tool-${data.index}`),
            name: String(contentBlock.name ?? ''),
            json: Object.keys(asRecord(contentBlock.input) ?? {}).length
              ? JSON.stringify(contentBlock.input)
              : '',
          });
        }
        if (type === 'content_block_delta') {
          const delta = asRecord(data.delta);
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') return { text: delta.text };
          if (delta?.type === 'input_json_delta') {
            const block = toolBlocks.get(Number(data.index));
            if (block && typeof delta.partial_json === 'string') block.json += delta.partial_json;
          }
        }
        if (type === 'message_stop') streamDone = true;
        return undefined;
      };

      while (!streamDone) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        let dataLines: string[] = [];

        const flush = () => {
          if (!dataLines.length) return;
          const result = handleEvent(dataLines.join('\n'));
          dataLines = [];
          if (result?.text) pendingText.push(result.text);
        };
        const pendingText: string[] = [];
        for (const line of lines) {
          if (line.startsWith('event:')) {
            flush();
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          } else if (!line.trim()) {
            flush();
            eventType = '';
          }
        }
        flush();
        for (const text of pendingText) yield { type: 'text', text };
      }

      for (const [, block] of toolBlocks) {
        if (!block.name) continue;
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(block.json || '{}') as Record<string, unknown>;
        } catch {
          yield { type: 'done', reason: 'error', error: `Anthropic returned invalid JSON for tool '${block.name}'.` };
          return;
        }
        yield { type: 'tool_call', toolCall: { id: block.id, name: block.name, input } };
      }
      if (inputTokens !== undefined && outputTokens !== undefined) {
        yield { type: 'usage', inputTokens, outputTokens };
      }
      yield { type: 'done', reason: toolBlocks.size ? 'tool_use' : stopReason === 'max_tokens' ? 'max_tokens' : 'end_turn' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn('Anthropic stream failed', { error: message });
      yield { type: 'done', reason: 'error', error: message };
    }
  }
}

function toAnthropicMessages(messages: ProviderMessage[]): Array<{ role: 'user' | 'assistant'; content: unknown }> {
  const result: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
  for (const message of messages) {
    if (message.role === 'system') continue;
    if (message.role === 'tool') {
      result.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: message.toolCallId ?? 'unknown', content: message.content }],
      });
      continue;
    }

    const content: Array<Record<string, unknown>> = [];
    if (message.content) content.push({ type: 'text', text: message.content });
    if (message.role === 'assistant') {
      for (const toolCall of message.toolCalls ?? []) {
        content.push({ type: 'tool_use', id: toolCall.id, name: toolCall.name, input: toolCall.input });
      }
    }
    result.push({ role: message.role, content: content.length ? content : [{ type: 'text', text: '' }] });
  }
  return result;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
