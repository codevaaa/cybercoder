import { createLogger } from '@cybermind/shared';
import type { ChatChunk, ChatRequest, LLMProvider, ProviderInfo } from './types.js';

const log = createLogger('providers:cybermind-cloud');

export interface CybermindCloudProviderOptions {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  sessionId?: string;
}

/**
 * `cybermind-cloud` provider connects directly to our SaaS Swarm Orchestrator.
 * Uses /completions endpoint for fastest response (no session overhead).
 * Falls back to /cli/complete for authenticated CLI sessions.
 */
export class CybermindCloudProvider implements LLMProvider {
  public readonly info: ProviderInfo;
  private defaultModel: string;
  private opts: CybermindCloudProviderOptions;

  constructor(opts: CybermindCloudProviderOptions = {}) {
    this.opts = opts;
    this.defaultModel = opts.defaultModel ?? 'auto';
    this.info = {
      id: 'cybermind-cloud',
      displayName: 'Codeva Cloud (Swarm)',
      requiresNetwork: true,
      ready: true,
    };
  }

  async listModels(): Promise<string[]> {
    return ['auto', 'ravan', 'madhav', 'kali', 'abhimanyu', 'arjun', 'trinity'];
  }

  async *chat(req: ChatRequest): AsyncIterable<ChatChunk> {
    const model = req.model || this.defaultModel;
    log.debug('Starting Codeva Cloud chat request', { model });

    try {
      let systemPrompt = '';
      const filteredMessages = [];
      for (const msg of req.messages) {
        if (msg.role === 'system') {
          systemPrompt += (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) + '\n';
        } else {
          filteredMessages.push({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
          });
        }
      }

      const rawBaseURL = this.opts.baseURL || 'https://cybercli-api.onrender.com';
      const baseURL = rawBaseURL.endsWith('/api/v1') ? rawBaseURL : `${rawBaseURL.replace(/\/+$/, '')}/api/v1`;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.opts.apiKey) headers['Authorization'] = `Bearer ${this.opts.apiKey}`;
      if (this.opts.sessionId) headers['x-cli-session'] = this.opts.sessionId;

      // Use /completions for anonymous/fast path, /cli/complete for authenticated CLI
      const endpoint = this.opts.sessionId
        ? `${baseURL}/cli/complete`
        : `${baseURL}/completions`;

      const body = this.opts.sessionId
        ? {
            model,
            system: systemPrompt,
            messages: filteredMessages,
            prompt: filteredMessages[filteredMessages.length - 1]?.content || '',
            temperature: req.temperature,
            max_tokens: req.maxTokens,
            stream: true,
            tools: req.tools,
          }
        : {
            messages: systemPrompt
              ? [{ role: 'system', content: systemPrompt }, ...filteredMessages]
              : filteredMessages,
            model,
            temperature: req.temperature ?? 0.7,
            stream: true,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Streaming failed: ${response.status} ${errText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body for streaming');
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            // Note: we don't break here, let the loop finish if there's more chunks
            continue;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'status') {
              // Status events are not supported in ChatChunk yet, ignoring
            } else if (parsed.type === 'usage') {
              yield { type: 'usage', inputTokens: parsed.inputTokens || 0, outputTokens: parsed.outputTokens || 0, cost: parsed.cost || 0 };
            } else if (parsed.type === 'tool_calls') {
              for (const tc of parsed.toolCalls || []) {
                try {
                  yield { 
                    type: 'tool_call', 
                    toolCall: {
                      id: tc.id,
                      name: tc.function.name,
                      input: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
                    }
                  };
                } catch (e) {
                  log.error('Failed to parse tool call arguments', e);
                }
              }
            } else if (parsed.type === 'token') {
              yield { type: 'text', text: parsed.content };
            } else if (parsed.content !== undefined) {
              yield { type: 'text', text: parsed.content };
            }
          } catch {
            // ignore JSON parse error on incomplete chunks
          }
        }
      }
      
      yield { type: 'done', reason: 'stop' };

    } catch (err: any) {
      log.error('Codeva Cloud chat failed', err);
      yield { type: 'done', reason: 'error', error: err.message || String(err) };
    }
  }
}
