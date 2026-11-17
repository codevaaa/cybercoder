#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  throw new Error('This smoke check is only for the compiled Windows RPC binary.');
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const binary = resolve(process.argv[2] ?? join(scriptDir, '..', 'dist', 'bin', 'cybercoder.exe'));
const workspace = mkdtempSync(join(tmpdir(), 'cybercoder-rpc-smoke-'));
const relativeToTemp = relative(resolve(tmpdir()), workspace);
if (!relativeToTemp || relativeToTemp === '..' || relativeToTemp.startsWith(`..${sep}`) || isAbsolute(relativeToTemp)) {
  throw new Error('Refusing to run the RPC smoke test outside the temporary directory.');
}

const child = spawn(binary, [], { cwd: workspace, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
const lines = createInterface({ input: child.stdout });
const queued = [];
const waiters = [];
let stderr = '';
child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
lines.on('line', (line) => {
  try {
    const message = JSON.parse(line);
    const waiterIndex = waiters.findIndex((waiter) => waiter.predicate(message));
    if (waiterIndex >= 0) waiters.splice(waiterIndex, 1)[0].resolve(message);
    else queued.push(message);
  } catch {
    // Ignore diagnostics that are not JSON-RPC messages.
  }
});

function nextMessage(predicate) {
  const queuedIndex = queued.findIndex(predicate);
  if (queuedIndex >= 0) return Promise.resolve(queued.splice(queuedIndex, 1)[0]);
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      const index = waiters.findIndex((waiter) => waiter.resolve === resolveMessage);
      if (index >= 0) waiters.splice(index, 1);
      rejectPromise(new Error(`Timed out waiting for the compiled RPC binary.${stderr ? `\n${stderr}` : ''}`));
    }, 5_000);
    function resolveMessage(message) {
      clearTimeout(timer);
      resolvePromise(message);
    }
    waiters.push({ predicate, resolve: resolveMessage });
  });
}

async function call(id, method, params = {}) {
  const responsePromise = nextMessage((message) => message.id === id);
  child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  const response = await responsePromise;
  if (response.error) throw new Error(`${method} failed: ${response.error.message}`);
  return response.result;
}

try {
  const ready = await nextMessage((message) => message.event === 'ready');
  assert.equal(ready.data?.version, '0.1.53', 'compiled binary should include the released source version');

  const ping = await call(1, 'ping');
  assert.equal(ping.version, '0.1.53');
  assert.equal(resolve(ping.cwd), workspace, 'the RPC server should stay rooted in its launched workspace');

  await call(2, 'write_file', { path: 'smoke.txt', content: 'compiled Windows RPC smoke test\n' });
  assert.equal(readFileSync(join(workspace, 'smoke.txt'), 'utf8'), 'compiled Windows RPC smoke test\n');
  const read = await call(3, 'read_file', { path: 'smoke.txt' });
  assert.match(read.content, /compiled Windows RPC smoke test/);

  await call(4, 'shutdown');
  await new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error('Compiled RPC binary did not shut down cleanly.')), 3_000);
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`Compiled RPC binary exited with ${code}.${stderr ? `\n${stderr}` : ''}`));
    });
  });
  console.log(`Compiled Windows RPC smoke passed (${ready.data.version}).`);
} finally {
  if (child.exitCode === null) child.kill();
  const safeWorkspace = resolve(workspace);
  const safeRelative = relative(resolve(tmpdir()), safeWorkspace);
  if (safeRelative && safeRelative !== '..' && !safeRelative.startsWith(`..${sep}`) && !isAbsolute(safeRelative)) {
    rmSync(safeWorkspace, { recursive: true, force: true });
  }
}
