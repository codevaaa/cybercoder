#!/usr/bin/env node
/**
 * Compile CyberCoder CLI into a standalone binary.
 *
 * This is what makes the VS Code extension 200+ MB (like Claude Code):
 * the full agent with all tools, skills, sub-agents, MCP, checkpoints,
 * web search, etc. runs as a single binary — no Node.js required.
 *
 * Strategies (in order of preference):
 *   1. `bun build --compile` — fastest, smallest, cross-platform
 *   2. `pkg` — Node.js SEA (Single Executable Application)
 *   3. `node --experimental-sea-config` — native Node 22 SEA
 *
 * Output: dist/bin/cybercoder[.exe]
 *
 * Usage: node scripts/compile-binary.mjs [--target win|mac|linux]
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const BIN_DIR = join(DIST, 'bin')
const ENTRY = join(DIST, 'rpc', 'rpc-entry.js') // separate RPC build (no Ink/React)

const isWin = process.platform === 'win32'
const target = process.argv.includes('--target')
  ? process.argv[process.argv.indexOf('--target') + 1]
  : isWin ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux'

const outName = target === 'win' ? 'cybercoder.exe' : 'cybercoder'
const outPath = join(BIN_DIR, outName)

mkdirSync(BIN_DIR, { recursive: true })

console.log(`[compile] Target: ${target}`)
console.log(`[compile] Entry: ${ENTRY}`)
console.log(`[compile] Output: ${outPath}`)

if (!existsSync(ENTRY)) {
  console.error('[compile] ERROR: dist/index.js not found. Run `npm run build` first.')
  process.exit(1)
}

// Strategy 1: Try bun
function tryBun() {
  try {
    execSync('bun --version', { stdio: 'ignore' })
    console.log(`[compile] Using bun build --compile`)
    execSync(`bun build "${ENTRY}" --compile --outfile "${outPath}"`, {
      cwd: ROOT, stdio: 'inherit',
    })
    return existsSync(outPath)
  } catch (e) {
    console.log('[compile] bun compile failed:', e.message?.slice(0, 100))
    return false
  }
}

// Strategy 2: Try pkg
function tryPkg() {
  try {
    execSync('npx pkg --version', { stdio: 'ignore', cwd: ROOT })
    const pkgTarget = { win: 'node20-win-x64', mac: 'node20-macos-arm64', linux: 'node20-linux-x64' }[target]
    console.log(`[compile] Using pkg (target: ${pkgTarget})`)
    execSync(`npx pkg ${ENTRY} --target ${pkgTarget} --output ${outPath} --compress GZip`, {
      cwd: ROOT, stdio: 'inherit',
    })
    return true
  } catch {
    return false
  }
}

// Strategy 3: Copy the JS bundle + create a shell wrapper (fallback — requires Node on target)
async function fallbackWrapper() {
  console.log('[compile] Fallback: creating wrapper script (requires Node.js on target)')
  const { writeFileSync, chmodSync } = await import('node:fs')
  const wrapper = isWin
    ? `@echo off\nnode "%~dp0..\\index.js" %*\n`
    : `#!/bin/sh\nexec node "$(dirname "$0")/../index.js" "$@"\n`
  const wrapperPath = join(BIN_DIR, isWin ? 'cybercoder.cmd' : 'cybercoder')
  writeFileSync(wrapperPath, wrapper)
  if (!isWin) chmodSync(wrapperPath, 0o755)
  return true
}

// Run strategies
if (!tryBun()) {
  if (!tryPkg()) {
    console.log('[compile] bun and pkg not available.')
    console.log('[compile] Install bun (curl -fsSL https://bun.sh/install | bash) for native compilation.')
    console.log('[compile] Or install pkg: npm install -g pkg')
    // Fallback
    await fallbackWrapper()
  }
}

if (existsSync(outPath)) {
  const { statSync } = await import('node:fs')
  const size = statSync(outPath).size
  console.log(`[compile] SUCCESS: ${outPath} (${(size / 1024 / 1024).toFixed(1)} MB)`)
} else {
  console.log('[compile] Binary not created. Check errors above.')
}
