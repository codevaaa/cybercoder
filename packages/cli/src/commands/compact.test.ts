import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionMessage } from '../state/session.js';
import { buildCompactCommand } from './compact.js';

const history: SessionMessage[] = [
  { id: 'system-1', role: 'system', content: 'runtime metadata', createdAt: 1 },
  { id: 'user-1', role: 'user', content: 'Add a settings page.', createdAt: 2 },
  { id: 'assistant-1', role: 'assistant', content: 'I will inspect the app.', createdAt: 3 },
  { id: 'tool-1', role: 'tool', content: 'Read src/App.tsx', createdAt: 4 },
  { id: 'user-2', role: 'user', content: 'Keep the layout responsive.', createdAt: 5 },
];

function makeContext(overrides: Partial<{
  messages: SessionMessage[];
  model: string;
  setMessages: (messages: SessionMessage[]) => void;
}> = {}) {
  const replies: string[] = [];
  const messages = overrides.messages ?? structuredClone(history);
  const context = {
    clear: () => undefined,
    exit: () => undefined,
    appendMessage: (message: SessionMessage) => replies.push(message.content),
    getMessages: () => messages,
    setMessages: overrides.setMessages ?? ((next: SessionMessage[]) => { messages.splice(0, messages.length, ...next); }),
    getModel: () => overrides.model ?? 'codeva/terra',
  };
  return { context, messages, replies };
}

test('/compact summarizes with the selected model and requested focus, then replaces history', async () => {
  const { context, messages, replies } = makeContext();
  let receivedHistory: SessionMessage[] = [];
  let receivedFocus = '';
  let receivedModel = '';
  const command = buildCompactCommand(context, async (chatHistory, focus, model) => {
    receivedHistory = chatHistory;
    receivedFocus = focus;
    receivedModel = model;
    return '- Updated `src/App.tsx` for a responsive settings page.\n- Next: run the UI check.';
  });

  await command.run('preserve next steps');

  assert.deepEqual(receivedHistory.map((message) => message.role), ['user', 'assistant', 'user']);
  assert.equal(receivedFocus, 'preserve next steps');
  assert.equal(receivedModel, 'codeva/terra');
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, 'system');
  assert.match(messages[0]?.content ?? '', /Updated `src\/App\.tsx`/);
  assert.match(replies.at(-1) ?? '', /successfully compacted/i);
});

test('/compact preserves the complete original history when the provider fails', async () => {
  const original = structuredClone(history);
  const { context, messages, replies } = makeContext({ messages: structuredClone(original) });
  let setCalls = 0;
  context.setMessages = () => { setCalls += 1; };
  const command = buildCompactCommand(context, async () => { throw new Error('rate limited'); });

  await command.run('');

  assert.deepEqual(messages, original);
  assert.equal(setCalls, 0);
  assert.match(replies.at(-1) ?? '', /rate limited/i);
});

test('/compact rejects whitespace-only summaries and leaves history intact', async () => {
  const original = structuredClone(history);
  const { context, messages, replies } = makeContext({ messages: structuredClone(original) });
  let setCalls = 0;
  context.setMessages = () => { setCalls += 1; };
  const command = buildCompactCommand(context, async () => ' \n\t ');

  await command.run('');

  assert.deepEqual(messages, original);
  assert.equal(setCalls, 0);
  assert.match(replies.at(-1) ?? '', /empty summary/i);
});

test('/compact skips short histories without calling the summarizer', async () => {
  const shortHistory = history.slice(0, 3).filter((message) => message.role === 'user' || message.role === 'assistant').slice(0, 2);
  const { context, messages, replies } = makeContext({ messages: shortHistory });
  let summarizeCalls = 0;
  const command = buildCompactCommand(context, async () => { summarizeCalls += 1; return 'summary'; });

  await command.run('');

  assert.equal(summarizeCalls, 0);
  assert.deepEqual(messages, shortHistory);
  assert.match(replies.at(-1) ?? '', /too brief/i);
});
