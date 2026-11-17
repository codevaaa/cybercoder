import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { grepWorkspace } from './grep.js';

test('grep skips symlinked files and directories outside the selected project', (t) => {
  const parent = mkdtempSync(join(tmpdir(), 'cybercoder-grep-symlink-'));
  const project = join(parent, 'project');
  const outside = join(parent, 'outside');
  mkdirSync(project);
  mkdirSync(outside);
  writeFileSync(join(project, 'inside.txt'), 'inside marker');
  writeFileSync(join(outside, 'secret.txt'), 'outside secret marker');

  try {
    symlinkSync(outside, join(project, 'linked-directory'), 'junction');
  } catch (error) {
    rmSync(parent, { recursive: true, force: true });
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'EPERM' || code === 'EACCES' || code === 'UNKNOWN') {
      t.skip('This Windows account cannot create symbolic links.');
      return;
    }
    throw error;
  }

  // File symlinks need elevated permission on some Windows machines. The
  // directory junction above remains the required cross-platform traversal case.
  try {
    symlinkSync(join(outside, 'secret.txt'), join(project, 'linked-secret.txt'), 'file');
  } catch {
    // The directory junction still proves recursive traversal does not escape.
  }

  try {
    const output = grepWorkspace('marker', project);
    assert.match(output, /inside\.txt:1: inside marker/);
    assert.doesNotMatch(output, /secret|outside/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('grep basename filters include matching files below nested directories', () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-grep-glob-'));
  const nested = join(root, 'src', 'nested');
  mkdirSync(nested, { recursive: true });
  writeFileSync(join(nested, 'match.ts'), 'target text');
  writeFileSync(join(nested, 'skip.txt'), 'target text');

  try {
    const output = grepWorkspace('target', root, { include: '*.ts' });
    assert.match(output, /match\.ts:1: target text/);
    assert.doesNotMatch(output, /skip\.txt/);
    assert.throws(() => grepWorkspace('x'.repeat(513), root), /limited to 512 characters/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
