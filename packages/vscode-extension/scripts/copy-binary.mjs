/**
 * Copy the compiled CLI binary into the extension's bin/ folder so it gets
 * included in the vsix. This is what makes the extension 100+ MB (like Claude Code).
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EXT_ROOT = join(__dirname, '..')
const CLI_BIN = join(EXT_ROOT, '..', 'cli', 'dist', 'bin')
const EXT_BIN = join(EXT_ROOT, 'bin')

mkdirSync(EXT_BIN, { recursive: true })

const isWin = process.platform === 'win32'
const name = isWin ? 'cybercoder.exe' : 'cybercoder'
const src = join(CLI_BIN, name)

if (existsSync(src)) {
  copyFileSync(src, join(EXT_BIN, name))
  console.log(`[copy-binary] Copied ${name} to extension bin/ (${(require('fs').statSync(src).size / 1024 / 1024).toFixed(1)} MB)`)
} else {
  console.warn(`[copy-binary] WARNING: ${src} not found. Run 'npm run compile' in packages/cli first.`)
  console.warn('[copy-binary] The extension will work without the binary (API-only mode) but won\'t have local agentic tools.')
}
