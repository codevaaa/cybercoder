# CyberCoder skill and agent catalog

**Research snapshot:** 2026-11-13  
**Scope:** Skills.sh public catalog, CyberCoder's current bundled skills, and how to assign capabilities to real sub-agents.

## How CyberCoder uses skills

CyberCoder loads a skill's `SKILL.md` as specialist instructions. The `requires.tools` list controls which registered tools its sub-agent receives; an empty list gives it no tools. Parallel `spawn_team` calls run independent skill tasks with bounded concurrency (currently three by default) and return results in the original task order. A skill therefore describes a role, while its declared tools determine what it can actually do.

Prefer separate research, implementation, verification, and review roles. Give only the implementation agent write/command tools when changes are requested. Keep research, test planning, and review agents read-only where possible. Git push, destructive shell, network access, and secrets remain explicit approval boundaries.

## Useful role groups

| Agent role | Existing CyberCoder skills | Good task boundaries |
| --- | --- | --- |
| Project researcher | `research`, `web-research`, `understand-anything`, `academic-research` | Map code paths, collect evidence, cite external facts; do not modify files. |
| Planner / architect | `plan`, `api-designer`, `monorepo-doctor` | Turn a goal into ordered changes, interfaces, and acceptance checks. |
| Feature implementer | `frontend-design`, `mattpocock-ts`, `refactor`, `migrate` | Own a bounded set of files and implement one coherent change. |
| Test specialist | `test-writer`, `test-fixer`, `debugger` | Add behavior checks, reproduce failures, and report exact commands/results. |
| Security reviewer | `security-audit`, `cyber-recon` | Read-only review of an explicitly authorized codebase or diff; no live target probing by default. |
| Code reviewer | `code-review` | Independently inspect changed behavior for reproducible correctness and security issues. |
| Performance / operations | `perf-profiler`, `devops`, `deploy`, `dep-doctor` | Profile known bottlenecks, review deployment config, and inspect dependency changes. |
| Browser and documentation | `agent-browser`, `web-scraper`, `doc-writer`, `knowledge-work` | Browser tasks require the browser tool; document tasks should cite inspected project behavior. |

These roles mostly already exist in the CLI's bundled skill set. The next work should improve tool-level tests, scope, and task routing before adding a large number of near-duplicate prompt files.

## Skills.sh candidates to evaluate

The current catalog is useful for discovery. The strongest candidates for this repository are:

| Candidate | Why it may help | Decision |
| --- | --- | --- |
| [Vercel React Best Practices](https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | React performance guidance and component patterns relevant to Codeva's React interfaces. | Evaluate as an optional frontend skill; keep the existing `frontend-design` role for visual work. |
| [Vercel Web Design Guidelines](https://www.skills.sh/vercel-labs/agent-skills/web-design-guidelines) | Accessibility and web-interface review guidance. | Evaluate for a read-only UI audit role. |
| [Sentry Code Review](https://www.skills.sh/getsentry/skills/code-review) | Review checklist covers runtime failures, performance, side effects, compatibility, and security. | Compare with the existing `code-review` before adopting; avoid duplicate reviewers. |
| [Sentry Security Review](https://www.skills.sh/getsentry/skills/security-review) | Focused security-review instructions from a recognized project publisher. | Evaluate against the existing `security-audit` skill and the repo's security requirements. |
| [Vercel Skills CLI](https://github.com/vercel-labs/skills) | Supports discovery, listing, selective installation, lock-based update checks, and removal. | Use as a research/install reference, not as an automatic runtime dependency. |

Skills.sh's ranking reflects installation activity and the catalog explicitly says it cannot guarantee every listed skill's quality or security. Popularity and an audit badge are screening signals, not proof that a skill is suitable for this project. The official CLI supports selecting individual skills and checking updates; review the exact source before installation.

## Adoption gate

Before importing an external skill:

1. Confirm the publisher and repository are the intended source; prefer an official project organization when one exists.
2. Read the complete `SKILL.md` and every referenced script, package, URL, and post-install instruction. A markdown prompt can still direct an agent to do risky work.
3. Pin the reviewed commit or content hash and retain the source/license metadata.
4. Check tool requirements and remove any permission broader than the role needs. Do not treat a skill's text as an authorization grant.
5. Run the full CyberCoder self-check and a representative task with network, shell, and write tools denied unless that task explicitly needs them.

Do not bulk-install catalog entries based only on install counts. Keep marketplace installation opt-in, make provenance visible, and allow an installed skill to be removed or disabled.

## References

- [Skills.sh documentation](https://www.skills.sh/docs) — skill format, discovery, rankings, and the catalog's security limitations.
- [Skills CLI command reference](https://github.com/vercel-labs/skills/blob/main/docs/commands.md) — selective install, list, update checks, and removal commands.
- [Vercel agent skills](https://github.com/vercel-labs/agent-skills) — first-party React and web-design skill sources.
- [Sentry skills](https://github.com/getsentry/skills) — first-party code-review and security-review skill sources.
