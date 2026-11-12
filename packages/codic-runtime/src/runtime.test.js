import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { CodicRuntime } from './runtime.ts'

const stream = (events) => new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), {
  status: 200,
  headers: { 'content-type': 'text/event-stream' },
})

const waitForFinish = (events, timeoutMs = 10_000) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('The local runtime did not finish in time.')), timeoutMs)
  events.finish = (event) => {
    clearTimeout(timeout)
    resolve(event)
  }
})

test('Codic runtime edits only the selected project and can restore its checkpoint', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-edit-'))
  const checkpointSession = `codic-test-${randomUUID()}`
  const checkpointDirectory = path.join(homedir(), '.codeva', 'checkpoints', checkpointSession)
  const events = []
  let call = 0
  const runtime = new CodicRuntime({
    workspaceRoot: project,
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'test-session',
    checkpointSessionId: checkpointSession,
    fetchImpl: async (_url, init) => {
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-session')
      const request = JSON.parse(init.body)
      assert.ok(request.tools.some((tool) => tool.function.name === 'write_file'))
      call += 1
      return call === 1
        ? stream([
            { type: 'tool_call', toolCall: { id: 'write-1', name: 'write_file', input: { path: 'notes.txt', content: 'Created by the local agent.' } } },
            { type: 'done', reason: 'tool_calls' },
          ])
        : stream([
            { type: 'text', text: 'I created notes.txt inside the selected project.' },
            { type: 'done', reason: 'end_turn' },
          ])
    },
    onEvent: (event) => {
      events.push(event)
      if (event.type === 'run_finished') events.finish?.(event)
    },
  })
  const finished = waitForFinish(events)
  try {
    runtime.start([{ role: 'user', content: 'Create notes.txt with a short note.' }])
    const result = await finished
    assert.equal(result.reason, 'end_turn')
    assert.equal(call, 2)
    assert.equal(readFileSync(path.join(project, 'notes.txt'), 'utf8'), 'Created by the local agent.')
    const checkpoint = events.find((event) => event.type === 'checkpoint_created')
    assert.ok(checkpoint)
    assert.deepEqual(checkpoint.checkpoint.files, ['notes.txt'])
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepEqual(runtime.restoreCheckpoint(checkpoint.checkpoint.seq), { restored: 0, deleted: 1 })
    assert.equal(existsSync(path.join(project, 'notes.txt')), false)
  } finally {
    rmSync(checkpointDirectory, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

test('Codic runtime blocks a path escape and waits for approval before shell execution', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-boundary-'))
  const parent = path.dirname(project)
  const outsideFile = path.join(parent, `${path.basename(project)}-outside.txt`)
  const sentinelFile = path.join(project, 'must-not-run.txt')
  const checkpointSession = `codic-test-${randomUUID()}`
  const checkpointDirectory = path.join(homedir(), '.codeva', 'checkpoints', checkpointSession)
  const events = []
  let runtime
  let call = 0
  runtime = new CodicRuntime({
    workspaceRoot: project,
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'test-session',
    checkpointSessionId: checkpointSession,
    fetchImpl: async (_url, init) => {
      call += 1
      if (call === 1) {
        const request = JSON.parse(init.body)
        assert.ok(request.tools.some((tool) => tool.function.name === 'run_command'))
        const command = `node -e "require('node:fs').writeFileSync('${sentinelFile.replace(/\\/g, '\\\\')}', 'ran')"`
        return stream([
          { type: 'tool_call', toolCall: { id: 'escape-1', name: 'write_file', input: { path: '../must-not-write.txt', content: 'blocked' } } },
          { type: 'tool_call', toolCall: { id: 'shell-1', name: 'run_command', input: { command } } },
          { type: 'done', reason: 'tool_calls' },
        ])
      }
      return stream([{ type: 'text', text: 'The path was blocked and the shell command was denied.' }, { type: 'done', reason: 'end_turn' }])
    },
    onEvent: (event) => {
      events.push(event)
      if (event.type === 'approval_required') {
        assert.equal(event.toolName, 'run_command')
        assert.equal(runtime.resolveApproval(event.approvalId, false), true)
      }
      if (event.type === 'run_finished') events.finish?.(event)
    },
  })
  const finished = waitForFinish(events)
  try {
    runtime.start([{ role: 'user', content: 'Try the requested project change.' }])
    const result = await finished
    assert.equal(result.reason, 'end_turn')
    assert.ok(events.some((event) => event.type === 'tool_blocked' && event.toolName === 'write_file'))
    assert.ok(events.some((event) => event.type === 'approval_required' && event.toolName === 'run_command'))
    const toolResult = events.find((event) => event.type === 'agent_event' && event.event.type === 'tool_result' && event.event.id === 'shell-1')
    assert.match(toolResult.event.output, /user denied/)
    assert.equal(existsSync(outsideFile), false)
    assert.equal(existsSync(sentinelFile), false)
  } finally {
    rmSync(checkpointDirectory, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
    rmSync(outsideFile, { force: true })
  }
})
