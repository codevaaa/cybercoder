---
name: cyber-recon
description: Documentation-only placeholder for a future authorized security assessment workflow.
version: 0.0.2
inputs:
  - { name: target, type: string, required: true, description: Authorized target for planning only. }
outputs:
  - { name: report, type: string, description: Planning notes only; no findings are verified. }
requires:
  tools: []
triggers:
  - "/cyber"
license: MIT
author: Codeva
category: cyber
official: true
---

# Cyber-Recon (not implemented)

This entry is a planning placeholder. CyberCoder currently has no autonomous bug-bounty scanner, Hunter Engine connection, or bundled reconnaissance runner.

When invoked, explain that security assessment execution is unavailable. Do not claim to scan a target, produce validated findings, or perform network activity. Do not substitute shell, browser, or web tools for an authorized scanning workflow.

A future implementation must require an explicit, verified authorized scope, approval before any network activity, isolated execution, and auditable evidence for each finding.
