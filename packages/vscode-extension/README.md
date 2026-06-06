# CyberCoder for VS Code

Agentic AI coding assistant in your editor — a free, powerful alternative to
Claude Code's VS Code extension. Chat about your code, refactor, fix bugs, and
generate tests with 8+ AI providers, gated by your Codeva plan.

## Features
- **Chat sidebar** in the activity bar with streaming responses and code blocks
- **Apply to editor** — one click to apply a generated code block to your file
- **Editor context** — your active file / selection is shared automatically
- **Right-click actions** — Explain, Refactor, Fix, Generate tests, Add to chat
- **Model picker** — `auto` routing or pick a specific free model
- **Secure auth** — API key stored in VS Code SecretStorage; sessions auto-refresh
- **Status bar** entry and keybindings (`Ctrl/Cmd+Shift+I` to open chat)

## Sign in
1. Create an API key in Codeva (web app → Code tab → API Access Keys).
2. Run **CyberCoder: Sign In** and paste the key (`sk_cyber_…`).

## Build
```
npm install
npm run build      # bundles dist/extension.js via esbuild
npm run package    # produces cybercoder.vsix
```

Press F5 in VS Code to launch an Extension Development Host for live testing.
