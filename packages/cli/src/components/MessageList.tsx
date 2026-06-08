import React from 'react';
import { Box, Text } from 'ink';
import type { SessionMessage } from '../state/session.js';
import { activeTheme } from '../theme/theme.js';

interface Props {
  messages: SessionMessage[];
}

const ROLE_LABEL: Record<SessionMessage['role'], string> = {
  user: 'you',
  assistant: 'cybercoder',
  system: 'info',
  tool: 'tool',
};

function renderFormattedText(text: string, key: any) {
  const parts: React.ReactNode[] = [];
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    if (text.startsWith('**', i)) {
      if (currentText) {
        parts.push(<Text key={`txt-${i}`}>{currentText}</Text>);
        currentText = '';
      }
      i += 2;
      const endIdx = text.indexOf('**', i);
      if (endIdx !== -1) {
        const boldContent = text.substring(i, endIdx);
        parts.push(<Text key={`bold-${i}`} bold color="white">{boldContent}</Text>);
        i = endIdx + 2;
      } else {
        currentText += '**';
      }
    } else if (text.startsWith('`', i)) {
      if (currentText) {
        parts.push(<Text key={`txt-${i}`}>{currentText}</Text>);
        currentText = '';
      }
      i += 1;
      const endIdx = text.indexOf('`', i);
      if (endIdx !== -1) {
        const codeContent = text.substring(i, endIdx);
        parts.push(<Text key={`inline-code-${i}`} color="cyan" bold>{codeContent}</Text>);
        i = endIdx + 1;
      } else {
        currentText += '`';
      }
    } else {
      currentText += text[i];
      i++;
    }
  }

  if (currentText) {
    parts.push(<Text key={`txt-end`}>{currentText}</Text>);
  }

  // Header formatting (# or ##)
  if (text.startsWith('# ')) {
    return (
      <Box key={key} marginTop={1} marginBottom={1}>
        <Text color="#D97757" bold underline>{text.slice(2)}</Text>
      </Box>
    );
  }
  if (text.startsWith('## ')) {
    return (
      <Box key={key} marginTop={1}>
        <Text color="#D97757" bold>{text.slice(3)}</Text>
      </Box>
    );
  }

  return (
    <Box key={key} flexDirection="row">
      <Text>{parts}</Text>
    </Box>
  );
}

function parseContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <Box key={`code-${i}`} flexDirection="column" paddingLeft={2} marginY={1}>
            {codeBlockLines.map((l, idx) => {
              let bg: string | undefined = undefined;
              let fg: string = 'white';
              if (codeBlockLang.toLowerCase() === 'diff') {
                if (l.startsWith('+') && !l.startsWith('+++')) {
                  bg = 'green'; fg = 'black';
                } else if (l.startsWith('-') && !l.startsWith('---')) {
                  bg = 'red'; fg = 'white';
                } else if (l.startsWith('@@')) {
                  fg = 'cyan';
                }
              }
              return (
                <Box key={idx} width="100%">
                  <Text color={fg} backgroundColor={bg}>{l}</Text>
                </Box>
              );
            })}
          </Box>
        );
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.startsWith('[→ ') && line.includes(']')) {
      const match = line.match(/^\[→ ([^\]]+)\](.*)$/);
      if (match) {
        const toolName = match[1]?.trim() || '';
        const toolArgs = match[2]?.trim() || '';
        elements.push(
          <Box key={`tool-${i}`} flexDirection="row" paddingLeft={2}>
            <Text color="gray">{'└ '}{toolName}({toolArgs})</Text>
          </Box>
        );
        continue;
      }
    }

    // Context updates (like auto-compaction notices)
    if (line.startsWith('[· ') && line.endsWith(' ·]')) {
      elements.push(
        <Box key={`ctx-${i}`} flexDirection="row" paddingLeft={2}>
          <Text color="gray">{line}</Text>
        </Box>
      );
      continue;
    }

    // Map markdown bullets to ●
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const indent = line.length - trimmed.length;
      elements.push(
        <Box key={i} flexDirection="row" paddingLeft={indent}>
          <Text>{'● '}</Text>
          {renderFormattedText(trimmed.slice(2), `bullet-${i}`)}
        </Box>
      );
      continue;
    }

    elements.push(renderFormattedText(line, i));
  }

  return elements;
}

export const MessageList: React.FC<Props> = ({ messages }) => {
  if (messages.length === 0) return null;
  const t = activeTheme;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {messages.map((m) => {
        if (m.role === 'system' && !m.content.trim()) return null;

        if (m.role === 'user') {
          return (
            <Box key={m.id} flexDirection="row" marginBottom={1}>
              <Text bold color={t.user}>{'> '}</Text>
              <Text color="white">{m.content}</Text>
            </Box>
          );
        }

        if (m.role === 'system' || m.role === 'tool') {
          // Render system/tool messages slightly dimmed and indented if they are errors or info
          return (
            <Box key={m.id} flexDirection="row" paddingLeft={2} marginBottom={1}>
              <Text color={m.role === 'system' ? t.muted : t.accentAlt}>
                {m.content.trim().split('\n').join('\n  ')}
              </Text>
            </Box>
          );
        }

        // Assistant messages
        return (
          <Box key={m.id} flexDirection="column" marginBottom={1}>
            <Box flexDirection="column">
              {parseContent(m.content)}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
