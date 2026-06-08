import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { apiClient } from '../utils/api-client.js';

interface ModelInfo {
  id: string;
  name: string;
  context: string;
  desc: string;
}

interface ProviderGroup {
  id: string;
  label: string;
  models: ModelInfo[];
}

interface ModelPickerProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

const DEFAULT_PROVIDERS: ProviderGroup[] = [
  {
    id: 'codeva',
    label: 'CyberCoder Mythological Swarm',
    models: [
      { id: 'auto', name: 'Auto (recommended)', context: 'Varies', desc: 'Routes to the best persona' }
    ],
  }
];

export const ModelPicker: React.FC<ModelPickerProps> = ({ currentModel, onSelect, onClose }) => {
  const [providers, setProviders] = useState<ProviderGroup[]>(DEFAULT_PROVIDERS);
  const [loading, setLoading] = useState(true);
  const [providerIdx, setProviderIdx] = useState(0);
  const [modelIdx, setModelIdx] = useState(0);
  const [stage, setStage] = useState<'provider' | 'model'>('provider');

  useEffect(() => {
    async function loadModels() {
      try {
        const data = await apiClient.getModels();
        if (data && data.models) {
          const dynamicModels = data.models.map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            context: m.tier === 'max' ? '200K' : (m.tier === 'pro' ? '128K' : '64K'),
            desc: `Codeva ${m.tier || 'free'} tier model`,
          }));
          
          setProviders([
            {
              id: 'codeva',
              label: `CyberCoder Models (${data.plan || 'free'} plan)`,
              models: [
                { id: 'auto', name: 'Auto (recommended)', context: 'Varies', desc: 'Routes to the best persona' },
                ...dynamicModels
              ],
            }
          ]);
        }
      } catch (err) {
        // Fallback to default if offline or API fails
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, []);

  useInput((_, key) => {
    if (loading) return;

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
        setProviderIdx((i) => Math.min(providers.length - 1, i + 1));
      } else if (key.return) {
        const prov = providers[providerIdx];
        if (prov) {
          // Check if current model is in this provider, pre-select it
          const currentInProv = prov.models.findIndex((m) => m.id === currentModel);
          setModelIdx(currentInProv >= 0 ? currentInProv : 0);
          setStage('model');
        }
      }
    } else {
      const prov = providers[providerIdx];
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

  const currentProv = providers[providerIdx];

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
