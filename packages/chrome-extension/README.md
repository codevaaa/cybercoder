# CyberCoder for Chrome

AI assistant in your browser — summarize pages, extract data, fill forms, translate, rewrite, and chat. Powered by 8+ AI providers. Free tier available (50 messages/hour).

## Features
- **Side panel chat** with streaming responses and page context
- **Quick tasks**: Summarize, Extract data, Explain, Translate, Rewrite, Code explain, Save as Markdown
- **Context menu**: Right-click → Summarize/Explain/Rewrite/Translate selection
- **Floating action button** on text selection
- **Multi-provider**: Groq (free), Gemini (free), Anthropic, OpenAI, Codeva cloud
- **Keyboard shortcuts**: Ctrl+Shift+Y (open), Ctrl+Shift+S (summarize)
- **Content extraction**: Intelligent page text extraction (skips nav/ads/scripts)
- **Self-learning**: Remembers conversation context within a session

## Install (development)
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this folder (`chrome-extension/`)
4. Pin the extension from the toolbar

## Connect a provider
- **Groq (free)**: Get a key at console.groq.com → paste in the extension
- **Gemini (free)**: Get a key at aistudio.google.com → paste
- **Codeva**: Create an API key at cybermindcli.info/api-keys → paste

## Architecture
- `manifest.json` — Manifest V3 (Chrome 120+)
- `src/background.js` — Service worker (auth, streaming, context menus)
- `src/content.js` — Content script (page extraction, FAB, text fill)
- `src/popup.html/js` — Popup (login + quick tasks)
- `src/panel.html` — Side panel (full chat with streaming)
