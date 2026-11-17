import { getRouter } from '../runtime/chat.js';
import type { SessionMessage } from '../state/session.js';
import type { CommandContext, SlashCommandHandler } from './index.js';

export type CompactSummarizer = (history: SessionMessage[], focus: string, model: string) => Promise<string>;

async function summarizeHistory(history: SessionMessage[], focus: string, model: string): Promise<string> {
  const chatText = history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
  const systemPrompt = `You are a conversation compaction assistant. Summarize the chat log into one dense, bulleted handoff that preserves user goals, decisions, files read or edited, commands and checks run, unresolved errors, and next steps.
${focus ? `Pay particular attention to: ${focus}` : ''}
Keep the summary under 200 words. Do not introduce yourself or add pleasantries. Start immediately with the bulleted list.`;

  let summary = '';
  for await (const chunk of getRouter().chat({
    model,
    messages: [{ role: 'user', content: chatText }],
    systemPrompt,
    temperature: 0.3,
    maxTokens: 512,
  })) {
    if (chunk.type === 'text') summary += chunk.text;
    else if (chunk.type === 'done' && chunk.reason === 'error') {
      throw new Error(chunk.error ?? 'The provider could not summarize this conversation.');
    }
  }

  const result = summary.trim();
  if (!result) throw new Error('The provider returned an empty summary.');
  return result;
}

export function buildCompactCommand(ctx: CommandContext, summarize: CompactSummarizer = summarizeHistory): SlashCommandHandler {
  return {
    name: 'compact',
    description: 'Compress conversation history to free context window.',
    category: 'session',
    usage: '/compact [focus_topic]',
    run: async (args: string) => {
      const focus = args.trim();
      const reply = (content: string) => {
        ctx.appendMessage({
          id: `compact-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });
      };

      const getMessages = ctx.getMessages;
      const setMessages = ctx.setMessages;

      if (!getMessages || !setMessages) {
        reply('⚠️ Compaction is not supported in this environment.');
        return;
      }

      const history = getMessages();
      // Only keep user and assistant messages for summarization
      const chatHistory = history.filter((m) => m.role === 'user' || m.role === 'assistant');

      if (chatHistory.length < 3) {
        reply('ℹ️ Message history is too brief to require compaction.');
        return;
      }

      reply('⣾ Compressing conversation history with the active model...');

      try {
        const summary = (await summarize(chatHistory, focus, ctx.getModel?.() || 'auto')).trim();
        if (!summary) throw new Error('The provider returned an empty summary.');

        // Replace history with the compacted message
        const compactedMessage = {
          id: `compact-summary-${Date.now()}`,
          role: 'system' as const,
          content: `[Conversation compacted to free context window]\n\n**Progress summary so far**:\n${summary}`,
          createdAt: Date.now(),
        };

        setMessages([compactedMessage]);
        reply('✨ History successfully compacted!');
      } catch (err) {
        reply(`❌ Failed to compact history: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  };
}
