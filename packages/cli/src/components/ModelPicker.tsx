import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, useInput, useStdin, useStdout } from 'ink';
import { useTheme } from '../theme/useTheme.js';

export interface ModelInfo {
  id: string;
  name: string;
  tier: string;
  desc: string;
}

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
  models?: readonly ModelInfo[];
  loading?: boolean;
  loadError?: string;
}

/** The Codeva models shown by default; callers may pass a live provider list. */
export const SUPREME_MODELS: readonly ModelInfo[] = [
  { id: 'auto', name: 'Auto (recommended)', tier: 'all', desc: 'Routes to the best available persona for the task' },
  { id: 'madhav', name: 'Madhav (Pro — Strategic Mastermind)', tier: 'pro', desc: 'Deep codebase understanding, complex architecture planning' },
  { id: 'kali', name: 'Kali (Standard — Destroyer of Bugs)', tier: 'standard', desc: 'Relentless debugging, finding edge-case vulnerabilities' },
  { id: 'abhimanyu', name: 'Abhimanyu (Basic — Deep Context)', tier: 'basic', desc: 'Deep-dive local reasoning for breaking complex logic traps' },
  { id: 'trinity', name: 'Trinity (Free — The Powerhouse)', tier: 'free', desc: 'Fast, logic-perfect execution for free tier users' },
];

/** Convert provider IDs into honest picker rows without inventing model tiers. */
export function modelInfosFromIds(ids: readonly string[], providerName: string): ModelInfo[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].map((id) => ({
    id,
    name: id,
    tier: 'available',
    desc: `Available from ${providerName}`,
  }));
}

export type ModelPickerMove = 'up' | 'down' | 'page-up' | 'page-down' | 'first' | 'last';

export function filterModelOptions(models: readonly ModelInfo[], query: string): ModelInfo[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...models];
  return models.filter((model) =>
    `${model.name} ${model.id} ${model.tier} ${model.desc}`.toLocaleLowerCase().includes(normalized),
  );
}

/** Keep the selection in a bounded terminal viewport while the list is navigated. */
export function getModelPickerViewport(total: number, selectedIndex: number, visibleCount: number): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  const count = Math.max(1, Math.min(total, Math.floor(visibleCount)));
  const selected = Math.max(0, Math.min(total - 1, Math.floor(selectedIndex)));
  const start = Math.max(0, Math.min(selected - count + 1, total - count));
  return { start, end: start + count };
}

export function moveModelPickerSelection(
  selectedIndex: number,
  action: ModelPickerMove,
  total: number,
  pageSize: number,
): number {
  if (total <= 0) return 0;
  const current = Math.max(0, Math.min(total - 1, selectedIndex));
  const page = Math.max(1, pageSize);
  switch (action) {
    case 'up': return Math.max(0, current - 1);
    case 'down': return Math.min(total - 1, current + 1);
    case 'page-up': return Math.max(0, current - page);
    case 'page-down': return Math.min(total - 1, current + page);
    case 'first': return 0;
    case 'last': return total - 1;
  }
}

export type ModelPickerWheelDirection = 'up' | 'down';

/** Parse xterm SGR mouse-wheel reports while retaining an incomplete chunk. */
export function parseModelPickerWheelReports(
  input: string,
  pending = '',
): { directions: ModelPickerWheelDirection[]; pending: string } {
  let data = pending + input;
  const directions: ModelPickerWheelDirection[] = [];
  const prefix = '\u001b[<';

  while (data) {
    const start = data.indexOf(prefix);
    if (start < 0) {
      const trailingPrefix = [prefix, prefix.slice(0, 2), prefix.slice(0, 1)]
        .find((candidate) => data.endsWith(candidate));
      return { directions, pending: trailingPrefix ?? '' };
    }

    data = data.slice(start);
    const end = data.search(/[Mm]/);
    if (end < 0) return { directions, pending: data.slice(0, 128) };

    const report = data.slice(0, end + 1);
    const match = /^\u001b\[<(\d+);\d+;\d+[Mm]$/.exec(report);
    if (match) {
      const button = Number(match[1]);
      if ((button & 64) === 64) directions.push((button & 1) === 1 ? 'down' : 'up');
    }
    data = data.slice(end + 1);
  }

  return { directions, pending: '' };
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  currentModel,
  onSelect,
  onClose,
  models = SUPREME_MODELS,
  loading = false,
  loadError,
}) => {
  const theme = useTheme();
  const { stdin, isRawModeSupported } = useStdin();
  const { stdout } = useStdout();
  const terminalWidth = Math.max(1, stdout?.columns ?? 80);
  const terminalRows = Math.max(1, stdout?.rows ?? 24);
  const contentWidth = Math.max(1, Math.min(88, terminalWidth - 2));
  const visibleCount = Math.max(1, Math.floor((terminalRows - 8) / 2));
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const current = models.findIndex((model) => model.id === currentModel);
    return current >= 0 ? current : 0;
  });

  // When a provider's model catalog arrives, keep the active model selected
  // and let the viewport recalculate from its new list size.
  useEffect(() => {
    const current = models.findIndex((model) => model.id === currentModel);
    setSelectedIndex(current >= 0 ? current : 0);
  }, [models, currentModel]);

  const filteredModels = useMemo(() => filterModelOptions(models, query), [models, query]);
  const modelCountRef = useRef(filteredModels.length);
  const visibleCountRef = useRef(visibleCount);
  const mousePendingRef = useRef('');
  modelCountRef.current = filteredModels.length;
  visibleCountRef.current = visibleCount;
  const safeSelectedIndex = filteredModels.length
    ? Math.max(0, Math.min(filteredModels.length - 1, selectedIndex))
    : 0;
  const viewport = getModelPickerViewport(filteredModels.length, safeSelectedIndex, visibleCount);
  const visibleModels = filteredModels.slice(viewport.start, viewport.end);

  // Ink's useInput hook decodes keyboard input only. Enable standard SGR
  // terminal mouse reporting while this picker is mounted so wheel events can
  // move the same bounded selection; terminals without a raw TTY keep keyboard
  // navigation and filtering unchanged.
  useEffect(() => {
    if (!isRawModeSupported || !stdin?.isTTY || !stdout?.isTTY) return;

    const onData = (chunk: Buffer | string) => {
      const parsed = parseModelPickerWheelReports(chunk.toString(), mousePendingRef.current);
      mousePendingRef.current = parsed.pending;
      for (const direction of parsed.directions) {
        setSelectedIndex((index) => moveModelPickerSelection(
          index,
          direction,
          modelCountRef.current,
          visibleCountRef.current,
        ));
      }
    };

    stdout.write('\u001b[?1000h\u001b[?1006h');
    stdin.on('data', onData);
    return () => {
      stdin.off('data', onData);
      mousePendingRef.current = '';
      stdout.write('\u001b[?1006l\u001b[?1000l');
    };
  }, [isRawModeSupported, stdin, stdout]);

  useInput((input, key) => {
    if (key.escape) {
      if (query) {
        setQuery('');
        setSelectedIndex(0);
      } else {
        onClose();
      }
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((index) => moveModelPickerSelection(index, 'up', filteredModels.length, visibleCount));
    } else if (key.downArrow) {
      setSelectedIndex((index) => moveModelPickerSelection(index, 'down', filteredModels.length, visibleCount));
    } else if (key.pageUp) {
      setSelectedIndex((index) => moveModelPickerSelection(index, 'page-up', filteredModels.length, visibleCount));
    } else if (key.pageDown) {
      setSelectedIndex((index) => moveModelPickerSelection(index, 'page-down', filteredModels.length, visibleCount));
    } else if (key.return) {
      const model = filteredModels[safeSelectedIndex];
      if (model) onSelect(model.id);
    } else if (key.backspace || key.delete) {
      setQuery((value) => value.slice(0, -1));
      setSelectedIndex(0);
    } else if (!key.ctrl && !key.meta && input && !input.startsWith('\u001b')) {
      setQuery((value) => value + input);
      setSelectedIndex(0);
    }
  });

  const tierColor = (tier: string) =>
    tier === 'pro' ? '#FF6B6B' : tier === 'standard' ? '#FFD93D' : tier === 'basic' ? '#6BCB77' : tier === 'free' ? '#4D96FF' : theme.accent;
  const borderLabel = '╭─ Model Selection ';
  const topBorder = `${borderLabel}${'─'.repeat(Math.max(0, contentWidth - borderLabel.length - 1))}╮`;
  const bottomBorder = `╰${'─'.repeat(Math.max(0, contentWidth - 2))}╯`;
  const descriptionWidth = Math.max(0, contentWidth - 8);
  const nameWidth = Math.max(1, contentWidth - 12);

  return (
    <Box flexDirection="column" marginBottom={1} width={contentWidth}>
      <Text color={theme.accent}>{topBorder}</Text>
      <Box flexDirection="column" paddingLeft={1} paddingRight={1} marginTop={1}>
        <Text bold color={theme.text}>CyberCoder Mythological Swarm — Select model</Text>
        <Text color={theme.dim}>Search: {query || 'type to filter'}{query ? '▌' : ''}</Text>
        <Box flexDirection="column" marginTop={1}>
          {loading && filteredModels.length === 0 && <Text color={theme.muted}>Loading models…</Text>}
          {!loading && loadError && filteredModels.length === 0 && <Text color={theme.warning}>{loadError}</Text>}
          {!loading && !loadError && filteredModels.length === 0 && (
            <Text color={theme.muted}>{query ? `No models match “${query}”.` : 'No models are available from this provider.'}</Text>
          )}
          {visibleModels.map((model, rowIndex) => {
            const index = viewport.start + rowIndex;
            const isSelected = index === safeSelectedIndex;
            const isCurrent = model.id === currentModel;
            const title = model.name.length > nameWidth ? `${model.name.slice(0, Math.max(0, nameWidth - 1))}…` : model.name;
            const description = model.desc.length > descriptionWidth ? `${model.desc.slice(0, Math.max(0, descriptionWidth - 1))}…` : model.desc;
            return (
              <Box key={model.id} flexDirection="column">
                <Text>
                  <Text color={isSelected ? theme.accent : theme.dim}>{isSelected ? '› ' : '  '}</Text>
                  <Text color={isSelected ? theme.text : theme.muted} bold={isSelected}>{title}</Text>
                  {isCurrent && <Text color={theme.success}> (current)</Text>}
                  <Text color={tierColor(model.tier)}> [{model.tier}]</Text>
                </Text>
                <Text color={theme.dim}>{`   ${description}`}</Text>
              </Box>
            );
          })}
        </Box>
        {filteredModels.length > 0 && (
          <Text color={theme.dim}>
            {viewport.start + 1}–{viewport.end} of {filteredModels.length} models
          </Text>
        )}
        <Text color={theme.dim}>↑↓ or wheel move · PgUp/PgDn scroll · type to search · Enter select · Esc clear/close</Text>
      </Box>
      <Text color={theme.accent}>{bottomBorder}</Text>
    </Box>
  );
};
