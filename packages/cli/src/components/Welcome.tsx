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
 * Claude Code–style compact welcome card:
 *
 *   ╭─ CyberCoder v0.1.37 ────────────────────────────────────────────────────╮
 *   │                         │ Tips for getting started                       │
 *   │   Welcome back!         │ Run /init to create a CYBER.md file …          │
 *   │       ░▒█               │                                               │
 *   │      ░▒▒█               │ What's new                                    │
 *   │   model · plan          │ Bug fixes …                                   │
 *   │   C:\Users\PC           │ /release-notes for more                       │
 *   ╰─────────────────────────┴────────────────────────────────────────────────╯
 */
export const Welcome: React.FC<WelcomeProps> = ({ model = 'auto', provider = 'auto' }) => {
  const t = useTheme();
  const cwd = process.cwd();
  const profile = getUserProfile();
  const userPlan = profile.plan || 'free';

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
  const dashAfterTitle = Math.max(2, contentWidth - title.length - 2);

  // Model display text: "auto with auto · free"
  const modelLine = `${model}`;
  const planLine = `${provider} · ${userPlan}`;
  // Truncate cwd if needed
  const maxCwdLen = 30;
  const cwdShort = cwd.length > maxCwdLen ? cwd.slice(0, maxCwdLen - 3) + '...' : cwd;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={0}>
      {/* ── Top Border ── */}
      <Text color={t.accent}>{'╭─'}{title}{'─'.repeat(dashAfterTitle)}{'╮'}</Text>

      {/* ── Body ── */}
      <Box flexDirection="row">
        {/* Left border */}
        <Text color={t.accent}>│</Text>

        {/* Left column: mascot + model info */}
        <Box flexDirection="column" alignItems="center" paddingX={2} paddingY={1} width={Math.floor(contentWidth * 0.35)}>
          <Text bold color={t.text}>Welcome back!</Text>
          <Box marginTop={1} marginBottom={1}>
            <Mascot />
          </Box>
          <Text color={t.muted}><Text bold color={t.text}>{modelLine}</Text> with <Text color={t.accentAlt || t.accent}>{planLine}</Text></Text>
          <Text color={t.dim}>{cwdShort}</Text>
        </Box>

        {/* Middle divider */}
        <Text color={t.accent}>│</Text>

        {/* Right column: tips + what's new */}
        <Box flexDirection="column" paddingLeft={1} paddingY={1} width={Math.floor(contentWidth * 0.65)}>
          <Text bold color={t.accentAlt || t.accent}>Tips for getting started</Text>
          <Text color={t.muted}>Run /init to create a CYBER.md file with instructions for {CYBERCODER_NAME}</Text>
          <Box marginTop={1} />
          <Text bold color={t.accentAlt || t.accent}>What's new</Text>
          <Text color={t.muted}>Bug fixes and reliability improvements</Text>
          <Text color={t.muted}>Added 4 Supreme Models: Madhav, Kali, Abhimanyu, Trinity</Text>
          <Text color={t.dim} italic>/release-notes for more</Text>
        </Box>

        {/* Right border */}
        <Text color={t.accent}>│</Text>
      </Box>

      {/* ── Bottom Border ── */}
      <Text color={t.accent}>{'╰'}{'─'.repeat(contentWidth)}{'╯'}</Text>

      {updateInfo && (
        <Box marginTop={0} paddingLeft={2}>
          <Text bold color="yellow">🚀 Update available: {CYBERCODER_VERSION} → {updateInfo.latestVersion}</Text>
          <Text color="gray">  Run </Text><Text color="cyan">npm install -g cybercoder-cli@latest</Text><Text color="gray"> to update!</Text>
        </Box>
      )}
    </Box>
  );
};
