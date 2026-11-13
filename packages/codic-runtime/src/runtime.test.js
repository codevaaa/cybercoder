import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { CodicRuntime, isSafeReadOnlyCommand } from './runtime.ts'

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

test('safe-read approval policy only auto-approves exact read-only commands', () => {
  for (const command of ['pwd', 'Get-Location', 'git status --short', 'git diff --stat', 'git branch --show-current', 'Get-ChildItem -Name']) assert.equal(isSafeReadOnlyCommand(command), true)
  for (const command of ['git push', 'git status; whoami', 'git diff > patch.txt', 'npm install', 'curl https://example.test', 'Remove-Item file.txt', '']) assert.equal(isSafeReadOnlyCommand(command), false)
  assert.equal(isSafeReadOnlyCommand({ command: 'git status' }), false)
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
    reasoningEffort: 'high',
    fetchImpl: async (_url, init) => {
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-session')
      const request = JSON.parse(init.body)
      assert.equal(request.effort, 'high')
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

test('safe-read policy skips approval for an exact status command but continues the task', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-safe-read-'))
  const checkpointSession = `codic-test-${randomUUID()}`
  const checkpointDirectory = path.join(homedir(), '.codeva', 'checkpoints', checkpointSession)
  const events = []
  let call = 0
  const runtime = new CodicRuntime({
    workspaceRoot: project,
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'test-session',
    checkpointSessionId: checkpointSession,
    approvalPolicy: 'safe-reads',
    fetchImpl: async (_url, init) => {
      call += 1
      if (call === 1) {
        const request = JSON.parse(init.body)
        assert.equal(request.effort, 'low')
        return stream([
          { type: 'tool_call', toolCall: { id: 'read-status', name: 'run_command', input: { command: 'git status --short' } } },
          { type: 'done', reason: 'tool_calls' },
        ])
      }
      return stream([{ type: 'text', text: 'Status checked.' }, { type: 'done', reason: 'end_turn' }])
    },
    onEvent: event => { events.push(event); if (event.type === 'run_finished') events.finish?.(event) },
  })
  const finished = waitForFinish(events)
  try {
    runtime.start([{ role: 'user', content: 'Check the working tree.' }])
    const result = await finished
    assert.equal(result.reason, 'end_turn')
    assert.equal(events.some(event => event.type === 'approval_required'), false)
    assert.equal(events.some(event => event.type === 'agent_event' && event.event.type === 'tool_result' && event.event.ok), true)
  } finally {
    runtime.cancel()
    rmSync(checkpointDirectory, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

test('Codic runs parallel read-only specialist agents and streams their progress', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-subagents-'))
  const checkpointSession = `codic-test-${randomUUID()}`
  const checkpointDirectory = path.join(homedir(), '.codeva', 'checkpoints', checkpointSession)
  const events = []
  let parentCalls = 0
  const runtime = new CodicRuntime({
    workspaceRoot: project,
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'test-session',
    checkpointSessionId: checkpointSession,
    model: 'codeva/ravan',
    reasoningEffort: 'high',
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body)
      assert.equal(request.model, 'codeva/ravan')
      assert.equal(request.effort, 'high')
      const toolNames = (request.tools ?? []).map((tool) => tool.function.name)
      if (toolNames.includes('spawn_subagents')) {
        parentCalls += 1
        if (parentCalls === 1) {
          assert.ok(toolNames.includes('write_file'))
          assert.ok(toolNames.includes('run_command'))
          assert.equal(request.tools.find((tool) => tool.function.name === 'spawn_subagents').function.parameters.properties.tasks.maxItems, 3)
          return stream([{
            type: 'tool_call',
            toolCall: {
              id: 'team-1',
              name: 'spawn_subagents',
              input: {
                tasks: [
                  { skill: 'research', label: 'Find auth flow', prompt: 'Trace the sign-in flow.' },
                  { skill: 'code-review', label: 'Review boundary', prompt: 'Review the path boundary.' },
                ],
              },
            },
          }, { type: 'done', reason: 'tool_calls' }])
        }
        const toolResult = request.messages.find((message) => message.role === 'tool' && message.tool_call_id === 'team-1')
        assert.match(toolResult.content, /Find auth flow/)
        assert.match(toolResult.content, /Review boundary/)
        return stream([{ type: 'text', text: 'Both specialists finished their read-only analysis.' }, { type: 'done', reason: 'end_turn' }])
      }

      assert.ok(toolNames.includes('read_file'))
      assert.ok(toolNames.includes('grep'))
      assert.equal(toolNames.some((name) => ['write_file', 'edit_file', 'run_command', 'spawn_subagents'].includes(name)), false)
      const systemPrompt = request.messages.find((message) => message.role === 'system')?.content ?? ''
      assert.match(systemPrompt, /specialist/)
      return stream([
        { type: 'text', text: `Analysis from ${systemPrompt.includes('code-review') ? 'review' : 'research'} specialist.` },
        { type: 'usage', inputTokens: 23, outputTokens: 12 },
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
    runtime.start([{ role: 'user', content: 'Understand and review this project.' }])
    const result = await finished
    assert.equal(result.reason, 'end_turn', JSON.stringify(events, null, 2))
    assert.equal(parentCalls, 2)
    assert.equal(events.filter((event) => event.type === 'subagent_progress' && event.status === 'running').length, 2)
    assert.equal(events.filter((event) => event.type === 'subagent_progress' && event.status === 'done').length, 2)
    assert.ok(events.filter((event) => event.type === 'subagent_progress').every((event) => event.model === 'codeva/ravan'))
    assert.ok(events.filter((event) => event.type === 'subagent_progress' && event.status === 'done').every((event) => event.toolCalls === 0 && event.inputTokens === 23 && event.outputTokens === 12))
    assert.ok(events.some((event) => event.type === 'subagent_progress' && /Analysis from/.test(event.summary ?? '')))
  } finally {
    runtime.cancel()
    rmSync(checkpointDirectory, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

test('Codic can stop one helper without cancelling its parent or sibling', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-subagent-cancel-'))
  const checkpointSession = `codic-test-${randomUUID()}`
  const checkpointDirectory = path.join(homedir(), '.codeva', 'checkpoints', checkpointSession)
  const events = []
  let runtime
  let parentCalls = 0
  let cancelledId = null
  runtime = new CodicRuntime({
    workspaceRoot: project,
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'test-session',
    checkpointSessionId: checkpointSession,
    model: 'codeva/ravan',
    reasoningEffort: 'medium',
    maxParallelSubagents: 2,
    fetchImpl: async (_url, init) => {
      const request = JSON.parse(init.body)
      const toolNames = (request.tools ?? []).map((tool) => tool.function.name)
      if (toolNames.includes('spawn_subagents')) {
        parentCalls += 1
        if (parentCalls === 1) {
          assert.equal(request.tools.find((tool) => tool.function.name === 'spawn_subagents').function.parameters.properties.tasks.maxItems, 2)
          return stream([
          { type: 'tool_call', toolCall: { id: 'cancel-team-1', name: 'spawn_subagents', input: { tasks: [
            { skill: 'research', label: 'Slow researcher', prompt: 'Inspect the account flow.' },
            { skill: 'plan', label: 'Fast planner', prompt: 'Outline a small UI plan.' },
          ] } } },
          { type: 'done', reason: 'tool_calls' },
          ])
        }
        const toolResult = request.messages.find((message) => message.role === 'tool' && message.tool_call_id === 'cancel-team-1')
        assert.match(toolResult.content, /Slow researcher · research · cancelled/)
        assert.match(toolResult.content, /Fast planner · plan · done/)
        return stream([{ type: 'text', text: 'The remaining helper completed and the task continued.' }, { type: 'done', reason: 'end_turn' }])
      }
      assert.equal(request.model, 'codeva/ravan')
      assert.equal(request.effort, 'medium')
      assert.equal(toolNames.some((name) => ['write_file', 'edit_file', 'run_command'].includes(name)), false)
      const userContent = request.messages.find((message) => message.role === 'user')?.content ?? ''
      if (userContent.includes('Inspect the account flow')) return new Promise((_resolve, reject) => {
        if (init.signal.aborted) {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
          return
        }
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        }, { once: true })
      })
      return stream([{ type: 'text', text: 'Planning result.' }, { type: 'done', reason: 'end_turn' }])
    },
    onEvent: (event) => {
      events.push(event)
      if (event.type === 'subagent_progress' && event.status === 'running' && event.label === 'Slow researcher' && !cancelledId) {
        cancelledId = event.agentId
        assert.equal(runtime.cancelSubagent(event.agentId), true)
      }
      if (event.type === 'run_finished') events.finish?.(event)
    },
  })
  const finished = waitForFinish(events)
  try {
    runtime.start([{ role: 'user', content: 'Ask independent helpers to inspect this project.' }])
    const result = await finished
    assert.equal(result.reason, 'end_turn', JSON.stringify(events, null, 2))
    assert.ok(cancelledId)
    assert.ok(events.some((event) => event.type === 'subagent_progress' && event.agentId === cancelledId && event.status === 'cancelled'))
    assert.ok(events.some((event) => event.type === 'subagent_progress' && event.label === 'Fast planner' && event.status === 'done'))
    assert.equal(parentCalls, 2)
  } finally {
    runtime.cancel()
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
        assert.ok(['write_file', 'run_command'].includes(event.toolName))
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
    assert.ok(events.some((event) => event.type === 'approval_required' && event.toolName === 'write_file'))
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

test('full-access policy writes an explicitly requested file outside the selected project and checkpoints it', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-full-access-'))
  const outsideDirectory = mkdtempSync(path.join(tmpdir(), 'codic-runtime-full-access-outside-'))
  const outsideFile = path.join(outsideDirectory, 'preview.txt')
  const checkpointSession = `codic-test-${randomUUID()}`
  const checkpointDirectory = path.join(homedir(), '.codeva', 'checkpoints', checkpointSession)
  const events = []
  let call = 0
  const runtime = new CodicRuntime({
    workspaceRoot: project,
    apiBaseUrl: 'https://api.example.test/api/v1',
    getAccessToken: async () => 'test-session',
    checkpointSessionId: checkpointSession,
    approvalPolicy: 'full-access',
    fetchImpl: async () => {
      call += 1
      return call === 1
        ? stream([
            { type: 'tool_call', toolCall: { id: 'external-write-1', name: 'write_file', input: { path: outsideFile, content: 'Created with full access.' } } },
            { type: 'tool_call', toolCall: { id: 'full-shell-1', name: 'run_command', input: { command: 'pwd' } } },
            { type: 'done', reason: 'tool_calls' },
          ])
        : stream([{ type: 'text', text: 'The requested file was created.' }, { type: 'done', reason: 'end_turn' }])
    },
    onEvent: (event) => { events.push(event); if (event.type === 'run_finished') events.finish?.(event) },
  })
  const finished = waitForFinish(events)
  try {
    runtime.start([{ role: 'user', content: `Create ${outsideFile}.` }])
    const result = await finished
    assert.equal(result.reason, 'end_turn')
    assert.equal(readFileSync(outsideFile, 'utf8'), 'Created with full access.')
    assert.equal(events.some((event) => event.type === 'approval_required'), false)
    const shellResult = events.find((event) => event.type === 'agent_event' && event.event.type === 'tool_result' && event.event.id === 'full-shell-1')
    assert.match(shellResult.event.output, new RegExp(project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    const checkpoint = events.find((event) => event.type === 'checkpoint_created')
    assert.ok(checkpoint)
    assert.equal(checkpoint.checkpoint.files[0], path.relative(project, outsideFile))
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepEqual(runtime.restoreCheckpoint(checkpoint.checkpoint.seq), { restored: 0, deleted: 1 })
    assert.equal(existsSync(outsideFile), false)
  } finally {
    runtime.cancel()
    rmSync(checkpointDirectory, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
    rmSync(outsideDirectory, { recursive: true, force: true })
  }
})

test('ask policy requires a one-time approval before reading outside the selected project', async () => {
  const project = mkdtempSync(path.join(tmpdir(), 'codic-runtime-external-read-'))
  const outsideDirectory = mkdtempSync(path.join(tmpdir(), 'codic-runtime-external-read-outside-'))
  const outsideFile = path.join(outsideDirectory, 'context.txt')
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
    fetchImpl: async () => {
      call += 1
      return call === 1
        ? stream([
            { type: 'tool_call', toolCall: { id: 'external-read-1', name: 'read_file', input: { path: outsideFile } } },
            { type: 'done', reason: 'tool_calls' },
          ])
        : stream([{ type: 'text', text: 'The approved file content was read.' }, { type: 'done', reason: 'end_turn' }])
    },
    onEvent: (event) => {
      events.push(event)
      if (event.type === 'approval_required') assert.equal(runtime.resolveApproval(event.approvalId, true), true)
      if (event.type === 'run_finished') events.finish?.(event)
    },
  })
  const finished = waitForFinish(events)
  try {
    writeFileSync(outsideFile, 'Private context the user approved.')
    runtime.start([{ role: 'user', content: `Read ${outsideFile}.` }])
    const result = await finished
    assert.equal(result.reason, 'end_turn')
    const approval = events.find((event) => event.type === 'approval_required')
    assert.equal(approval.unsandboxed, true)
    assert.match(approval.summary, /context\.txt/)
    const toolResult = events.find((event) => event.type === 'agent_event' && event.event.type === 'tool_result' && event.event.id === 'external-read-1')
    assert.match(toolResult.event.output, /Private context the user approved\./)
  } finally {
    runtime.cancel()
    rmSync(checkpointDirectory, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
    rmSync(outsideDirectory, { recursive: true, force: true })
  }
})
