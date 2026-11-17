import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { projectMcpConfigPath, readMcpConfig, writeProjectMcpConfig } from './mcp-config.js';

test('writes new MCP configuration where the runtime loads project servers', () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-mcp-'));
  const project = join(root, 'project');
  const home = join(root, 'home');
  mkdirSync(project);
  mkdirSync(home);

  try {
    const config = {
      mcpServers: {
        docs: { command: 'node', args: ['server.mjs', 'docs'] },
      },
    };

    const writtenPath = writeProjectMcpConfig(config, project);

    assert.equal(writtenPath, projectMcpConfigPath(project));
    assert.deepEqual(JSON.parse(readFileSync(writtenPath, 'utf8')), config);
    assert.deepEqual(readMcpConfig(project, home), config);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('reads legacy project settings until they are rewritten at the canonical path', () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-mcp-legacy-'));
  const project = join(root, 'project');
  const home = join(root, 'home');
  const legacyPath = join(project, '.codeva', 'mcp.json');
  mkdirSync(join(project, '.codeva'), { recursive: true });
  mkdirSync(home);
  const legacy = { mcpServers: { old: { command: 'node', args: ['old-server.js'] } } };
  writeFileSync(legacyPath, JSON.stringify(legacy), 'utf8');

  try {
    assert.deepEqual(readMcpConfig(project, home), legacy);
    const updated = { mcpServers: { current: { command: 'node', args: ['new-server.js'] } } };
    writeProjectMcpConfig(updated, project);
    assert.deepEqual(readMcpConfig(project, home), updated);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('falls back from malformed project configuration to global configuration', () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-mcp-global-'));
  const project = join(root, 'project');
  const home = join(root, 'home');
  mkdirSync(join(project, '.cyber'), { recursive: true });
  mkdirSync(join(home, '.cyber'), { recursive: true });
  writeFileSync(projectMcpConfigPath(project), '{not json', 'utf8');
  const global = { mcpServers: { global: { command: 'node', args: ['global-server.js'] } } };
  writeFileSync(join(home, '.cyber', 'mcp.json'), JSON.stringify(global), 'utf8');

  try {
    assert.deepEqual(readMcpConfig(project, home), global);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
