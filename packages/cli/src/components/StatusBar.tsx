import React from 'react';
import { Box, Text } from 'ink';
import type { SessionStatus } from '../state/session.js';
import { useTheme } from '../theme/useTheme.js';

interface Props {
  status: SessionStatus;
  model: string;
  provider: string;
  tokens?: number;
  cost?: number;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  idle: 'ready',
  thinking: 'thinking…',
  'awaiting-approval': 'awaiting approval',
  error: 'error',
};

export const StatusBar: React.FC<Props> = ({ status, model, provider, tokens = 0, cost = 0 }) => {
  const t = useTheme();
  const statusColor: Record<SessionStatus, string> = {
    idle: t.success,
    thinking: t.warning,
    'awaiting-approval': t.accentAlt,
    error: t.error,
  };

  const formatTokens = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <Box width="100%" justifyContent="flex-end" paddingRight={1} marginTop={0}>
      <Text color={statusColor[status]}>[{STATUS_LABEL[status]}] </Text>
      <Text color={t.text} bold>{model}</Text>
      <Text color={t.dim}> · </Text>
      <Text color={t.success}>{provider}</Text>
      <Text color={t.dim}> · </Text>
      <Text color={t.text}>{formatTokens(tokens)} tokens</Text>
      <Text color={t.dim}> · </Text>
      <Text color={t.success}>${cost.toFixed(4)}</Text>
    </Box>
  );
};
