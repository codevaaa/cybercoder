import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ModelInfo {
  id: string;
  name: string;
  context: string;
  desc: string;
}

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

const PROVIDERS = [
  {
    id: 'codeva',
    label: 'CyberCoder Mythological Swarm',
    models: [
      { id: 'auto', name: 'Auto (recommended)', context: 'Varies', desc: 'Routes to the best persona' },
      { id: 'codeva-madhav-v1', name: 'Madhav (Strategic Mastermind)', context: '200K', desc: 'Deep architecture and reasoning' },
      { id: 'codeva-kali-v1', name: 'Kali (Destroyer of Bugs)', context: '200K', desc: 'Relentless debugging and security' },
      { id: 'codeva-arjun-v1', name: 'Arjun (Precision Archer)', context: '64K', desc: 'Lightning fast UI and inline edits' },
      { id: 'codeva-abhimanyu-v1', name: 'Abhimanyu (Fearless Breaker)', context: '128K', desc: 'Deep-dive local reasoning traps' },
    ] as ModelInfo[],
  }
];

export const ModelPicker: React.FC<ModelPickerProps> = ({ currentModel, onSelect, onClose }) => {
  const [providerIdx, setProviderIdx] = useState(0);
  const [modelIdx, setModelIdx] = useState(0);
  const [stage, setStage] = useState<'provider' | 'model'>('provider');

  useInput((_, key) => {
    if (key.escape) {
      if (stage === 'model') {
        setStage('provider');
        setModelIdx(0);
      } else {
        onClose();
      }
      return;
    }

    if (stage === 'provider') {
      if (key.upArrow) {
        setProviderIdx((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setProviderIdx((i) => Math.min(PROVIDERS.length - 1, i + 1));
      } else if (key.return) {
        const prov = PROVIDERS[providerIdx];
        if (prov) {
          // Check if current model is in this provider, pre-select it
          const currentInProv = prov.models.findIndex((m) => m.id === currentModel);
          setModelIdx(currentInProv >= 0 ? currentInProv : 0);
          setStage('model');
        }
      }
    } else {
      const prov = PROVIDERS[providerIdx];
      if (!prov) return;
      if (key.upArrow) {
        setModelIdx((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setModelIdx((i) => Math.min(prov.models.length - 1, i + 1));
      } else if (key.return) {
        const model = prov.models[modelIdx];
        if (model) onSelect(model.id);
      }
    }
  });

  const currentProv = PROVIDERS[providerIdx];

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#D97736">{'╭─ Model Selection ─────────────────────────────────────────────╮'}</Text>

      <Box flexDirection="column" paddingLeft={2} paddingRight={2} marginTop={1}>
        {stage === 'provider' && (
          <>
            <Text bold color="white">Select a provider:</Text>
            <Box marginTop={1} />
            {PROVIDERS.map((prov, i) => (
              <Box key={prov.id} flexDirection="row" marginBottom={1}>
                <Text>
                  {i === providerIdx ? (
                    <Text color="#D97736">{'› '}</Text>
                  ) : (
                    <Text color="gray">{'  '}</Text>
                  )}
                  <Text color={i === providerIdx ? 'white' : 'gray'} bold={i === providerIdx}>
                    {prov.label}
                  </Text>
                  <Text color="gray"> ({prov.models.length} models)</Text>
                </Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color="gray">Arrow keys to navigate, Enter to select, ESC to close</Text>
          </>
        )}

        {stage === 'model' && currentProv && (
          <>
            <Text bold color="white">{currentProv.label} — Select model:</Text>
            <Box marginTop={1} />
            {currentProv.models.map((m, i) => (
              <Box key={m.id} flexDirection="column" marginBottom={1}>
                <Text>
                  {i === modelIdx ? (
                    <Text color="#D97736">{'› '}</Text>
                  ) : (
                    <Text color="gray">{'  '}</Text>
                  )}
                  <Text color={i === modelIdx ? 'white' : 'gray'} bold={i === modelIdx}>
                    {m.name}
                  </Text>
                  {m.id === currentModel && <Text color="green">{' (current)'}</Text>}
                </Text>
                <Text color="gray">     Context: {m.context} · {m.desc}</Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color="gray">Arrow keys to navigate, Enter to select, ESC to go back</Text>
          </>
        )}
      </Box>

      <Text color="#D97736">{'╰──────────────────────────────────────────────────────────────────╯'}</Text>
    </Box>
  );
};
