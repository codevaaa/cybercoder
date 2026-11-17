import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CodicSubagentCoordinator } from './subagents.ts'

const providerInfo = { id: 'test', displayName: 'Test', requiresNetwork: false, ready: true }

test('one parent run cannot exceed its total helper-agent concurrency limit across tool calls', async () => {
  let active = 0
  let peakActive = 0
  const provider = {
    info: providerInfo,
    async listModels() { return ['test'] },
    async *chat() {
      active += 1
      peakActive = Math.max(peakActive, active)
      try {
        await new Promise((resolve) => setTimeout(resolve, 25))
        yield { type: 'text', text: 'Finished.' }
        yield { type: 'done', reason: 'end_turn' }
      } finally {
        active -= 1
      }
    },
  }
  const readFile = {
    schema: { name: 'read_file', description: 'Read one file', inputSchema: { type: 'object' } },
    async execute() { return 'contents' },
  }
  const coordinator = new CodicSubagentCoordinator({
    provider,
    toolPool: [readFile],
    getRunId: () => 'run-test',
    onProgress() {},
    model: 'auto',
    reasoningEffort: 'low',
    maxSubagents: 2,
  })
  const context = { cwd: process.cwd(), signal: new AbortController().signal }
  const team = (prefix) => ({ tasks: [
    { skill: 'research', label: `${prefix} A`, prompt: 'Inspect one area.' },
    { skill: 'plan', label: `${prefix} B`, prompt: 'Plan another area.' },
  ] })

  const results = await Promise.all([
    coordinator.tool.execute(team('First'), context),
    coordinator.tool.execute(team('Second'), context),
  ])

  assert.equal(peakActive, 2)
  assert.equal(results.filter((result) => /would exceed the limit of 2 active specialists/.test(result)).length, 1)
  assert.equal(results.filter((result) => /Specialist results \(2\)/.test(result)).length, 1)
})
