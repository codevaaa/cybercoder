import { randomUUID } from 'node:crypto'
import type { AgentTool, ToolContext } from '../../core/src/agent-loop.js'
import type { LLMProvider } from '../../providers/src/types.js'
import { spawnSubagent } from '../../skills/src/runner.js'
import type { Skill } from '../../skills/src/types.js'

export const DEFAULT_MAX_SUBAGENTS = 3
const MAX_PROMPT_LENGTH = 4_000
const MAX_SUMMARY_LENGTH = 6_000
const MAX_TOTAL_RESULT_LENGTH = 18_000
const READ_ONLY_TOOL_NAMES = ['read_file', 'read_many', 'list_dir', 'grep', 'repo_map']

export type SubagentSkillName = 'research' | 'plan' | 'code-review'
export type SubagentProgressStatus = 'running' | 'done' | 'error' | 'cancelled'

export interface SubagentProgressEvent {
  type: 'subagent_progress'
  runId: string
  agentId: string
  label: string
  skill: SubagentSkillName
  status: SubagentProgressStatus
  model: string
  summary?: string
  durationMs?: number
  toolCalls?: number
  inputTokens?: number
  outputTokens?: number
  error?: string
}

export interface SpawnSubagentsToolOptions {
  provider: LLMProvider
  toolPool: AgentTool[]
  getRunId: () => string | null
  onProgress: (event: SubagentProgressEvent) => void
  model: string
  reasoningEffort: 'low' | 'medium' | 'high'
  maxSubagents?: number
}

interface RequestedSubagent {
  skill: SubagentSkillName
  label: string
  prompt: string
}

const BUILT_IN_SKILLS: Record<SubagentSkillName, Skill> = {
  research: makeSkill(
    'research',
    'Read-only codebase exploration specialist. Find relevant files, symbols, behavior, and evidence for a focused question.',
    'Inspect the selected project using read-only tools. Trace relevant code paths and cite file paths and line numbers when available. Separate direct observations from inferences. Never suggest that you changed files; do not modify files, run commands, access the network, or inspect paths outside the selected project. Return concise findings and note remaining uncertainty.',
  ),
  plan: makeSkill(
    'plan',
    'Read-only implementation planning specialist. Turn a request into a grounded, ordered plan based on the selected codebase.',
    'Inspect the selected project using read-only tools. Produce a practical, ordered plan with the likely files and components involved, dependencies, risks, and acceptance checks. Ground steps in the current code. Do not modify files, run commands, access the network, or inspect paths outside the selected project.',
  ),
  'code-review': makeSkill(
    'code-review',
    'Read-only code review specialist. Look for concrete correctness, security, reliability, and maintainability issues in the requested project area.',
    'Inspect the selected project using read-only tools. Report only actionable findings, ordered by severity, with file paths, line numbers when available, impact, and a concise fix direction. Distinguish verified defects from questions. Do not modify files, run commands, access the network, or inspect paths outside the selected project.',
  ),
}

/**
 * Owns the active helper agents for one parent task. Children share the parent's
 * authenticated Codeva provider and selected workspace, inherit model/effort,
 * and receive only read-only workspace tools. Each can be stopped independently.
 */
export class CodicSubagentCoordinator {
  readonly tool: AgentTool
  private readonly active = new Map<string, AbortController>()
  private readonly maxSubagents: number
  private readonly readOnlyTools: AgentTool[]

  constructor(private readonly options: SpawnSubagentsToolOptions) {
    this.maxSubagents = clampMaxSubagents(options.maxSubagents)
    this.readOnlyTools = options.toolPool.filter((tool) => READ_ONLY_TOOL_NAMES.includes(tool.schema.name))
    this.tool = this.createTool()
  }

  cancel(agentId: string): boolean {
    const controller = this.active.get(agentId)
    if (!controller) return false
    controller.abort()
    return true
  }

  cancelAll(): void {
    for (const controller of this.active.values()) controller.abort()
  }

  private createTool(): AgentTool {
    return {
      schema: {
        name: 'spawn_subagents',
        description: `Run up to ${this.maxSubagents} independent research, planning, or code-review specialists in parallel. Each specialist inherits the selected model and reasoning effort and can only read files and search inside the selected project. They cannot edit files, run shell commands, access the network, or push Git changes. Use this when independent analysis helps, then synthesize the findings.`,
        inputSchema: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              minItems: 1,
              maxItems: this.maxSubagents,
              description: 'Independent specialist tasks. Use only research, plan, or code-review.',
              items: {
                type: 'object',
                properties: {
                  skill: { type: 'string', enum: ['research', 'plan', 'code-review'] },
                  label: { type: 'string', description: 'Short progress label.' },
                  prompt: { type: 'string', description: 'A focused read-only question about the selected project.' },
                },
                required: ['skill', 'prompt'],
              },
            },
          },
          required: ['tasks'],
        },
      },
      execute: async (input: Record<string, unknown>, context: ToolContext): Promise<string> => {
        const tasks = parseRequestedTasks(input.tasks, this.maxSubagents)
        if (!tasks.ok) return `Error: ${tasks.error}`
        if (!this.readOnlyTools.length) return 'Error: no read-only project tools are available for specialist agents.'
        const runId = this.options.getRunId()
        if (!runId) return 'Error: the parent task is no longer active.'
        if (this.active.size + tasks.tasks.length > this.maxSubagents) {
          return `Error: starting ${tasks.tasks.length} more specialists would exceed the limit of ${this.maxSubagents} active specialists. Wait for a helper to finish or stop one before starting another team.`
        }

        const results = await Promise.all(tasks.tasks.map(async (task, index) => {
          const agentId = `${runId}-subagent-${index + 1}-${randomUUID().slice(0, 8)}`
          const controller = new AbortController()
          const parentSignal = context.signal
          const abortFromParent = () => controller.abort()
          if (parentSignal?.aborted) controller.abort()
          else parentSignal?.addEventListener('abort', abortFromParent, { once: true })
          this.active.set(agentId, controller)
          const start = Date.now()
          const model = this.options.model || 'auto'
          this.options.onProgress({
            type: 'subagent_progress', runId, agentId, label: task.label, skill: task.skill,
            status: 'running', model,
          })

          try {
            const result = await spawnSubagent({
              skill: BUILT_IN_SKILLS[task.skill],
              prompt: `Project-scoped read-only task: ${task.prompt}`,
              provider: this.options.provider,
              toolPool: this.readOnlyTools,
              cwd: context.cwd,
              model,
              reasoningEffort: this.options.reasoningEffort,
              maxIterations: 6,
              agentId,
              signal: controller.signal,
            })
            const summary = truncate(result.summary || (result.reason === 'cancelled' ? 'Stopped by you.' : '(No findings returned.)'), MAX_SUMMARY_LENGTH)
            const status: SubagentProgressStatus = result.reason === 'cancelled' ? 'cancelled' : result.reason === 'error' ? 'error' : 'done'
            this.options.onProgress({
              type: 'subagent_progress', runId, agentId, label: task.label, skill: task.skill,
              status, model, summary,
              durationMs: Date.now() - start,
              toolCalls: result.toolCalls,
              inputTokens: result.usage.inputTokens,
              outputTokens: result.usage.outputTokens,
              ...(result.error && status === 'error' ? { error: truncate(result.error, 500) } : {}),
            })
            return { task, summary, status, error: result.error }
          } catch (error) {
            const cancelled = controller.signal.aborted
            const message = error instanceof Error ? error.message : 'The specialist agent failed.'
            this.options.onProgress({
              type: 'subagent_progress', runId, agentId, label: task.label, skill: task.skill,
              status: cancelled ? 'cancelled' : 'error', model,
              durationMs: Date.now() - start,
              ...(!cancelled ? { error: truncate(message, 500) } : {}),
            })
            return { task, summary: '', status: cancelled ? 'cancelled' as const : 'error' as const, error: message }
          } finally {
            parentSignal?.removeEventListener('abort', abortFromParent)
            this.active.delete(agentId)
          }
        }))

        const sections = results.map(({ task, summary, status, error }) =>
          `## ${task.label} · ${task.skill} · ${status}\n${summary || `Error: ${error ?? 'No summary returned.'}`}`)
        return truncate(`# Specialist results (${results.length})\n\n${sections.join('\n\n')}`, MAX_TOTAL_RESULT_LENGTH)
      },
    }
  }
}

export function clampMaxSubagents(value: unknown): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.max(1, Math.min(DEFAULT_MAX_SUBAGENTS, parsed)) : DEFAULT_MAX_SUBAGENTS
}

function parseRequestedTasks(rawTasks: unknown, maxSubagents: number): { ok: true; tasks: RequestedSubagent[] } | { ok: false; error: string } {
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) return { ok: false, error: 'provide a non-empty tasks array.' }
  if (rawTasks.length > maxSubagents) return { ok: false, error: `at most ${maxSubagents} specialist tasks may run at once.` }
  const tasks: RequestedSubagent[] = []

  for (const [index, rawTask] of rawTasks.entries()) {
    if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) return { ok: false, error: `task ${index + 1} must be an object.` }
    const item = rawTask as Record<string, unknown>
    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
    if (!prompt) return { ok: false, error: `task ${index + 1} needs a prompt.` }
    if (prompt.length > MAX_PROMPT_LENGTH) return { ok: false, error: `task ${index + 1} exceeds ${MAX_PROMPT_LENGTH} characters.` }
    const skill = item.skill
    if (skill !== 'research' && skill !== 'plan' && skill !== 'code-review') {
      return { ok: false, error: `task ${index + 1} must use research, plan, or code-review.` }
    }
    const requestedLabel = typeof item.label === 'string' ? item.label.trim() : ''
    const label = (requestedLabel || `Agent ${index + 1}`).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 64)
    tasks.push({ skill, label: label || `Agent ${index + 1}`, prompt })
  }

  return { ok: true, tasks }
}

function makeSkill(name: SubagentSkillName, description: string, body: string): Skill {
  return {
    id: `bundled/${name}`,
    source: 'bundled',
    path: `codic://skills/${name}`,
    frontmatter: {
      name,
      description,
      version: '1.0.0',
      inputs: [],
      outputs: [],
      requires: { tools: READ_ONLY_TOOL_NAMES, mcp: [] },
      triggers: [],
      official: true,
    },
    body,
  }
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}\n…[truncated]` : value
}
