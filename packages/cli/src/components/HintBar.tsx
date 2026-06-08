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
            <Text bold color={t.accent}>?</Text> for shortcuts · <Text bold color={t.accent}>←</Text> for agents
          </Text>
        );
    }
  };

  return (
    <Box
      flexDirection="row"
      width="100%"
      borderStyle="single"
      borderTop={true}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={t.border}
      paddingLeft={1}
      paddingTop={0}
      paddingBottom={0}
      marginTop={0}
    >
      {getHints()}
    </Box>
  );
};
