import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { ApprovalPrompt, ApprovalUI } from '@cybermind/tools';
import { reloadHooks, runHooks } from './hooks.js';

test('configured shell hooks fail closed and run only after explicit approval', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'cybercoder-hooks-'));
  const marker = join(cwd, 'hook-marker');
  const hookDirectory = join(cwd, '.codeva');
  await mkdir(hookDirectory, { recursive: true });
  await writeFile(join(hookDirectory, 'hooks.json'), JSON.stringify({
    postTask: [{ command: `node -e "require('node:fs').writeFileSync('hook-marker','ran')"` }],
    preCommand: [{ match: '^rm', command: 'node -e "process.exit(0)"', block: true }],
  }));
  reloadHooks();

  try {
    const unattended = await runHooks('postTask', '', cwd);
    assert.equal(unattended.ran, false);
    assert.match(unattended.output, /no approval UI/);

    const block = await runHooks('preCommand', 'rm -rf anything', cwd);
    assert.equal(block.blocked, true);
    assert.equal(block.ran, false);

    const prompts: ApprovalPrompt[] = [];
    const decisions: ApprovalUI = {
      ask: async (prompt) => {
        prompts.push(prompt);
        return prompts.length === 1 ? 'deny' : 'allow';
      },
    };

    const denied = await runHooks('postTask', '', cwd, decisions);
    assert.equal(denied.ran, false);
    assert.match(denied.output, /denied by user/);
    await assert.rejects(readFile(marker, 'utf8'));

    const allowed = await runHooks('postTask', '', cwd, decisions);
    assert.equal(allowed.ran, true);
    assert.equal(await readFile(marker, 'utf8'), 'ran');
    assert.equal(prompts.length, 2);
    assert.equal(prompts[0]?.destructive, true);
    assert.match(prompts[0]?.summary ?? '', /postTask hook/);
  } finally {
    reloadHooks();
    await rm(cwd, { recursive: true, force: true });
  }
});
