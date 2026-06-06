import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { activeTheme } from '../theme/theme.js';

/**
 * Claude Code-style "thinking" line: a braille spinner + a rotating playful
 * gerund word + elapsed seconds + live token count. The word cycles every few
 * seconds so a long task feels alive, exactly like Claude Code's floating
 * status words after you submit a command.
 */
const WORDS = [
  'Thinking', 'Pondering', 'Conjuring', 'Reasoning', 'Computing', 'Synthesizing',
  'Architecting', 'Untangling', 'Investigating', 'Cooking', 'Crunching', 'Composing',
  'Deliberating', 'Strategizing', 'Assembling', 'Tinkering', 'Wrangling', 'Noodling',
];

const FRAMES = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

interface Props {
  /** Live token count for this turn (optional). */
  tokens?: number;
  /** Override the rotating word (e.g. a tool name in progress). */
  label?: string;
}

export const ThinkingIndicator: React.FC<Props> = ({ tokens = 0, label }) => {
  const t = activeTheme;
  const [frame, setFrame] = useState(0);
  const [wordIdx, setWordIdx] = useState(() => Math.floor(Math.random() * WORDS.length));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const f = setInterval(() => setFrame((x) => (x + 1) % FRAMES.length), 80);
    const w = setInterval(() => setWordIdx((x) => (x + 1) % WORDS.length), 3200);
    const e = setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => {
      clearInterval(f);
      clearInterval(w);
      clearInterval(e);
    };
  }, []);

  const word = label || WORDS[wordIdx];

  return (
    <Box marginTop={1} paddingLeft={1}>
      <Text color={t.accent}>{FRAMES[frame]} </Text>
      <Text color={t.accent} bold>{word}…</Text>
      <Text color={t.dim}>  ({elapsed}s</Text>
      {tokens > 0 && <Text color={t.dim}> · {formatTokens(tokens)} tokens</Text>}
      <Text color={t.dim}> · esc to interrupt)</Text>
    </Box>
  );
};

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
