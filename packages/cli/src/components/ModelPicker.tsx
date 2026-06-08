import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useTheme } from '../theme/useTheme.js';

interface ModelInfo {
  id: string;
  name: string;
  tier: string;
  desc: string;
}

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

/**
 * The 4 Codeva Mythological Swarm Models + Auto.
 * These are the ONLY models shown to users — they map to backend routing.
 * No raw API model names (groq/xxx, cerebras/xxx) are exposed.
 */
const SUPREME_MODELS: ModelInfo[] = [
  { id: 'auto',      name: 'Auto (recommended)',                    tier: 'all',      desc: 'Routes to the best available persona for the task' },
  { id: 'madhav',    name: 'Madhav (Pro — Strategic Mastermind)',    tier: 'pro',      desc: 'Deep codebase understanding, complex architecture planning' },
  { id: 'kali',      name: 'Kali (Standard — Destroyer of Bugs)',   tier: 'standard', desc: 'Relentless debugging, finding edge-case vulnerabilities' },
  { id: 'abhimanyu', name: 'Abhimanyu (Basic — Deep Context)',      tier: 'basic',    desc: 'Deep-dive local reasoning for breaking complex logic traps' },
  { id: 'trinity',   name: 'Trinity (Free — The Powerhouse)',       tier: 'free',     desc: 'Fast, logic-perfect execution for free tier users' },
];

export const ModelPicker: React.FC<ModelPickerProps> = ({ currentModel, onSelect, onClose }) => {
  const t = useTheme();
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const contentWidth = Math.max(termWidth - 6, 50);

  // Pre-select the current model
  const initialIdx = SUPREME_MODELS.findIndex((m) => m.id === currentModel);
  const [selectedIdx, setSelectedIdx] = useState(initialIdx >= 0 ? initialIdx : 0);

  useInput((_, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIdx((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIdx((i) => Math.min(SUPREME_MODELS.length - 1, i + 1));
    } else if (key.return) {
      const model = SUPREME_MODELS[selectedIdx];
      if (model) onSelect(model.id);
    }
  });

  const dashLength = Math.max(2, contentWidth - ' Model Selection '.length - 2);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top border */}
      <Text color={t.accent}>{'╭─ Model Selection '}{' ─'.repeat(1)}{'─'.repeat(dashLength)}{'╮'}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2} marginTop={1} marginBottom={1}>
        <Text bold color={t.text}>CyberCoder Mythological Swarm — Select model:</Text>
        <Box marginTop={1} />

        {SUPREME_MODELS.map((m, i) => {
          const isSelected = i === selectedIdx;
          const isCurrent = m.id === currentModel;
          
          // Tier badge colors
          const tierColor = m.tier === 'pro' ? '#FF6B6B' : m.tier === 'standard' ? '#FFD93D' : m.tier === 'basic' ? '#6BCB77' : m.tier === 'free' ? '#4D96FF' : t.accent;

          return (
            <Box key={m.id} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row">
                <Text>
                  {isSelected ? (
                    <Text color={t.accent}>{'› '}</Text>
                  ) : (
                    <Text color={t.dim}>{'  '}</Text>
                  )}
                  <Text color={isSelected ? t.text : t.muted} bold={isSelected}>
                    {m.name}
                  </Text>
                  {isCurrent && <Text color={t.success}>{' (current)'}</Text>}
                  {' '}
                  <Text color={tierColor}>[{m.tier}]</Text>
                </Text>
              </Box>
              <Text color={t.dim}>{'     '}{m.desc}</Text>
            </Box>
          );
        })}

        <Box marginTop={1} />
        <Text color={t.dim}>↑↓ navigate · Enter select · ESC close</Text>
      </Box>

      {/* Bottom border */}
      <Text color={t.accent}>{'╰'}{'─'.repeat(contentWidth)}{'╯'}</Text>
    </Box>
  );
};
