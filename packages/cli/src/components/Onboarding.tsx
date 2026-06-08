import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { exec } from 'node:child_process';
import http from 'node:http';
import { CYBERCODER_VERSION, CYBERCODER_NAME } from '@cybermind/shared';
import { Mascot, SkyScene } from './Mascot.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { activeTheme } from '../theme/theme.js';
import {
  markOnboardingComplete,
  setApiKey,
  setAuthToken,
  setSessionId,
  setUserProfile
} from '../utils/config.js';
import { apiClient } from '../utils/api-client.js';

interface OnboardingProps {
  onComplete: (method: string) => void;
}

type SubScreen = 'main' | 'codeva-login' | 'apikey-input' | 'thirdparty-platforms';

const LOGIN_METHODS = [
  {
    id: 'codeva',
    label: 'Codeva account (Pro, Max, Team)',
    desc: 'Automated OAuth browser sign-in',
  },
  {
    id: 'apikey',
    label: 'API Key (Bring Your Own Key)',
    desc: 'Billed based on API usage',
  },
  {
    id: 'thirdparty',
    label: '3rd-party platform (Ollama, Groq, etc.)',
    desc: 'Local setup and config',
  },
];

const THIRDPARTY_PLATFORMS = [
  { id: 'openrouter', label: 'OpenRouter', desc: 'Get OpenRouter API keys' },
  { id: 'groq', label: 'Groq', desc: 'Get Groq API keys' },
  { id: 'ollama', label: 'Ollama (local)', desc: 'Run locally' },
  { id: 'back', label: 'Go back', desc: '' },
];

const API_PROVIDERS = [
  { id: 'codeva', label: 'Codeva Cloud' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'groq', label: 'Groq' },
  { id: 'google', label: 'Google (Gemini)' },
  { id: 'openrouter', label: 'OpenRouter' },
];

function openBrowser(url: string) {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      exec(`cmd /c start "" "${url}"`, { windowsHide: true });
    } else if (platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch {
    // Silently fail if browser can't be opened
  }
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [screen, setScreen] = useState<SubScreen>('main');
  const [selected, setSelected] = useState(0);

  // local callback server state
  const [port, setPort] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const serverRef = useRef<http.Server | null>(null);

  // API key input state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyProvider, setApiKeyProvider] = useState('codeva');
  const [apiKeyStage, setApiKeyStage] = useState<'provider' | 'key'>('provider');

  // 3rd party state
  const [tpSelected, setTpSelected] = useState(0);

  const termWidth = stdout.columns ?? 80;
  const contentWidth = termWidth - 4;

  // HTTP callback server management
  useEffect(() => {
    if (screen === 'codeva-login') {
      setWaitingForAuth(true);
      setAuthError(null);

      const server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
        if (urlObj.pathname === '/auth') {
          const token = urlObj.searchParams.get('token');
          if (token) {
            const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Successful - Codeva</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: #0d0d12;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    .container {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: #D97757;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: white;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
    }
    p {
      margin: 0;
      color: #a1a1aa;
      font-size: 15px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: #71717a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    <h1>Authentication Successful!</h1>
    <p>You have successfully logged into the Codeva CLI. You can now close this tab and return to your terminal.</p>
    <div class="footer">
      Powered by Codeva Cloud
    </div>
  </div>
  <script>
    setTimeout(() => {
      window.close();
    }, 5000);
  </script>
</body>
</html>
`;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlResponse);

            setAuthToken(token);
            apiClient.authenticate(token)
              .then((authInfo) => {
                setSessionId(authInfo.session_id);
                setUserProfile(authInfo.user);
                markOnboardingComplete('codeva');
                onComplete('codeva');
              })
              .catch((err) => {
                setAuthError(err.message || 'Token verification failed');
                setWaitingForAuth(false);
              });

            // Close server after response finishes
            setTimeout(() => {
              server.close();
            }, 1000);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing token');
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const allocatedPort = typeof addr === 'string' ? 0 : addr?.port || 0;
        setPort(allocatedPort);

        const frontendUrl = process.env.FRONTEND_URL || 'https://cybermindcli.info';
        openBrowser(`${frontendUrl}/login?redirect=cli&port=${allocatedPort}`);
      });

      serverRef.current = server;

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        setAuthError('Authentication timed out. Please try again.');
        setWaitingForAuth(false);
        server.close();
      }, 5 * 60 * 1000);

      return () => {
        clearTimeout(timeout);
        server.close();
      };
    }
  }, [screen, onComplete]);

  // Unified keyboard handler
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (screen === 'main') {
      if (key.escape) {
        exit();
        return;
      }
      if (key.upArrow) {
        setSelected((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setSelected((s) => Math.min(LOGIN_METHODS.length - 1, s + 1));
      } else if (key.return) {
        const method = LOGIN_METHODS[selected];
        if (method?.id === 'codeva') {
          setScreen('codeva-login');
        } else if (method?.id === 'apikey') {
          setScreen('apikey-input');
          setApiKeyStage('provider');
          setApiKeyProvider('codeva');
          setSelected(0);
        } else if (method?.id === 'thirdparty') {
          setScreen('thirdparty-platforms');
          setTpSelected(0);
        }
      }
      return;
    }

    if (screen === 'codeva-login') {
      if (key.escape) {
        setScreen('main');
        setSelected(0);
        return;
      }
      return;
    }

    if (screen === 'apikey-input') {
      if (apiKeyStage === 'provider') {
        if (key.escape) {
          setScreen('main');
          setSelected(1);
          return;
        }
        if (key.upArrow) {
          setSelected((s) => Math.max(0, s - 1));
        } else if (key.downArrow) {
          setSelected((s) => Math.min(API_PROVIDERS.length - 1, s + 1));
        } else if (key.return) {
          const prov = API_PROVIDERS[selected];
          if (prov) {
            setApiKeyProvider(prov.id);
            setApiKeyStage('key');
            setApiKeyInput('');
          }
        }
        return;
      }

      if (key.escape) {
        setApiKeyStage('provider');
        setSelected(0);
        return;
      }
      return;
    }

    if (screen === 'thirdparty-platforms') {
      if (key.escape) {
        setScreen('main');
        setSelected(2);
        return;
      }
      if (key.upArrow) {
        setTpSelected((s) => Math.max(0, s - 1));
      } else if (key.downArrow) {
        setTpSelected((s) => Math.min(THIRDPARTY_PLATFORMS.length - 1, s + 1));
      } else if (key.return) {
        const plat = THIRDPARTY_PLATFORMS[tpSelected];
        if (plat?.id === 'back') {
          setScreen('main');
          setSelected(2);
        } else if (plat) {
          const urls: Record<string, string> = {
            openrouter: 'https://openrouter.ai/keys',
            groq: 'https://console.groq.com/keys',
            ollama: 'https://ollama.com/download',
          };
          const url = urls[plat.id];
          if (url) {
            openBrowser(url);
          }
          markOnboardingComplete('thirdparty');
          onComplete('thirdparty');
        }
      }
      return;
    }
  });

  const renderBorderTop = (title: string) => {
    const titleText = ` ${title} `;
    const dashLength = Math.max(2, contentWidth - titleText.length - 2);
    return <Text color="#D97757">╭{titleText}{'─'.repeat(dashLength)}╮</Text>;
  };

  const renderBorderBottom = () => {
    return <Text color="#D97757">╰{'─'.repeat(contentWidth)}╯</Text>;
  };

  // ── RENDER: Main Screen ──
  if (screen === 'main') {
    const t = activeTheme;
    return (
      <Box flexDirection="column" paddingX={1} width={contentWidth + 4}>
        <Text bold color={t.accent}>Welcome to {CYBERCODER_NAME} v{CYBERCODER_VERSION}</Text>
        <Box marginTop={1}>
          <SkyScene />
        </Box>
        <Box marginTop={1} marginLeft={1}>
          <Mascot />
        </Box>

        <Box flexDirection="column" marginTop={1} paddingX={1}>
          <Text color={t.muted}>
            {CYBERCODER_NAME} can be used with your Codeva subscription or billed
          </Text>
          <Text color={t.muted}>based on API usage through your provider account.</Text>

          <Box marginTop={1}>
            <Text color={t.text} bold>Select login method:</Text>
          </Box>

          <Box marginTop={1} flexDirection="column">
            {LOGIN_METHODS.map((method, i) => (
              <Box key={method.id} flexDirection="row">
                <Text>
                  {i === selected ? (
                    <Text color={t.accent}>{'› '}</Text>
                  ) : (
                    <Text color={t.dim}>{'  '}</Text>
                  )}
                  <Text color={i === selected ? t.text : t.muted} bold={i === selected}>
                    {i + 1}. {method.label}
                  </Text>
                  <Text color={t.dim}> · {method.desc}</Text>
                </Text>
              </Box>
            ))}
          </Box>

          <Box marginTop={1}>
            <Text color={t.dim}>↑↓ navigate · Enter select · ESC exit</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // ── RENDER: Codeva Login Screen ──
  if (screen === 'codeva-login') {
    const frontendUrl = process.env.FRONTEND_URL || 'https://cybermindcli.info';
    return (
      <Box flexDirection="column" paddingX={1} width={contentWidth + 4}>
        {renderBorderTop('Waiting for Authentication')}
        <Box flexDirection="column" paddingX={2} marginY={1}>
          {waitingForAuth ? (
            <Box flexDirection="column" marginBottom={1}>
              <LoadingSpinner text="Waiting for browser authentication..." />
              <Box marginTop={1}>
                <Text color="gray">A browser window should have opened. If not, open:</Text>
                <Text color="cyan">{frontendUrl}/login?redirect=cli&port={port || '...'}</Text>
              </Box>
            </Box>
          ) : (
            <Box flexDirection="column" marginBottom={1}>
              {authError ? (
                <Text color="red" bold>✕ {authError}</Text>
              ) : (
                <Text color="green" bold>✓ Authenticated successfully!</Text>
              )}
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="gray">ESC to go back to main menu</Text>
          </Box>
        </Box>
        {renderBorderBottom()}
      </Box>
    );
  }

  // ── RENDER: API Key Input Screen ──
  if (screen === 'apikey-input') {
    if (apiKeyStage === 'provider') {
      return (
        <Box flexDirection="column" paddingX={1} width={contentWidth + 4}>
          {renderBorderTop('Select API Provider')}
          <Box flexDirection="column" paddingX={2} marginY={1}>
            <Text color="white" bold marginBottom={1}>
              Select an API provider:
            </Text>

            {API_PROVIDERS.map((prov, i) => (
              <Box key={prov.id} flexDirection="row" marginBottom={1}>
                <Text>
                  {i === selected ? (
                    <Text color="#D97757">› </Text>
                  ) : (
                    <Text color="gray">  </Text>
                  )}
                  <Text color={i === selected ? 'white' : 'gray'} bold={i === selected}>
                    {i + 1}. {prov.label}
                  </Text>
                </Text>
              </Box>
            ))}

            <Box marginTop={1}>
              <Text color="gray">↑↓ navigate · Enter select · ESC go back</Text>
            </Box>
          </Box>
          {renderBorderBottom()}
        </Box>
      );
    }

    return (
      <Box flexDirection="column" paddingX={1} width={contentWidth + 4}>
        {renderBorderTop('Enter API Key')}
        <Box flexDirection="column" paddingX={2} marginY={1}>
          <Text color="white" bold marginBottom={1}>
            Paste your API key below:
          </Text>
          <Text color="gray" marginBottom={1}>
            Provider: <Text color="cyan" bold>{apiKeyProvider}</Text>
          </Text>

          <Box flexDirection="row" marginBottom={1}>
            <Text color="gray">{'>'} </Text>
            <TextInput
              value={apiKeyInput}
              onChange={setApiKeyInput}
              onSubmit={() => {
                const trimmed = apiKeyInput.trim();
                if (trimmed) {
                  setApiKey(apiKeyProvider, trimmed);
                  if (apiKeyProvider === 'codeva') {
                    // Try to authenticate with the API key to backend
                    setAuthToken(trimmed);
                    apiClient.authenticate(trimmed)
                      .then((authInfo) => {
                        setSessionId(authInfo.session_id);
                        setUserProfile(authInfo.user);
                        markOnboardingComplete('apikey');
                        onComplete('apikey');
                      })
                      .catch((err) => {
                        // Save key anyway, client can run offline
                        markOnboardingComplete('apikey');
                        onComplete('apikey');
                      });
                  } else {
                    markOnboardingComplete('apikey');
                    onComplete('apikey');
                  }
                }
              }}
              mask="*"
            />
          </Box>

          <Box marginTop={1}>
            <Text color="gray">Enter submit · ESC go back</Text>
          </Box>
        </Box>
        {renderBorderBottom()}
      </Box>
    );
  }

  // ── RENDER: 3rd Party Platforms Screen ──
  if (screen === 'thirdparty-platforms') {
    return (
      <Box flexDirection="column" paddingX={1} width={contentWidth + 4}>
        {renderBorderTop('3rd-Party Platforms')}
        <Box flexDirection="column" paddingX={2} marginY={1}>
          <Text color="white" bold marginBottom={1}>
            Select a local or 3rd-party platform to set up:
          </Text>

          {THIRDPARTY_PLATFORMS.map((plat, i) => (
            <Box key={plat.id} flexDirection="column" marginBottom={1}>
              <Text>
                {i === tpSelected ? (
                  <Text color="#D97757">› </Text>
                ) : (
                  <Text color="gray">  </Text>
                )}
                <Text color={i === tpSelected ? 'white' : 'gray'} bold={i === tpSelected}>
                  {i + 1}. {plat.label}
                </Text>
                {plat.desc && <Text color="gray"> · {plat.desc}</Text>}
              </Text>
            </Box>
          ))}

          <Box marginTop={1}>
            <Text color="gray">↑↓ navigate · Enter select · ESC go back</Text>
          </Box>
        </Box>
        {renderBorderBottom()}
      </Box>
    );
  }

  return null;
};
