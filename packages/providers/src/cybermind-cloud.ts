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
 * It uses native fetch to stream completions using the user's SaaS API key
 * and token quotas.
 */
export class CybermindCloudProvider implements LLMProvider {
  public readonly info: ProviderInfo;
  private defaultModel: string;
  private opts: CybermindCloudProviderOptions;

  constructor(opts: CybermindCloudProviderOptions = {}) {
    this.opts = opts;
    this.defaultModel = opts.defaultModel ?? 'trinity'; // Default to free tier
    this.info = {
      id: 'cybermind-cloud',
      displayName: 'Codeva Cloud (Swarm)',
      requiresNetwork: true,
      ready: true, // We assume true and handle errors during the chat call
    };
  }

  async listModels(): Promise<string[]> {
    return ['madhav', 'kali', 'abhimanyu', 'trinity'];
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

      const lastMessage = filteredMessages[filteredMessages.length - 1]?.content || '';
      
      const baseURL = this.opts.baseURL || 'https://cybercli-api.onrender.com/api/v1';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.opts.apiKey) headers['Authorization'] = `Bearer ${this.opts.apiKey}`;
      if (this.opts.sessionId) headers['x-cli-session'] = this.opts.sessionId;

      const response = await fetch(`${baseURL}/cli/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: filteredMessages,
          prompt: lastMessage,
          temperature: req.temperature,
          max_tokens: req.maxTokens,
          stream: true,
        }),
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
            if (parsed.content) {
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
