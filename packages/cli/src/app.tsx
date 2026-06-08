import { Box, Text, useApp, useInput } from 'ink';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Welcome } from './components/Welcome.js';
import { Onboarding } from './components/Onboarding.js';
import { ThemePicker, type ThemeConfig } from './components/ThemePicker.js';
import { Settings } from './components/Settings.js';
import { ModelPicker } from './components/ModelPicker.js';
import { ReleaseNotes } from './components/ReleaseNotes.js';
import { Prompt } from './components/Prompt.js';
import { MessageList } from './components/MessageList.js';
import { StatusBar } from './components/StatusBar.js';
import { ThinkingIndicator } from './components/ThinkingIndicator.js';
import { ExitConfirm } from './components/ExitConfirm.js';
import { ApprovalDialog, type PendingApproval } from './components/ApprovalDialog.js';
import { HintBar } from './components/HintBar.js';
import { buildCommandRegistry } from './commands/index.js';
import { runChat, runGoalChat } from './runtime/chat.js';
import { runHooks } from './runtime/hooks.js';
import { isOnboardingComplete, getTheme, setTheme, clearLogin, isAuthenticated } from './utils/config.js';
import { getUpdateMessage } from './utils/update.js';
import { setActiveTheme, type ThemeMode } from './theme/theme.js';
import type { ApprovalDecision, ApprovalPrompt, ApprovalUI } from '@cybermind/tools';
import type { SessionMessage, SessionStatus } from './state/session.js';

type Screen = 'onboarding' | 'theme' | 'settings' | 'model' | 'release-notes' | 'welcome' | 'chat';

interface AppProps {
  showWelcome: boolean;
  initialModel?: string;
  initialProvider?: string;
}

export const App: React.FC<AppProps> = ({ showWelcome, initialModel, initialProvider }) => {
  const { exit } = useApp();

  const configTheme = getTheme();
  // Apply the persisted theme to the live palette as early as possible so the
  // very first render already uses the user's chosen colors.
  const [themeVersion, setThemeVersion] = useState(0);
  if (themeVersion === 0) {
    setActiveTheme((configTheme.mode as ThemeMode) ?? 'dark');
  }
  const hasCompletedOnboarding = isOnboardingComplete() && isAuthenticated();
  const [screen, setScreen] = useState<Screen>(hasCompletedOnboarding ? 'welcome' : 'onboarding');
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>({
    mode: configTheme.mode as ThemeConfig['mode'],
    syntaxTheme: configTheme.syntaxTheme,
  });
  void themeConfig; // used to track current theme across the app

  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [model, setModel] = useState<string>(initialModel ?? 'auto');
  const [provider, setProvider] = useState<string>(initialProvider ?? 'auto');
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined);
  const [, setPromptColor] = useState<string>('cyan');
  const [welcomeVisible, setWelcomeVisible] = useState<boolean>(showWelcome);
  const [exitConfirm, setExitConfirm] = useState<boolean>(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [updateNotice, setUpdateNotice] = useState<string>('');
  const [terminalHeight, setTerminalHeight] = useState<number>(process.stdout.rows || 24);

  useEffect(() => {
    const handleResize = () => setTerminalHeight(process.stdout.rows || 24);
    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  // Check for updates on startup (chat/welcome screens only)
  useEffect(() => {
    if (screen === 'chat' || screen === 'welcome') {
      void getUpdateMessage().then((msg) => {
        if (msg) setUpdateNotice(msg);
      });
    }
  }, [screen]);
  // Holds the live mutable id of the assistant message currently being streamed.
  const streamingIdRef = useRef<string | null>(null);
  // Forward-declared so slash-command handlers can submit synthesized prompts
  // before driveChat is created below (e.g. /research, /plan).
  const driveChatRef = useRef<(text: string) => Promise<void>>(async () => {});

  // ApprovalUI implementation that defers the decision to the Ink dialog.
  const approvalUI = useMemo<ApprovalUI>(
    () => ({
      ask(prompt: ApprovalPrompt): Promise<ApprovalDecision> {
        return new Promise<ApprovalDecision>((resolve) => {
          setPendingApproval({
            toolName: prompt.toolName,
            summary: prompt.summary,
            destructive: prompt.destructive,
            resolve: (decision) => {
              setPendingApproval(null);
              resolve(decision);
            },
          });
        });
      },
    }),
    [],
  );

  const appendMessage = useCallback((msg: SessionMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setWelcomeVisible(true);
  }, []);

  const commandRegistry = useMemo(
    () =>
      buildCommandRegistry({
        clear: clearMessages,
        exit: () => exit(),
        appendMessage,
        submitUserPrompt: (text) => {
          // Slash-command shortcuts (e.g. /research) call this to inject a
          // synthesized user message that the main agent then processes.
          void driveChatRef.current(text);
        },
        getModel: () => model,
        setModel,
        getProvider: () => provider,
        setProvider,
        setPromptColor,
        setScreen: (s: string) => setScreen(s as Screen),
        logout: () => {
          clearLogin();
          setMessages([]);
          setWelcomeVisible(true);
          setScreen('onboarding');
        },
        getMessages: () => messages,
        setMessages: (msgs) => setMessages(msgs),
      }),
    [appendMessage, clearMessages, exit, model, provider, setScreen, setMessages, setWelcomeVisible, messages],
  );

  // Handle Ctrl+C: first press asks for confirmation, second press exits.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (exitConfirm) {
        exit();
      } else {
        setExitConfirm(true);
        // Auto-clear after 2s
        setTimeout(() => setExitConfirm(false), 2000);
      }
    }
  });

  /** Append a streaming text delta into the active assistant message. */
  const appendDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      const id = streamingIdRef.current;
      if (!id) return prev;
      return prev.map((m) => (m.id === id ? { ...m, content: m.content + delta } : m));
    });
  }, []);

  const driveChat = useCallback(
    async (userText: string, goalMode = false) => {
      const userMsg: SessionMessage = {
        id: cryptoRandomId(),
        role: 'user',
        content: userText,
        createdAt: Date.now(),
      };
      const assistantId = cryptoRandomId();
      streamingIdRef.current = assistantId;
      const assistantMsg: SessionMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      // Build the history snapshot the agent loop sees (user appended).
      const nextHistory = [...messages, userMsg];
      setMessages([...nextHistory, assistantMsg]);
      setStatus('thinking');

      const driver = goalMode ? runGoalChat : runChat;

      try {
        await driver(nextHistory, {
          model,
          approvalUI,
          onEvent: (evt) => {
            if ((evt as any).type === 'status') {
              setStatusMessage((evt as any).text || (evt as any).content || (evt as any).message);
            } else if (evt.type === 'text') {
              if (statusMessage) setStatusMessage(undefined);
              appendDelta(evt.text);
            } else if (evt.type === 'tool_call') {
              setStatus('awaiting-approval');
              appendDelta(`\n[→ ${evt.name}] ${stringifyArgs(evt.input)}\n`);
            } else if (evt.type === 'tool_result') {
              setStatus('thinking');
              const trimmed = evt.output.length > 800 ? `${evt.output.slice(0, 800)}\n…[truncated]` : evt.output;
              appendDelta(`\n${trimmed}\n`);
            } else if (evt.type === 'usage') {
              setTotalTokens((prev) => prev + evt.inputTokens + evt.outputTokens);
              const costAmt = evt.inputTokens * 0.000003 + evt.outputTokens * 0.000015;
              setTotalCost((prev) => prev + costAmt);
            } else if (evt.type === 'context') {
              // Surface auto-compaction / retry notices inline, dimmed.
              appendDelta(`\n[· ${evt.note} ·]\n`);
            } else if (evt.type === 'done') {
              if (evt.reason === 'error') {
                appendDelta(`\n[error] ${evt.error ?? 'unknown'}`);
              }
            }
          },
        });
      } catch (err) {
        appendDelta(`\n[fatal] ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        streamingIdRef.current = null;
        setStatus('idle');
        // postTask hooks (e.g. auto-run tests after the agent finishes).
        try {
          const h = runHooks('postTask', userText);
          if (h.output) {
            appendMessage({ id: cryptoRandomId(), role: 'system', content: h.output, createdAt: Date.now() });
          }
        } catch {
          /* hooks must never break the session */
        }
      }
    },
    [messages, model, appendDelta, approvalUI],
  );

  // Keep the ref pointing at the latest driveChat closure so slash-command
  // shortcuts always see fresh state when they inject synthesized prompts.
  driveChatRef.current = driveChat;

  const handleSubmit = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      // Remove welcomeVisible = false so the header stays in DOM and scrolls up naturally
      // like Claude Code does.

      // Slash command dispatch
      if (text.startsWith('/')) {
        const trimmed = text.slice(1).trim();
        // Just `/` with no command → show all commands (discovery mode)
        if (!trimmed) {
          const helpCmd = commandRegistry.find('help');
          if (helpCmd) {
            helpCmd.run('');
          } else {
            appendMessage({
              id: cryptoRandomId(),
              role: 'system',
              content: 'Type /help to see all available commands.',
              createdAt: Date.now(),
            });
          }
          return;
        }
        const [name, ...rest] = trimmed.split(/\s+/);
        const args = rest.join(' ');

        // /goal <objective> — drive the goal loop until complete.
        if (name === 'goal') {
          if (!args.trim()) {
            appendMessage({
              id: cryptoRandomId(),
              role: 'system',
              content: 'Usage: /goal <objective> — I will work autonomously until it is done.',
              createdAt: Date.now(),
            });
            return;
          }
          void driveChat(args, true);
          return;
        }

        const cmd = commandRegistry.find(name ?? '');
        if (!cmd) {
          appendMessage({
            id: cryptoRandomId(),
            role: 'system',
            content: `Unknown command: /${name}. Type / for a list.`,
            createdAt: Date.now(),
          });
          return;
        }
        try {
          cmd.run(args);
        } catch (err) {
          appendMessage({
            id: cryptoRandomId(),
            role: 'system',
            content: `Error in /${name}: ${err instanceof Error ? err.message : String(err)}`,
            createdAt: Date.now(),
          });
        }
        return;
      }

      // Drive the real agent loop (M2).
      void driveChat(text);
    },
    [appendMessage, commandRegistry, welcomeVisible, driveChat],
  );

  // Screen navigation handlers
  const handleOnboardingComplete = useCallback((method: string) => {
    void method;
    setScreen('theme');
  }, []);

  const handleThemeComplete = useCallback((theme: ThemeConfig) => {
    setThemeConfig(theme);
    setTheme(theme.mode, theme.syntaxTheme);
    // Apply immediately to the live palette so the whole UI re-paints.
    setActiveTheme(theme.mode as ThemeMode);
    setThemeVersion((v) => v + 1);
    setScreen('welcome');
  }, []);

  const handleSettingsClose = useCallback(() => {
    setScreen('chat');
  }, []);

  const handleModelSelect = useCallback((modelId: string) => {
    setModel(modelId);
    setScreen('chat');
  }, []);

  const handleModelClose = useCallback(() => {
    setScreen('chat');
  }, []);

  const handleReleaseNotesClose = useCallback(() => {
    setScreen('chat');
  }, []);

  // Render based on current screen
  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case 'theme':
        return <ThemePicker onComplete={handleThemeComplete} />;
      case 'settings':
        return <Settings onClose={handleSettingsClose} />;
      case 'model':
        return <ModelPicker currentModel={model} onSelect={handleModelSelect} onClose={handleModelClose} />;
      case 'release-notes':
        return <ReleaseNotes onClose={handleReleaseNotesClose} />;
      case 'welcome':
      case 'chat':
      default:
        return (
          <Box flexDirection="column" flexGrow={1}>
            {updateNotice && (
              <Box marginBottom={1}>
                <Text color="yellow">{updateNotice}</Text>
              </Box>
            )}
            {welcomeVisible && <Welcome provider={provider} model={model} />}
            <MessageList messages={messages} />
            {pendingApproval && <ApprovalDialog pending={pendingApproval} />}
            {status === 'thinking' && <ThinkingIndicator tokens={totalTokens} label={statusMessage} />}
            
            <Box flexGrow={1} />
            
            <StatusBar status={status} model={model} provider={provider} tokens={totalTokens} cost={totalCost} />
            <Prompt onSubmit={handleSubmit} disabled={status !== 'idle'} />
            <HintBar status={status} />
            {exitConfirm && <ExitConfirm />}
          </Box>
        );
    }
  };

  return (
    <Box flexDirection="column" minHeight={terminalHeight}>
      {renderScreen()}
    </Box>
  );
};

function cryptoRandomId(): string {
  // Avoid pulling in `node:crypto` for the renderer; a short random suffices.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function stringifyArgs(input: Record<string, unknown>): string {
  // Compact, single-line preview of tool arguments for the chat transcript.
  const pairs = Object.entries(input).map(([k, v]) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    const short = s.length > 80 ? `${s.slice(0, 80)}…` : s;
    return `${k}=${short}`;
  });
  return pairs.join(', ');
}
