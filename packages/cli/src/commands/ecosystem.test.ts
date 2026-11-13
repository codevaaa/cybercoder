import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildMCPCommand } from './ecosystem.js';

test('/mcp add, list, and remove operate on the project runtime config path', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-mcp-command-'));
  const priorCwd = process.cwd();
  const replies: string[] = [];
  mkdirSync(join(root, '.cyber'), { recursive: true });
  writeFileSync(join(root, '.cyber', 'mcp.json'), JSON.stringify({ mcpServers: {} }), 'utf8');
  process.chdir(root);
  const command = buildMCPCommand({
    clear: () => undefined,
    exit: () => undefined,
    appendMessage: (message) => replies.push(message.content),
  });

  try {
    await command.run('add test-server node server.mjs --safe');
    const path = join(root, '.cyber', 'mcp.json');
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), {
      mcpServers: { 'test-server': { command: 'node', args: ['server.mjs', '--safe'] } },
    });

    await command.run('');
    assert.match(replies.at(-1) ?? '', /test-server: node server\.mjs --safe/);
    await command.run('remove test-server');
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { mcpServers: {} });
  } finally {
    process.chdir(priorCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
