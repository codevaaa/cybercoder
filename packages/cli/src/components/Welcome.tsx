import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { CYBERCODER_VERSION, CYBERCODER_NAME } from '@cybermind/shared';
import { Mascot } from './Mascot.js';
import { getUserProfile } from '../utils/config.js';
import { useTheme } from '../theme/useTheme.js';
import { checkForUpdates } from '../utils/updater.js';

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

  const [updateInfo, setUpdateInfo] = React.useState<{ updateAvailable: boolean; latestVersion: string | null } | null>(null);

  React.useEffect(() => {
    checkForUpdates().then(info => {
      if (info.updateAvailable) {
        setUpdateInfo(info);
      }
    });
  }, []);

  const { stdout } = useStdout();
  const termWidth = stdout.columns ?? 80;
  // Use full terminal width minus a small margin to be fully responsive
  const contentWidth = termWidth - 4;

  // Calculate the custom top border with embedded title
  const title = ` ${CYBERCODER_NAME} v${CYBERCODER_VERSION} `;
  const dashLength = Math.max(2, contentWidth - title.length);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Custom Top Border to mimic Claude Code exactly */}
      <Text color={t.accent}>╭─<Text color={t.accent}>{title}</Text>{'─'.repeat(dashLength)}╮</Text>
      
      <Box
        flexDirection="row"
        paddingX={1}
        width={contentWidth + 2}
        borderLeftColor={t.accent}
        borderRightColor={t.accent}
        borderLeft={true}
        borderRight={true}
      >
        {/* Left column: mascot + identity */}
        <Box flexDirection="column" width="45%" paddingRight={1} alignItems="center">
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
        <Box flexDirection="column" paddingX={2}>
          <Text color={t.accent}>{'│\n'.repeat(8)}</Text>
        </Box>

        {/* Right column: tips + what's new */}
        <Box flexDirection="column" flexGrow={1}>
          <Box marginBottom={1}>
            <Text bold color={t.accent}>Tips for getting started</Text>
          </Box>
          <Text color={t.muted}>Run <Text color={t.accentAlt}>/init</Text> to create a CYBER.md with project instructions</Text>
          <Text color={t.muted}>Note: You have launched the agent in your home directory. For the best experience, launch it in a project folder.</Text>
          <Box marginTop={1} marginBottom={1}>
            <Text bold color={t.accent}>What's new</Text>
          </Box>
          <Text color={t.muted}>• Real <Text color={t.text}>/theme</Text> switching repaints the whole UI</Text>
          <Text color={t.muted}>• Multi-model <Text color={t.text}>/consensus</Text> mode for hard problems</Text>
          <Text color={t.muted}>• Working web OAuth sign-in · <Text color={t.text}>/release-notes</Text> for more</Text>
        </Box>
      </Box>

      {/* Custom Bottom Border */}
      <Text color={t.accent}>╰{'─'.repeat(contentWidth)}╯</Text>

      {updateInfo && (
        <Box marginTop={1} flexDirection="column">
          <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
            <Text bold color="yellow">🚀 Update available: {CYBERCODER_VERSION} → {updateInfo.latestVersion}</Text>
            <Text color="gray">Run <Text color="cyan">npm install -g cybercoder-cli@latest</Text> to update!</Text>
          </Box>
        </Box>
      )}

      <Box paddingX={1} marginTop={1}>
        <Text color={t.accentAlt} bold>{model}</Text>
        <Text color={t.muted}> is ready · </Text>
        <Text color={t.muted}>type <Text color={t.text}>/model</Text> to switch</Text>
      </Box>
    </Box>
  );
};
