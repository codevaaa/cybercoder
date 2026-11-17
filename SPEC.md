# CyberCoder agent harness — build and verification plan

**Updated:** 2026-11-13  
**Current local CLI version:** 0.1.53  
**Rule:** ship one bounded capability at a time, then run `corepack pnpm self-check` across the whole workspace before checking it off.

## Verified in the current workspace

- [x] Long model lists have search, a bounded viewport, keyboard navigation, and SGR mouse-wheel navigation. The self-check walks a 120-model fixture to the final item, checks split mouse reports, and selects the last model.
- [x] Shell commands configured as hooks ask for approval before they run. Denied or unattended hooks do not execute; pre-command block rules still stop shell actions. Persistent approval is scoped to the workspace and exact hook command.
- [x] Sub-agent tool lists are filtered to each skill's declared tools. The self-check confirms a read tool runs while an undeclared write call remains unavailable.
- [x] Parallel skill teams respect their configured concurrency limit, report progress, and return results in task order.
- [x] Provider retry waits on bounded `Retry-After` or exponential backoff, and cancellation ends a pending retry.
- [x] MCP project configuration can be added, read, and removed at the path the runtime uses.
- [x] `/compact [focus]` uses the selected model, limits summary output, rejects empty summaries, preserves history on provider failure, and skips short histories. All behavior cases run in the full self-check.
- [x] A local MCP stdio server is launched in the selected project, initialized, queried for tools, invoked through explicit allow/deny approval, and shut down. Malformed handshakes and unavailable commands recover without retaining a failed server.
- [x] Single subagents and teams inherit the selected project directory. An edit-capable subagent asks for approval, checkpoints before changing a file, and restores the original file from that checkpoint in the self-check.
- [x] Bundled skills only request tools registered by CyberCoder; the generated install catalog matches the source catalog. Specialist routing checks cover frontend, database, debugging, and security work.
- [x] `cyber-recon` is accurately marked as a documentation-only placeholder and is excluded from automatic task routing until a scoped, approved runner exists.
- [x] The Skills.sh discovery notes and adoption gate are documented in `docs/SKILLS-CATALOG.md`.
- [x] `/worktree create|list|sync|close` uses real Git worktrees, keeps uncommitted changes isolated, merges committed work locally without pushing, rejects dirty root workspaces, and protects against tampered paths. The session stays tracked until its worktrees are removed.
- [x] Write-capable `spawn_team` tasks get separate real Git worktrees and can run in parallel. Changes stay in their worktrees for review; the result prints the local sync and close commands. Clean worktrees are removed automatically. Dirty or non-Git projects safely fall back to serial execution in the selected workspace.
- [x] Every bundled skill's declared tools are checked against the registered runtime tools, the published catalog is compared to source, and representative routing cases run against both actual catalogs. Explicit documentation prompts select the docs specialist.
- [x] The interactive model picker loads the selected provider's actual model IDs asynchronously, keeps the loading/error/empty states honest, maps the loaded catalog into searchable rows, and retains bounded keyboard/SGR wheel navigation for long results.
- [x] Plan-restricted model messages now point to Codeva's pricing page and name the currently supported free models; a self-check guards against the old unrelated upgrade link.
- [x] The Windows RPC binary compiles and a local smoke script verifies startup/version, project-root reporting, file write/read, and clean shutdown in a disposable temporary workspace.

## Remaining work

- [ ] Verify mouse-wheel input in Windows Terminal and a non-Windows terminal. Unit checks cover SGR parsing and selection; terminal-specific behavior still needs a live smoke check.
- [ ] Install the interactive CLI package in an isolated Windows prefix and smoke its fresh-profile startup after the remaining runtime work is complete.

## Acceptance for each next capability

1. Identify the runtime path and failure behavior before editing.
2. Add an end-to-end or behavior-focused check alongside the code.
3. Run `corepack pnpm self-check`; fix any regression before proceeding.
4. Update this checklist, `CHANGELOG.md`, and the CLI/shared version together.
5. Rebuild the installed app and run its final smoke check only after the remaining work is complete.
