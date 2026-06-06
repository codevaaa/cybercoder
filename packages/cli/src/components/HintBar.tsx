import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { useTheme } from '../theme/useTheme.js';

interface HintBarProps {
  status?: 'idle' | 'thinking' | 'awaiting-approval' | 'error';
}

export const HintBar: React.FC<HintBarProps> = ({ status = 'idle' }) => {
  const { stdout } = useStdout();
  const t = useTheme();
  const termWidth = stdout.columns ?? 80;
  const contentWidth = Math.min(termWidth - 4, 76);

  const getHints = () => {
    switch (status) {
      case 'thinking':
        return (
          <Text color={t.muted}>
            <Text bold color={t.accent}>Esc</Text> to interrupt · <Text bold color={t.accent}>?</Text> for shortcuts
          </Text>
        );
      case 'awaiting-approval':
        return (
          <Text color={t.muted}>
            <Text bold color={t.success}>y</Text> allow · <Text bold color={t.error}>n</Text> deny · <Text bold color={t.warning}>a</Text> always · <Text bold color={t.dim}>ESC</Text> cancel
          </Text>
        );
      case 'idle':
      default:
        return (
          <Text color={t.muted}>
            <Text bold color={t.accent}>?</Text> for shortcuts · <Text bold color={t.accent}>/</Text> for commands · <Text bold color={t.error}>Ctrl+C</Text> to exit
          </Text>
        );
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Thin dim separator line */}
      <Text color={t.dim} dimColor>{'─'.repeat(contentWidth + 2)}</Text>
      <Box paddingLeft={1} marginTop={0}>
        {getHints()}
      </Box>
    </Box>
  );
};
