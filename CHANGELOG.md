# Changelog

All notable changes to CyberMind CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.53] - 2026-11-13

### Fixed

- Windows, macOS, and Linux compile scripts now build the RPC bundle they require before packaging it; the missing-entry error names the correct output path. Added a temporary-project smoke check for the compiled Windows RPC binary.

## [0.1.52] - 2026-11-13

### Added

- Write-capable `spawn_team` agents now run in separate managed Git worktrees, preserving their changes for review and enabling safe parallel work. The tool output gives local sync and cleanup commands; dirty or non-Git workspaces fall back to serial execution.

## [0.1.51] - 2026-11-13

### Fixed

- Plan-restricted model guidance now links to Codeva pricing instead of an unrelated product, and tells users which free models remain available.

## [0.1.50] - 2026-11-13

### Fixed

- The interactive model picker now loads the selected provider's actual catalog instead of showing the fixed placeholder list. It displays loading, empty, and error states, maps provider IDs without inventing tiers, and preserves the searchable bounded viewport for long lists.

## [0.1.49] - 2026-11-13

### Fixed

- Specialist routing recognizes common “documentation” phrasing and sends documentation requests to the docs skill before the API design fallback. Checks now route prompts against both source and packaged skill catalogs.

## [0.1.48] - 2026-11-13

### Fixed

- `spawn_team` now keeps read-only specialists parallel but runs the full task batch serially if any skill can call a destructive tool, preventing concurrent writes to the shared project directory until automatic worktree routing is available.

## [0.1.47] - 2026-11-13

### Added

- `/worktree create|list|sync|close` now manages real Git worktrees, merges committed changes into the selected local repository without pushing, refuses dirty source workspaces, and protects against tampered or escaped worktree paths. Collaboration sessions cannot be deleted while they still track worktrees.

## [0.1.46] - 2026-11-13

### Fixed

- Specialist routing now prefers matching frontend, database, security, test, and debugging skills ahead of general plan/research roles.
- The bundled `cyber-recon` entry now accurately states that execution is not implemented and cannot be selected by automatic routing.
- Added self-checks for declared tool validity and parity between source and generated install skill catalogs.

## [0.1.45] - 2026-11-13

### Fixed

- Single subagents and teams now inherit the selected project working directory instead of falling back to the process directory.
- Extracted approval-before-checkpoint execution for workspace edits and reused it in the main agent path. The self-check exercises a write-capable subagent through denial, approval, file edit, and checkpoint restore.

## [0.1.44] - 2026-11-13

### Fixed

- MCP servers now start in the selected project directory, use the shared CyberCoder version during initialization, drain diagnostics, and shut down through stdio close with process-kill fallback.
- MCP tool calls now use one shared approval wrapper. Added an end-to-end local server check for tool discovery/call, allow and deny decisions, clean shutdown, malformed handshake recovery, and unavailable commands.

## [0.1.43] - 2026-11-13

### Added

- `/compact [focus]` uses the selected model, bounds the summary output, and keeps the original history if summarization fails. Self-checks cover success, empty output, model/focus forwarding, provider failure, and short histories.

## [0.1.42] - 2026-11-13

### Added

- Added skills-package self-checks proving skill tool allowlists are enforced and parallel team work stays within its configured concurrency limit while preserving result order.
- Added `SPEC.md` with evidence-based completion ticks and explicit gaps for write-capable agent recovery, terminal smoke checks, and packaging.

## [0.1.41] - 2026-11-13

### Security

- Shell commands configured in project or global hooks now require explicit approval before execution. Hooks fail closed without an approval UI, and pre-command block rules still stop the requested shell action.
- Added an end-to-end check for denied, approved, unattended, and blocked hook cases.

## [0.1.40] - 2026-11-13

### Fixed

- Model picker now captures terminal SGR mouse-wheel input while open, supports split input reports, and restores terminal mouse mode when it closes. Keyboard navigation and search continue to work.
- Added self-check coverage for a 120-model list, wheel directions and partial input chunks, selection of the final model, and non-wheel mouse reports.
- JSON-RPC version responses now use the shared CyberCoder version constant instead of reporting a stale version.
- Recorded the Skills.sh role shortlist and review gate in `docs/SKILLS-CATALOG.md`.

## [1.0.0] - 2024-12-XX

### 🎉 Initial Release

CyberMind CLI v1.0.0 is here! A comprehensive AI-powered command-line interface with advanced collaboration features, extensible skills system, and rich I/O capabilities.

### ✨ Major Features

#### 🤖 Multi-Model AI Support
- **Anthropic Claude integration** with Bring Your Own Key (BYOK)
- **Ollama fallback** for local model support
- **Multi-model consensus** for improved accuracy
- **Configurable providers** and seamless model switching

#### 🛠️ Extensible Skills System
- **75+ built-in skills** across 8 categories:
  - Development (20 skills): Code Analyzer, Refactor Assistant, Debug Helper, Test Generator, API Designer
  - Design (15 skills): UI Mockup Generator, Color Palette Creator, Typography Advisor, Layout Designer
  - Testing (10 skills): E2E Test Generator, Performance Tester, Security Scanner, Accessibility Tester
  - Deployment (10 skills): Docker Generator, Kubernetes Deployer, CI/CD Pipeline, Cloud Deployer
  - Monitoring (5 skills): Log Analyzer, Metrics Collector, Alert Manager, Health Checker
  - Security (5 skills): Vulnerability Scanner, Password Manager, Encryption Helper, Audit Logger
  - Data (5 skills): Data Visualizer, ETL Pipeline, Data Cleaner, Schema Designer
  - AI (5 skills): ML Model Trainer, Prompt Engineer, Model Evaluator, Data Augmenter
- **Sub-agent spawning** for specialized tasks
- **Custom skill development** support
- **Skill marketplace** with installation management

#### 👥 Collaboration & Parallel Work
- **Multi-cursor agents** via git worktrees
- **Real-time web UI mirror** for live collaboration
- **Session management** with participant tracking
- **Shared context** synchronization

#### 📊 Rich I/O Experience
- **Inline images** with processing capabilities
- **Mermaid diagram** generation and rendering
- **Cost tracking** and usage analytics
- **Screenshot analysis** and mobile HTML export
- **Hotkey palette** for power users

#### 🔧 Development Tools
- **File operations** with approval workflows
- **Command execution** with Docker sandbox
- **Git integration** with advanced workflows
- **Secrets management** and trust system

#### 🌐 Ecosystem Integration
- **MCP (Model Context Protocol)** marketplace
- **75 seed skills** ready to install
- **Telemetry** with privacy-first defaults
- **Profile management** and customization

### 🚀 Core Commands

#### Navigation & Control
- `/help` - Show all available commands
- `/clear` - Clear the terminal screen
- `/exit` - Exit CyberMind CLI

#### AI Model Management
- `/model list` - List available models
- `/model <model-name>` - Switch to specific model
- `/provider anthropic` - Use Anthropic Claude
- `/provider ollama` - Use Ollama local models
- `/consensus <n>` - Use n-model consensus for responses

#### Skills & Agents
- `/research <topic>` - Research with specialized sub-agent
- `/plan <task>` - Create detailed project plan
- `/code-review` - Review current code changes
- `/agent-browser` - Browser automation capabilities
- `/skills list` - Browse available skills
- `/skills install <skill-id>` - Install new skills

#### Collaboration
- `/collab create <name>` - Create collaboration session
- `/collab mirror <session-id>` - Start web UI mirror
- `/worktree create <session-id>` - Create parallel worktree
- `/collab status <session-id>` - Show session details

#### Rich Content
- `/image <path>` - Process and display images
- `/mermaid <code>` - Create Mermaid diagrams
- `/cost status` - Show usage costs and metrics
- `/hotkeys` - Display keyboard shortcuts
- `/screenshot <path>` - Analyze screenshots

#### Configuration
- `/trust` - Manage trusted directories
- `/secret set <key> <value>` - Store API keys securely
- `/profile create <name>` - Create user profile
- `/telemetry status` - Check privacy settings

### 🏗️ Technical Features

#### Architecture
- **Monorepo structure** with pnpm workspaces
- **TypeScript** throughout for type safety
- **Modular design** with clear separation of concerns
- **Plugin system** for extensibility

#### Performance
- **Parallel processing** for multi-agent tasks
- **Efficient caching** and state management
- **Optimized bundle size** (~187KB minified)
- **Fast startup** and responsive UI

#### Security
- **Encrypted secrets vault** for API keys
- **Sandboxed execution** with Docker
- **Trust system** for file access control
- **Privacy-first telemetry** (opt-in only)

#### Cross-Platform
- **Windows**, **macOS**, and **Linux** support
- **Node.js 18+** compatibility
- **Native package managers** (npm, yarn, pnpm)
- **Windows installer** available

### 📦 Installation

#### NPM (Recommended)
```bash
npm install -g cybermind-cli
```

#### pnpm
```bash
pnpm add -g cybermind-cli
```

#### Windows Installer
Download the latest installer from [GitHub Releases](https://github.com/cybermind/cli/releases)

#### Development Build
```bash
git clone https://github.com/cybermind/cli.git
cd cybermind-cli
pnpm install
pnpm build
pnpm link --global
```

### 🔧 Quick Start

1. **Install CyberMind CLI**
2. **Configure your AI provider:**
   ```bash
   /secret set ANTHROPIC_API_KEY your-key-here
   # or
   /provider ollama
   ```
3. **Start chatting:**
   ```bash
   cybermind
   Hello! I need help building a React application...
   ```

### 📚 Documentation

- **User Guide**: [docs.cybermind.ai](https://docs.cybermind.ai)
- **API Reference**: [api.cybermind.ai](https://api.cybermind.ai)
- **Skill Development**: [skills.cybermind.ai](https://skills.cybermind.ai)
- **Community**: [discord.gg/cybermind](https://discord.gg/cybermind)

### 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

### 🙏 Acknowledgments

- Anthropic for the Claude API
- Ollama for local model support
- The Ink team for React CLI framework
- All our contributors and community members

---

**CyberMind CLI v1.0.0** - *Intelligent development assistance, right in your terminal.*
