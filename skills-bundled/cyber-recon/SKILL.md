---
name: cyber-recon
description: Autonomous bug bounty hunting — full recon to report pipeline. Powered by Codeva Hunter Engine with 300+ security tools via E2B cloud sandbox. Cross-platform (Windows/Mac/Linux).
version: 1.0.0
inputs:
  - { name: target, type: string, required: true, description: "Authorized target domain (e.g. example.com). MUST be in an active bug bounty program scope." }
  - { name: mode, type: string, required: false, description: "Hunt mode: autopilot (default), recon_only, web3" }
outputs:
  - { name: report, type: string, description: "H1/Bugcrowd ready bug report in markdown" }
  - { name: findings, type: array, description: "Validated vulnerability findings" }
requires:
  tools: [bash, node]
triggers:
  - "/cyber"
  - "/hunt"
  - "/recon"
  - "/bug-hunt"
license: MIT
author: Codeva
category: cyber
official: true
---

# Cyber-Recon — Autonomous Bug Bounty Hunter

Full autonomous pipeline: **Recon → Intel → Hunt → Triage → Chain → Report**

Powered by **Codeva Hunter Engine** — reconFTW + 300+ security tools running in E2B cloud sandbox.

## Quick Start

```bash
/cyber target.com
# or
/hunt target.com
```

User sirf target deta hai. AI sab kuch khud karta hai.

## What Happens Automatically

### Phase 1 — Recon (15–30 min)
- **reconFTW** full pipeline (80+ tools orchestrated)
- **subfinder** + **assetfinder** — passive subdomain enumeration
- **httpx** — live host probing + tech stack detection
- **naabu** — port scanning
- **katana** + **gau** + **waybackurls** — URL collection (4 sources parallel)
- **gf patterns** — classify URLs by vulnerability class
- **nuclei** — 9,000+ CVE templates
- **SecretFinder** + **jsluice** — JavaScript secret scanning

### Phase 2 — Intel (2–3 min)
- AI analysis of attack surface (Ravan model)
- MITRE ATT&CK aligned priority ranking
- CybersecurityMCP — 754 skills injected as context
- Exploit chain candidates identified

### Phase 3 — Hunt (30–60 min) — 5 Parallel Agents
- **Scout** → subdomain + live host validation
- **Crawler** → JS analysis + API endpoint discovery
- **Scanner** → nuclei CVEs + exposed files + GraphQL
- **Fuzzer** → dalfox XSS + sqlmap SQLi + SSRF probe + LFI
- **Exploiter** → verify top findings, generate PoC

### Phase 4 — Triage (5 min)
- 7-Question Gate on every finding (Kali model)
- SUBMIT / CHAIN / DROP per finding
- Weak findings automatically killed

### Phase 5 — Chain Builder (2 min)
- A→B→C exploit chains built (Ravan model)
- Known chains: SSRF→metadata, XSS→ATO, Open Redirect→OAuth theft

### Phase 6 — Report (3 min)
- H1/Bugcrowd/Intigriti/Immunefi format
- Copy-paste ready — no editing needed
- CVSS 3.1 auto-calculated

## Tool Arsenal (300+)

| Phase | Tools |
|-------|-------|
| Subdomain | reconFTW, subfinder, assetfinder, amass, bbot, puredns |
| Probing | httpx, dnsx, naabu, nmap, masscan, smap |
| Crawling | katana, gau, waybackurls, hakrawler, gospider |
| Fuzzing | ffuf, feroxbuster, gobuster, kiterunner, arjun |
| XSS | dalfox, XSStrike |
| SQLi | sqlmap, ghauri |
| Secrets | trufflehog, gitleaks, jsluice, SecretFinder, noseyparker |
| CVE | nuclei (9K+ templates) |
| Auth | jwt_tool, byp4xx |
| Takeover | subzy, subjack, dnsReaper |
| C2 | Sliver, Havoc, Metasploit (post-exploitation, authorized only) |
| Post-Exploit | LinPEAS, WinPEAS, impacket, Ligolo-ng |
| Web3 | Slither, Mythril, Foundry, Echidna |

## Prerequisites

1. **E2B API key** (free tier at e2b.dev) in backend `.env`:
   ```
   E2B_API_KEY=e2b_xxx...
   ```
2. **MAX plan** on Codeva — Bug Bounty Engine is MAX-only feature
3. **Authorized scope** — only test targets in active bug bounty programs

## API Endpoints

```
POST /api/v1/hunt/autopilot  { target: "example.com" }
POST /api/v1/hunt/web3       { target: "0x...", audit_type: "full" }
GET  /api/v1/hunt/sessions   — Hunt history
GET  /api/v1/hunt/status     — Execution mode + tools
GET  /api/v1/hunt/mcp/tools  — CybersecurityMCP tool registry
POST /api/v1/hunt/mcp/call   { tool: "get_cybersecurity_skill", arguments: { technique: "ssrf" } }
```

## CybersecurityMCP Integration

754 cybersecurity skills from Anthropic-Cybersecurity-Skills repo mapped to:
- MITRE ATT&CK
- NIST CSF 2.0
- MITRE ATLAS
- D3FEND
- NIST AI RMF

Available as MCP tools — auto-injected into each hunt phase.

## Platform Support

| OS | Mode | Tools |
|----|------|-------|
| Any (via E2B) | ☁ Cloud | All 300+ tools |
| Linux/Mac (local tools) | 💻 Local | Local installs |
| Any (no key/tools) | 🤖 AI-only | AI analysis only |

## Legal Notice

This tool is for **authorized security testing only**.
Always test within an approved bug bounty program scope.
Never test targets without explicit written permission.
