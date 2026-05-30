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
    <Box marginTop={1} paddingLeft={1}>
      <Text color={t.dim}>{'['}</Text>
      <Text color={statusColor[status]} bold>{STATUS_LABEL[status]}</Text>
      <Text color={t.dim}>{'] '} </Text>
      <Text color={t.text} bold>{model}</Text>
      <Text color={t.dim}> · </Text>
      <Text color={t.text}>{provider}</Text>
      <Text color={t.dim}> │ </Text>
      <Text color={t.dim}>tokens: </Text>
      <Text color={t.info} bold>{formatTokens(tokens)}</Text>
      <Text color={t.dim}> │ </Text>
      <Text color={t.dim}>cost: </Text>
      <Text color={t.success} bold>${cost.toFixed(2)}</Text>
      <Text color={t.dim}> │ </Text>
      <Text color={t.dim}>? shortcuts</Text>
    </Box>
  );
};
