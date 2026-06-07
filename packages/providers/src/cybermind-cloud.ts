import { createLogger } from '@cybermind/shared';
import type { ChatChunk, ChatRequest, LLMProvider, ProviderInfo } from './types.js';
import { apiClient } from '../../cli/src/utils/api-client.js';

const log = createLogger('providers:cybermind-cloud');

export interface CybermindCloudProviderOptions {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
}

/**
 * `cybermind-cloud` provider connects directly to our SaaS Swarm Orchestrator.
 * It uses the custom apiClient to stream completions using the user's SaaS API key
 * and token quotas.
 */
export class CybermindCloudProvider implements LLMProvider {
  public readonly info: ProviderInfo;
  private defaultModel: string;

  constructor(opts: CybermindCloudProviderOptions = {}) {
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
      // Map ChatRequest to apiClient format
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

      // We extract the last user message to use as the main prompt for the Swarm
      const lastMessage = filteredMessages[filteredMessages.length - 1]?.content || '';

      const generator = apiClient.streamCompletion({
        model: model,
        system: systemPrompt,
        messages: filteredMessages,
        prompt: lastMessage,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
      });

      for await (const chunk of generator) {
        if (chunk.content) {
          yield { type: 'text', text: chunk.content };
        }
        // Could handle tool calls if Swarm returns them here in the future
      }
      yield { type: 'done', reason: 'stop' };

    } catch (err: any) {
      log.error('Codeva Cloud chat failed', err);
      yield { type: 'done', reason: 'error', error: err.message || String(err) };
    }
  }
}
