import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { CYBERCODER_VERSION, CYBERCODER_NAME } from '@cybermind/shared';
import { Mascot } from './Mascot.js';
import { getUserProfile } from '../utils/config.js';
import { useTheme } from '../theme/useTheme.js';

interface WelcomeProps {
  provider?: string;
  model?: string;
}

/**
 * Claude Code-style welcome card:
 * ╭─ CyberCoder v0.1.22 ─────────────────────────────────────────╮
 * │   Welcome back, abhay!      Tips for getting started          │
 * │      [mascot]               Run /init to create a CYBER.md ... │
 * │   model · billing · cwd     What's new                        │
 * │                             ...                               │
 * ╰───────────────────────────────────────────────────────────────╯
 */
export const Welcome: React.FC<WelcomeProps> = ({ model = 'auto', provider = 'auto' }) => {
  const t = useTheme();
  const cwd = process.cwd();
  const profile = getUserProfile();
  const userName = profile.name || process.env.USER || process.env.USERNAME || 'Coder';
  const userPlan = profile.plan || 'Free';

  const { stdout } = useStdout();
  const termWidth = stdout.columns ?? 80;
  const contentWidth = Math.min(termWidth - 4, 84);

  return (
    <Box flexDirection="column">
      <Box
        flexDirection="row"
        borderStyle="round"
        borderColor={t.accent}
        paddingX={1}
        width={contentWidth + 4}
      >
        {/* Left column: mascot + identity */}
        <Box flexDirection="column" width="42%" paddingRight={1} alignItems="center">
          <Text bold color={t.accent}>{CYBERCODER_NAME} v{CYBERCODER_VERSION}</Text>
          <Box marginTop={1}>
            <Text bold color={t.text}>Welcome back, {userName}!</Text>
          </Box>
          <Box marginTop={1}>
            <Mascot />
          </Box>
          <Box marginTop={1} flexDirection="column" alignItems="center">
            <Text color={t.muted}>
              <Text color={t.accentAlt}>{model}</Text> · {userPlan} Plan
            </Text>
            <Text color={t.dim} wrap="truncate-middle">{cwd}</Text>
          </Box>
        </Box>

        {/* Vertical divider */}
        <Box flexDirection="column" paddingX={1}>
          <Text color={t.dim}>{'│\n'.repeat(8)}</Text>
        </Box>

        {/* Right column: tips + what's new */}
        <Box flexDirection="column" width="52%">
          <Text bold color={t.accent}>Tips for getting started</Text>
          <Text color={t.muted}>Run <Text color={t.accentAlt}>/init</Text> to create a CYBER.md with project instructions</Text>
          <Box marginTop={1}>
            <Text bold color={t.accent}>What's new</Text>
          </Box>
          <Text color={t.muted}>• Real <Text color={t.text}>/theme</Text> switching repaints the whole UI</Text>
          <Text color={t.muted}>• Multi-model <Text color={t.text}>/consensus</Text> mode for hard problems</Text>
          <Text color={t.muted}>• Working web OAuth sign-in · <Text color={t.text}>/release-notes</Text> for more</Text>
        </Box>
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text color={t.accentAlt} bold>{model}</Text>
        <Text color={t.muted}> is ready · </Text>
        <Text color={t.muted}>type <Text color={t.text}>/model</Text> to switch</Text>
      </Box>
    </Box>
  );
};
