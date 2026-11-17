import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { gitRpcArguments, grepRpcWorkspace } from './rpc-server.js';

test('RPC git accepts only known read-only operations', () => {
  assert.deepEqual(gitRpcArguments('status'), ['status']);
  assert.deepEqual(gitRpcArguments('diff --cached'), ['diff', '--cached']);
  assert.equal(gitRpcArguments('status; whoami'), null);
  assert.equal(gitRpcArguments('config --global alias.x !whoami'), null);
  assert.equal(gitRpcArguments('checkout -b injected'), null);
});

test('RPC grep treats shell metacharacters as a literal regular-expression search pattern', () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-rpc-grep-'));
  const marker = join(root, 'grep-command-ran.txt');
  writeFileSync(join(root, 'source.txt'), 'ordinary source text');
  const markerPath = marker.replace(/\\/g, '/');
  const attack = process.platform === 'win32'
    ? `.*"; echo pwned > ${markerPath} & rem "`
    : `.*"; touch ${markerPath}; #`;

  try {
    const output = grepRpcWorkspace(attack, undefined, root);
    assert.match(output, /no matches/i);
    assert.equal(existsSync(marker), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
