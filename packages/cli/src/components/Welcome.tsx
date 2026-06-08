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
  const contentWidth = Math.max(termWidth - 4, 60);

  const title = ` ${CYBERCODER_NAME} v${CYBERCODER_VERSION} `;
  const dashLength = Math.max(2, contentWidth - title.length);

  // Divide width roughly 45% / 55%
  const leftWidth = Math.floor(contentWidth * 0.45);
  const rightWidth = contentWidth - leftWidth - 1; // -1 for the middle border character

  // Make sure model text fits in left column
  const modelText = `${model} with ${provider} · ${userPlan}`;
  const truncatedModelText = modelText.length > leftWidth - 2 ? modelText.slice(0, leftWidth - 5) + '...' : modelText;
  
  // Truncate path if too long
  const truncatedCwd = cwd.length > leftWidth - 2 ? '...' + cwd.slice(-(leftWidth - 5)) : cwd;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Text color={t.accent}>╭─<Text color={t.accent}>{title}</Text>{'─'.repeat(dashLength)}╮</Text>
      
      <Box flexDirection="row" width={contentWidth + 2}>
        <Text color={t.accent}>│</Text>
        
        {/* Left Column */}
        <Box width={leftWidth} flexDirection="column" alignItems="center" paddingTop={1} paddingBottom={1} paddingX={1}>
          <Text bold color={t.text}>Welcome back!</Text>
          <Box marginTop={1} marginBottom={1}>
            <Mascot />
          </Box>
          <Text color={t.muted}>{truncatedModelText}</Text>
          <Text color={t.dim}>{truncatedCwd}</Text>
        </Box>

        {/* Middle Border */}
        <Box flexDirection="column">
          <Text color={t.accent}>│</Text>
          <Text color={t.accent}>│</Text>
          <Text color={t.accent}>│</Text>
          <Text color={t.accent}>│</Text>
          <Text color={t.accent}>│</Text>
          <Text color={t.accent}>│</Text>
          <Text color={t.accent}>│</Text>
        </Box>

        {/* Right Column */}
        <Box width={rightWidth} flexDirection="column" paddingLeft={2} paddingTop={1}>
          <Box marginBottom={1}>
            <Text bold color={t.accentAlt || t.accent}>Tips for getting started</Text>
            <Text color={t.muted}>Run /init to create a CYBER.md file with instructions for {CYBERCODER_NAME}</Text>
          </Box>
          
          <Text bold color={t.accentAlt || t.accent}>What's new</Text>
          <Text color={t.muted}>Bug fixes and reliability improvements</Text>
          <Text color={t.muted}>Bug fixes and reliability improvements</Text>
          <Text color={t.muted}>Added robust slash commands and improved UI layout.</Text>
          <Text color={t.dim} italic>/release-notes for more</Text>
        </Box>

        <Text color={t.accent}>│</Text>
      </Box>

      {/* Bottom Border */}
      <Text color={t.accent}>╰{'─'.repeat(leftWidth)}┴{'─'.repeat(rightWidth)}╯</Text>

      {updateInfo && (
        <Box marginTop={1} paddingLeft={2}>
          <Text bold color="yellow">🚀 Update available: {CYBERCODER_VERSION} → {updateInfo.latestVersion}</Text>
          <Text color="gray">  Run </Text><Text color="cyan">npm install -g cybercoder-cli@latest</Text><Text color="gray"> to update!</Text>
        </Box>
      )}
    </Box>
  );
};
