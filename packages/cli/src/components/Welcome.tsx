import React from 'react';
import { Box, Text } from 'ink';
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
 * Claude Code-style minimal welcome card:
 * 
 *  [mascot]  CyberCoder v0.1.33
 *            auto · Free Plan
 *            C:\Users\PC\project
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

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box flexDirection="row">
        {/* Left column: mascot */}
        <Box marginRight={2}>
          <Mascot />
        </Box>

        {/* Right column: app info */}
        <Box flexDirection="column">
          <Text bold color={t.text}>{CYBERCODER_NAME} v{CYBERCODER_VERSION}</Text>
          <Text color={t.muted}>
            {model} · {userPlan}
          </Text>
          <Text color={t.dim} wrap="truncate-middle">{cwd}</Text>
        </Box>
      </Box>

      {updateInfo && (
        <Box marginTop={1} paddingLeft={2}>
          <Text bold color="yellow">🚀 Update available: {CYBERCODER_VERSION} → {updateInfo.latestVersion}</Text>
          <Text color="gray">  Run </Text><Text color="cyan">npm install -g cybercoder-cli@latest</Text><Text color="gray"> to update!</Text>
        </Box>
      )}
    </Box>
  );
};
