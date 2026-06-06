#!/usr/bin/env node
/**
 * Copy the monorepo's skills-bundled/ into this CLI package so the published
 * npm tarball ships every built-in skill. Without this, a global install has
 * no skills because skills-bundled/ lives at the monorepo root (outside the
 * package). Runs automatically before build/publish.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(here, '..');
const monorepoRoot = resolve(cliRoot, '..', '..');
const src = resolve(monorepoRoot, 'skills-bundled');
const dest = resolve(cliRoot, 'skills-bundled');

if (!existsSync(src)) {
  console.warn(`[bundle-skills] source not found: ${src} (skipping)`);
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`[bundle-skills] copied skills-bundled -> ${dest}`);
