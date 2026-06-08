import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useTheme } from '../theme/useTheme.js';

interface PromptProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

// Memory-based persistent history across prompt mounts during session
const promptHistory: string[] = [];

export const Prompt: React.FC<PromptProps> = ({ onSubmit, disabled }) => {
  const [value, setValue] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const t = useTheme();

  // Hook into input for Up/Down arrow history cycling
  useInput((_input, key) => {
    if (disabled) return;

    if (key.upArrow) {
      if (promptHistory.length > 0) {
        const nextIndex = historyIndex === -1 ? promptHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setValue(promptHistory[nextIndex] || '');
      }
    } else if (key.downArrow) {
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex >= promptHistory.length) {
          setHistoryIndex(-1);
          setValue('');
        } else {
          setHistoryIndex(nextIndex);
          setValue(promptHistory[nextIndex] || '');
        }
      }
    }
  });

  const handleSubmit = (text: string) => {
    // If ending with a backslash, append a newline and let user keep writing
    if (text.endsWith('\\')) {
      setValue(text.slice(0, -1) + '\n');
      return;
    }

    const trimmed = text.trim();
    if (trimmed) {
      // Add to history if unique from the last command
      if (promptHistory.length === 0 || promptHistory[promptHistory.length - 1] !== trimmed) {
        promptHistory.push(trimmed);
      }
      setHistoryIndex(-1);
      onSubmit(trimmed);
      setValue('');
    }
  };

  // Claude Code-style prompt: just ❯ with no box border, clean and minimal
  return (
    <Box flexDirection="row" paddingX={0} marginTop={0}>
      <Text color={disabled ? t.dim : t.accent} bold>{'❯ '}</Text>
      {disabled ? (
        <Text color={t.dim}>…</Text>
      ) : (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder='Try "fix typecheck errors"'
        />
      )}
    </Box>
  );
};
