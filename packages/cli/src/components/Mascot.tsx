import React from 'react';
import { Box, Text } from 'ink';
import { activeTheme } from '../theme/theme.js';

/**
 * CyberCoder pixel-art mascot — a friendly blocky companion rendered with
 * half-block characters, in the same spirit as Claude Code's little creature
 * but with CyberCoder's terracotta identity.
 *
 *      ██  ██        (antennae)
 *    ████████████
 *    ██ ▔▔ ██ ▔▔ ██  (face with two square eyes)
 *    ████████████
 *      ██      ██     (legs)
 */
export const Mascot: React.FC = () => {
  const c = activeTheme.accent;
  const eye = activeTheme.isLight ? '#FFFFFF' : '#1A1A1A';
  void eye;

  return (
    <Box flexDirection="column">
      <Text color={c}>{'  ▟█▙   ▟█▙  '}</Text>
      <Text color={c}>{' ███████████ '}</Text>
      <Text color={c}>
        {'██'}<Text color={activeTheme.text} backgroundColor={c}>{'██'}</Text>
        {'███'}
        <Text color={activeTheme.text} backgroundColor={c}>{'██'}</Text>{'██'}
      </Text>
      <Text color={c}>{' ███████████ '}</Text>
      <Text color={c}>{'  ██     ██  '}</Text>
    </Box>
  );
};

/**
 * Mini mascot variant for the starry sky scene (smaller, no legs).
 */
export const MiniMascot: React.FC = () => {
  const c = activeTheme.accent;
  return (
    <Box flexDirection="column">
      <Text color={c}>{' ▟█▙ ▟█▙ '}</Text>
      <Text color={c}>{'█████████'}</Text>
      <Text color={c}>
        {'█'}<Text backgroundColor={c}>{'█'}</Text>{'███'}
        <Text backgroundColor={c}>{'█'}</Text>{'█'}
      </Text>
      <Text color={c}>{'█████████'}</Text>
    </Box>
  );
};

/**
 * Decorative starry-night ASCII scene shown above the onboarding mascot,
 * echoing Claude Code's clouds + crescent + sparkles composition. Uses
 * Braille/■ shading characters for the "C" crescent and clouds.
 */
export const SkyScene: React.FC = () => {
  const dim = activeTheme.dim;
  const cloud = activeTheme.muted;
  const star = activeTheme.accentAlt;
  return (
    <Box flexDirection="column">
      <Text color={dim}>{'· · · · · · · · · · · · · · · · · · · · · · · · · ·'}</Text>
      <Text>
        <Text color={star}>{'    ✶        '}</Text>
        <Text color={cloud}>{'░░▒▒        '}</Text>
        <Text color={cloud}>{'  ▒▒▓▓▓▒░'}</Text>
      </Text>
      <Text>
        <Text color={cloud}>{'  ░░▒▒▓▒░     '}</Text>
        <Text color={star}>{'✶   '}</Text>
        <Text color={cloud}>{'▒▓▓    ▓▓'}</Text>
      </Text>
      <Text>
        <Text color={cloud}>{'░▒▒▓▓▓▒░  '}</Text>
        <Text color={star}>{'✶      '}</Text>
        <Text color={cloud}>{'▓▓     ▒▒'}</Text>
      </Text>
      <Text>
        <Text color={star}>{' ✶          '}</Text>
        <Text color={cloud}>{'░▒▓▒░   '}</Text>
        <Text color={cloud}>{'▒▓▓▓▒▒░'}</Text>
      </Text>
      <Text color={dim}>{'· · · · · · · · · · · · · · · · · · · · · · · · · ·'}</Text>
    </Box>
  );
};
