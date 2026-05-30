import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { SkyScene, Mascot } from './Mascot.js';
import { THEME_OPTIONS, resolvePalette, setActiveTheme, type ThemeMode } from '../theme/theme.js';
import { CYBERCODER_NAME, CYBERCODER_VERSION } from '@cybermind/shared';

export interface ThemeConfig {
  mode: ThemeMode;
  syntaxTheme: string;
}

interface ThemePickerProps {
  onComplete: (theme: ThemeConfig) => void;
}

const SYNTAX_THEMES = [
  'Monokai Extended',
  'Dracula',
  'One Dark',
  'Solarized Dark',
  'GitHub Light',
];

export const ThemePicker: React.FC<ThemePickerProps> = ({ onComplete }) => {
  const [selected, setSelected] = useState(1); // Default to dark mode
  const [syntaxIdx, setSyntaxIdx] = useState(0);
  const [stage, setStage] = useState<'theme' | 'syntax'>('theme');

  // Live preview palette reflects the currently highlighted option.
  const previewMode = THEME_OPTIONS[stage === 'theme' ? selected : selected]?.id ?? 'dark';
  const preview = resolvePalette(previewMode as ThemeMode);

  useInput((_, key) => {
    if (stage === 'theme') {
      if (key.upArrow) {
        setSelected((s) => {
          const next = Math.max(0, s - 1);
          setActiveTheme(THEME_OPTIONS[next]!.id); // live repaint while browsing
          return next;
        });
      } else if (key.downArrow) {
        setSelected((s) => {
          const next = Math.min(THEME_OPTIONS.length - 1, s + 1);
          setActiveTheme(THEME_OPTIONS[next]!.id);
          return next;
        });
      } else if (key.return) {
        setStage('syntax');
      }
    } else {
      if (key.upArrow) {
        setSyntaxIdx((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSyntaxIdx((s) => Math.min(SYNTAX_THEMES.length - 1, s + 1));
      } else if (key.return) {
        const theme = THEME_OPTIONS[selected];
        const syntax = SYNTAX_THEMES[syntaxIdx];
        if (theme && syntax) {
          onComplete({ mode: theme.id, syntaxTheme: syntax });
        }
      }
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Sky scene header (Claude Code style) */}
      <Text bold color={preview.accent}>Welcome to {CYBERCODER_NAME} v{CYBERCODER_VERSION}</Text>
      <Box marginTop={1}>
        <SkyScene />
      </Box>
      <Box marginTop={1} marginLeft={1}>
        <Mascot />
      </Box>

      <Box flexDirection="column" marginTop={1} paddingLeft={1}>
        <Text bold color={preview.text}>Let&apos;s get started.</Text>
        <Box marginTop={1} />

        {stage === 'theme' && (
          <>
            <Text bold color={preview.accent}>Choose the text style that looks best with your terminal</Text>
            <Text color={preview.muted}>To change this later, run /theme</Text>
            <Box marginTop={1} />
            {THEME_OPTIONS.map((opt, i) => (
              <Box key={opt.id} flexDirection="row">
                <Text>
                  {i === selected ? (
                    <Text color={preview.accent}>{'› '}</Text>
                  ) : (
                    <Text color={preview.dim}>{'  '}</Text>
                  )}
                  <Text color={i === selected ? preview.text : preview.muted} bold={i === selected}>
                    {i + 1}. {opt.label}
                  </Text>
                  {i === selected && <Text color={preview.success}>{'  ✓'}</Text>}
                </Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color={preview.dim}>↑↓ to preview · Enter to confirm</Text>
          </>
        )}

        {stage === 'syntax' && (
          <>
            <Text bold color={preview.accent}>Choose syntax highlighting theme:</Text>
            <Box marginTop={1} />
            {SYNTAX_THEMES.map((name, i) => (
              <Box key={name} flexDirection="row">
                <Text>
                  {i === syntaxIdx ? (
                    <Text color={preview.accent}>{'› '}</Text>
                  ) : (
                    <Text color={preview.dim}>{'  '}</Text>
                  )}
                  <Text color={i === syntaxIdx ? preview.text : preview.muted} bold={i === syntaxIdx}>
                    {i + 1}. {name}
                  </Text>
                </Text>
              </Box>
            ))}
            <Box marginTop={1} />
            <Text color={preview.dim}>↑↓ navigate · Enter to confirm</Text>
          </>
        )}

        {/* Live code preview with the previewed palette */}
        <Box marginTop={1} />
        <Text color={preview.dim}>{'─'.repeat(48)}</Text>
        <Box flexDirection="row">
          <Text color={preview.dim}>{'1 '}</Text>
          <Text color={preview.info}>function </Text>
          <Text color={preview.warning}>greet</Text>
          <Text color={preview.text}>() {'{'}</Text>
        </Box>
        <Box flexDirection="row">
          <Text color={preview.dim}>{'2 '}</Text>
          <Text color={preview.error}>{'- '}console.log("Hello, World!");</Text>
        </Box>
        <Box flexDirection="row">
          <Text color={preview.dim}>{'2 '}</Text>
          <Text color={preview.success}>{'+ '}console.log("Hello, CyberCoder!");</Text>
        </Box>
        <Box flexDirection="row">
          <Text color={preview.dim}>{'3 '}</Text>
          <Text color={preview.text}>{'}'}</Text>
        </Box>
        <Text color={preview.dim}>{'─'.repeat(48)}</Text>
      </Box>
    </Box>
  );
};
