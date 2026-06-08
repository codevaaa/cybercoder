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
 * ╭─ CyberCoder v0.1.34 ─────────────────────────────────────────╮
 * │   [mascot]   minimax-m2.5-free with xhigh effort             │
 * │              C:\Users\PC\project                             │
 * ╰──────────────────────────────────────────────────────────────╯
 */
export const Welcome: React.FC<WelcomeProps> = ({ model = 'auto', provider = 'auto' }) => {
  const t = useTheme();
  const cwd = process.cwd();
  const profile = getUserProfile();
  const userPlan = profile.plan || 'Free Plan';

  const [updateInfo, setUpdateInfo] = React.useState<{ updateAvailable: boolean; latestVersion: string | null } | null>(null);

  React.useEffect(() => {
    checkForUpdates().then(info => {
      if (info.updateAvailable) {
        setUpdateInfo(info);
      }
    });
  }, []);

  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  // Use full terminal width minus a small margin to be fully responsive
  const contentWidth = Math.max(termWidth - 4, 40);

  // Calculate the custom top border with embedded title
  const title = ` ${CYBERCODER_NAME} v${CYBERCODER_VERSION} `;
  const dashLength = Math.max(2, contentWidth - title.length);

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      {/* Custom Top Border */}
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
        <Box marginRight={2} marginLeft={2}>
          <Mascot />
        </Box>
        <Box flexDirection="column" justifyContent="center">
          <Text color={t.muted}>
            <Text bold color={t.text}>{model}</Text> with <Text color={t.accentAlt}>{provider}</Text> · {userPlan}
          </Text>
          <Text color={t.dim} wrap="truncate-middle">{cwd}</Text>
        </Box>
      </Box>

      {/* Custom Bottom Border */}
      <Text color={t.accent}>╰{'─'.repeat(contentWidth)}╯</Text>

      {updateInfo && (
        <Box marginTop={1} paddingLeft={2}>
          <Text bold color="yellow">🚀 Update available: {CYBERCODER_VERSION} → {updateInfo.latestVersion}</Text>
          <Text color="gray">  Run </Text><Text color="cyan">npm install -g cybercoder-cli@latest</Text><Text color="gray"> to update!</Text>
        </Box>
      )}
    </Box>
  );
};
