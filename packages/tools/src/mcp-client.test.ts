import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { gateMcpTools, loadMcpTools } from './mcp-client.js';
import { writeProjectMcpConfig } from './mcp-config.js';
import { ApprovalGate } from './approval.js';

const localServer = String.raw`
const fs = require('node:fs');
const input = process.stdin;
let buffer = '';
process.on('SIGTERM', () => {
  fs.writeFileSync(process.env.MCP_TEST_STOP_MARKER, 'stopped');
  process.exit(0);
});
input.setEncoding('utf8');
input.on('end', () => {
  fs.writeFileSync(process.env.MCP_TEST_STOP_MARKER, 'stopped');
  process.exit(0);
});
input.on('data', (chunk) => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    if (request.id === undefined) continue;
    let result;
    if (request.method === 'initialize') result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'self-check', version: '1' } };
    else if (request.method === 'tools/list') result = { tools: [{ name: 'echo', description: 'Echo a message with the server working directory.', inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] } }] };
    else if (request.method === 'tools/call') result = { content: [{ type: 'text', text: process.cwd() + '|' + request.params.arguments.message }] };
    else result = { isError: true, content: [{ type: 'text', text: 'unknown method' }] };
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
  }
});
`;

test('MCP client launches in the selected project, approval-gates tool calls, and awaits shutdown', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-mcp-live-'));
  const script = join(root, 'fake-server.cjs');
  const stopMarker = join(root, 'stopped.marker');
  writeFileSync(script, localServer, 'utf8');
  writeProjectMcpConfig({
    mcpServers: {
      local: { command: process.execPath, args: [script], env: { MCP_TEST_STOP_MARKER: stopMarker } },
    },
  }, root);

  let servers: Awaited<ReturnType<typeof loadMcpTools>>['servers'] = [];
  try {
    const loaded = await loadMcpTools(root, { startupTimeoutMs: 1_000, toolCallTimeoutMs: 1_000 });
    servers = loaded.servers;
    assert.equal(loaded.servers.length, 1);
    assert.equal(loaded.tools.length, 1);
    assert.equal(loaded.tools[0]?.schema.name, 'mcp__local__echo');
    assert.equal(loaded.tools[0]?.destructive, true, 'remote MCP calls must remain approval-gated by the CLI runtime');

    let approvalCount = 0;
    const gate = new ApprovalGate({
      async ask(prompt) {
        approvalCount += 1;
        assert.equal(prompt.destructive, true);
        return approvalCount === 1 ? 'deny' : 'allow';
      },
    });
    const gatedTools = gateMcpTools(loaded.tools, gate);
    const denied = await gatedTools[0]!.execute({ message: 'blocked' }, { cwd: root });
    assert.match(denied, /user denied tool/);
    const output = await gatedTools[0]!.execute({ message: 'hello' }, { cwd: root });
    assert.equal(output, `${root}|hello`);
    assert.equal(approvalCount, 2);

    await loaded.servers[0]!.stop();
    assert.equal(existsSync(stopMarker), true, 'stop should wait until the child handles shutdown');
  } finally {
    await Promise.all(servers.map((server) => server.stop()));
    rmSync(root, { recursive: true, force: true });
  }
});

test('MCP client cleans up a malformed server and skips an unavailable command', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cybercoder-mcp-failure-'));
  const script = join(root, 'malformed-server.cjs');
  const stopMarker = join(root, 'stopped.marker');
  writeFileSync(script, String.raw`
const fs = require('node:fs');
process.on('SIGTERM', () => { fs.writeFileSync(process.env.MCP_TEST_STOP_MARKER, 'stopped'); process.exit(0); });
process.stdin.on('end', () => { fs.writeFileSync(process.env.MCP_TEST_STOP_MARKER, 'stopped'); process.exit(0); });
process.stdin.resume();
process.stdout.write('this is not JSON-RPC\n');
setInterval(() => {}, 1000);
`, 'utf8');
  writeProjectMcpConfig({
    mcpServers: {
      malformed: { command: process.execPath, args: [script], env: { MCP_TEST_STOP_MARKER: stopMarker } },
      unavailable: { command: join(root, 'missing-command.exe') },
    },
  }, root);

  const originalError = console.error;
  console.error = () => undefined;
  try {
    const loaded = await loadMcpTools(root, { startupTimeoutMs: 80 });
    assert.equal(loaded.servers.length, 0);
    assert.equal(loaded.tools.length, 0);
    assert.equal(existsSync(stopMarker), true, 'malformed handshake child must be terminated before recovery completes');
  } finally {
    console.error = originalError;
    rmSync(root, { recursive: true, force: true });
  }
});
