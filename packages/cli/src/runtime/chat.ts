import { runAgentLoop, type AgentEvent, type ToolContext } from '@cybermind/core';
import { runGoal, runPlan } from '@cybermind/core';
import { ProviderRouter, type ProviderId } from '@cybermind/providers';
import type { ProviderMessage } from '@cybermind/providers';
import {
  ApprovalGate,
  HeadlessApprovalUI,
  builtinTools,
  WorkspaceCheckpoints,
  executeApprovedWorkspaceTool,
  gateMcpTools,
  loadMcpTools,
  type ApprovalUI,
} from '@cybermind/tools';
import { SkillRegistry, buildSpawnSubagentTool, buildSpawnTeamTool } from '@cybermind/skills';
import { CollaborationManager } from '@cybermind/shared';
import type { SessionMessage } from '../state/session.js';
import { loadConfig } from '../utils/config.js';
import { getGitContext, gitContextPrompt } from '../utils/git-context.js';
import { projectMemoryPrompt } from '../utils/project-memory.js';
import { runHooks } from './hooks.js';

let singletonRouter: ProviderRouter | null = null;
let singletonRegistry: SkillRegistry | null = null;
let singletonCheckpoints: WorkspaceCheckpoints | null = null;

/** Per-process session id for grouping workspace checkpoints. */
const SESSION_ID = `sess-${Date.now().toString(36)}`;

export function getCheckpoints(): WorkspaceCheckpoints {
  if (!singletonCheckpoints) singletonCheckpoints = new WorkspaceCheckpoints(SESSION_ID);
  return singletonCheckpoints;
}

export function resetRouter(): void {
  singletonRouter = null;
}

export function getRouter(): ProviderRouter {
  const config = loadConfig();
  const configKeys = config.apiKeys ?? {};
  
  const cloudApiKey = process.env.CYBERMIND_API_KEY ?? config.authToken ?? configKeys.cybercoder ?? configKeys.cybercoder_cloud;

  if (!singletonRouter) {
    singletonRouter = new ProviderRouter({
      preferred: defaultProviderOrder(config, configKeys),
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY ?? configKeys.anthropic },
      cloud: { 
        apiKey: cloudApiKey,
        sessionId: config.sessionId,
        baseURL: process.env.CYBERMIND_CLOUD_URL ?? 'https://cybercli-api.onrender.com'
      },
      openai: { apiKey: process.env.OPENAI_API_KEY ?? configKeys.openai },
      groq: { apiKey: process.env.GROQ_API_KEY ?? configKeys.groq },
      google: { apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? configKeys.google ?? configKeys.gemini },
      openrouter: { apiKey: process.env.OPENROUTER_API_KEY ?? configKeys.openrouter },
      ollama: {
        defaultModel: config.lastModel || 'auto'
      }
    });
  }
  return singletonRouter;
}

export function getSkillRegistry(): SkillRegistry {
  if (!singletonRegistry) singletonRegistry = new SkillRegistry();
  return singletonRegistry;
}

function defaultProviderOrder(config: any, configKeys: Record<string, string>): ProviderId[] {
  const order: ProviderId[] = [];
  const cloudApiKey = process.env.CYBERMIND_API_KEY ?? config.authToken ?? configKeys.cybercoder ?? configKeys.cybercoder_cloud;
  
  if (cloudApiKey) {
    order.push('cybermind-cloud');
  }
  if (process.env.ANTHROPIC_API_KEY || configKeys.anthropic) {
    order.push('anthropic');
  }
  if (process.env.OPENAI_API_KEY || configKeys.openai) {
    order.push('openai');
  }
  if (process.env.GROQ_API_KEY || configKeys.groq) {
    order.push('groq');
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || configKeys.google || configKeys.gemini) {
    order.push('gemini');
  }
  if (process.env.OPENROUTER_API_KEY || configKeys.openrouter) {
    order.push('openrouter');
  }
  return order;
}

const SYSTEM_PROMPT = `You are CyberCoder, a fullstack agentic coding assistant running inside a terminal.
CRITICAL IDENTITY RULE: You must ALWAYS refer to yourself ONLY as "CyberCoder". NEVER refer to yourself as "Synthesizer", "AI", or any other internal node name.
You help with reading, editing, and running code across the user's project. Be concise,
prefer code over prose, and never invent file paths. You have access to these tools:
- read_file(path, offset?, limit?) — returns numbered lines of a file
- read_many(paths[]) — read SEVERAL files in one call (use to grok a feature fast)
- list_dir(path) — lists a directory
- grep(pattern, path?, include?) — ripgrep-style search
- repo_map(path?) — compact map of the project (dirs + key symbols per file);
  call this FIRST on an unfamiliar repo to navigate efficiently
- write_file(path, content) — create a NEW file (fails on overwrite)
- edit(path, old_string, new_string, replace_all?) — surgical replacements
- run_command(command, cwd?, timeout_ms?) — PowerShell on Windows, bash on Unix
- web_search(query, max_results?) — live keyless web search (titles, urls, snippets)
- web_fetch(url, max_chars?) — fetch a page and return clean readable text
- project_memory(action, …) — self-learning project memory in .cyber/: action='read'
  to recall what's known, 'update' to save durable facts (stack, entry points,
  commands, conventions, key paths, glossary, decisions), 'note' to log a learning.
  Update it whenever you discover something durable so future sessions (or any AI)
  understand this project from .cyber/ alone.
- manage_artifact(action, filename, content?) — create, update, or read an artifact (like implementation_plan.md or task.md) inside .cybercoder/artifacts/ for long-term task planning and scratchpads without cluttering the chat history.
- spawn_subagent(skill, prompt) — delegate to an installed skill (research, plan,
  code-review, …) which runs in an isolated context and returns a summary
- spawn_team(tasks[]) — run MULTIPLE sub-agents IN PARALLEL for independent
  pieces of work (e.g. research + review + plan at once), returns all results
Destructive tools (write_file, edit, run_command) require user approval each turn
unless the user has granted persistent trust via /trust. Prefer spawn_subagent for
broad exploration ("research"), planning ("plan"), and reviewing diffs ("code-review")
— it produces tighter summaries and keeps your main context clean. When a goal has
several independent parts, prefer spawn_team to do them concurrently.`;

/**
 * Convert UI session messages into provider messages (drops system entries
 * the CLI uses for its own status output).
 */
export function toProviderMessages(messages: SessionMessage[]): ProviderMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
}

export interface RunChatOptions {
  model?: string;
  systemPrompt?: string;
  onEvent: (evt: AgentEvent) => void;
  signal?: AbortSignal;
  /** Caller-supplied approval UI; defaults to headless (auto-deny destructive). */
  approvalUI?: ApprovalUI;
}

/** MCP tools are loaded once per process (servers stay alive for the session). */
type McpAgentTool = Awaited<ReturnType<typeof loadMcpTools>>['tools'][number];
let mcpToolsCache: McpAgentTool[] | null = null;
async function getMcpTools(): Promise<McpAgentTool[]> {
  if (mcpToolsCache) return mcpToolsCache;
  try {
    const { tools } = await loadMcpTools();
    mcpToolsCache = tools;
  } catch {
    mcpToolsCache = [];
  }
  return mcpToolsCache ?? [];
}

/**
 * Build the full wrapped tool set (built-ins behind the approval gate, plus the
 * spawn_subagent and spawn_team orchestration tools, plus any configured MCP
 * server tools) and the git-aware system prompt. Shared by runChat/runGoalChat.
 */
async function buildAgentTools(
  approvalUI?: ApprovalUI,
  additionalSystemPrompt = '',
  onProgress?: (event: Extract<AgentEvent, { type: 'subagent_progress' }>) => void,
): Promise<{ tools: any[]; systemPrompt: string }> {
  const router = getRouter();
  const registry = getSkillRegistry();
  const hookApprovalUI = approvalUI ?? new HeadlessApprovalUI();
  const gate = new ApprovalGate(hookApprovalUI);
  const builtins = builtinTools();

  const wrappedBuiltins = builtins.map((t) => ({
    schema: t.schema,
    destructive: t.destructive,
    verify: t.verify,
    execute: async (input: Record<string, unknown>, ctx: ToolContext) => {
      return executeApprovedWorkspaceTool(t, gate, getCheckpoints(), input, ctx, summarizeCall(t.schema.name, input), async () => {
        // preCommand hooks can block dangerous shell commands.
        if (t.schema.name === 'run_command') {
          const cmd = typeof input.command === 'string' ? input.command : '';
          const pre = await runHooks('preCommand', cmd, ctx.cwd, hookApprovalUI);
          if (pre.blocked) return `[blocked by preCommand hook]\n${pre.output}`;
        }

        const output = await t.execute(input, ctx);

        // postEdit / postWrite / postCommand hooks (auto-format, lint, etc.).
        try {
          if (t.schema.name === 'edit') {
            const h = await runHooks('postEdit', String(input.path ?? ''), ctx.cwd, hookApprovalUI);
            if (h.output) return `${output}\n${h.output}`;
          } else if (t.schema.name === 'write_file') {
            const h = await runHooks('postWrite', String(input.path ?? ''), ctx.cwd, hookApprovalUI);
            if (h.output) return `${output}\n${h.output}`;
          } else if (t.schema.name === 'run_command') {
            const h = await runHooks('postCommand', String(input.command ?? ''), ctx.cwd, hookApprovalUI);
            if (h.output) return `${output}\n${h.output}`;
          }
        } catch {
          /* hooks must never break the tool result */
        }
        return output;
      });
    },
  }));

  // MCP server tools, each gated through approval (they can do anything).
  const mcpWrapped = gateMcpTools(await getMcpTools(), gate);

  // Sub-agents use the exact same wrapped tools and security hooks as the
  // parent. This prevents delegation from becoming an approval bypass.
  const toolPool = [...wrappedBuiltins, ...mcpWrapped];
  const spawnTool = buildSpawnSubagentTool({ registry, provider: router, toolPool, onProgress });
  const teamTool = buildSpawnTeamTool({
    registry,
    provider: router,
    toolPool,
    concurrency: 3,
    worktreeManager: new CollaborationManager(),
    onProgress,
  });

  const gitBlock = gitContextPrompt(getGitContext());
  const memoryBlock = projectMemoryPrompt();
  
  // 🚀 VIBED CODER FEATURE: Dynamic Skill Injection
  let dynamicSkillsBlock = '';
  try {
    const allSkills = registry.list();
    
    // Automatically expose all installed skills to the main agent so it can use them dynamically
    const skillList = allSkills.length > 0 
      ? 'AVAILABLE SKILLS (You can delegate tasks to these skills using spawn_subagent or spawn_team):\n' + allSkills.map(s => `- ${s.frontmatter.name}: ${s.frontmatter.description || 'No description'}`).join('\n')
      : '';

    const injected = allSkills
      .filter(s => s.frontmatter?.inject_always)
      .map(s => `\n--- SKILL INJECTED: ${s.frontmatter?.name} ---\n${s.body}`);
      
    dynamicSkillsBlock = [skillList, ...injected].filter(Boolean).join('\n\n');
  } catch(e) {}

  const systemPrompt = [SYSTEM_PROMPT, additionalSystemPrompt, memoryBlock, gitBlock, dynamicSkillsBlock].filter(Boolean).join('\n\n');

  return { tools: [...wrappedBuiltins, spawnTool, teamTool, ...mcpWrapped], systemPrompt };
}

/**
 * Drive one agent turn. The caller passes the conversation history (after
 * appending the latest user message) and receives events as the model streams.
 */
export async function runChat(
  history: SessionMessage[],
  opts: RunChatOptions,
): Promise<void> {
  const router = getRouter();
  const providerMessages = toProviderMessages(history);
  const { tools, systemPrompt } = await buildAgentTools(opts.approvalUI, opts.systemPrompt, (evt) => opts.onEvent(evt));

  for await (const evt of runAgentLoop(providerMessages, {
    provider: router,
    systemPrompt,
    model: opts.model ?? 'auto',
    signal: opts.signal,
    tools,
  })) {
    opts.onEvent(evt);
  }
}

/**
 * Goal-driven run: keep working across rounds until the goal is met or the
 * round cap is hit. Powers the `/goal` command.
 */
export async function runGoalChat(
  history: SessionMessage[],
  opts: RunChatOptions & { maxRounds?: number },
): Promise<void> {
  const router = getRouter();
  const providerMessages = toProviderMessages(history);
  const { tools, systemPrompt } = await buildAgentTools(opts.approvalUI, opts.systemPrompt, (evt) => opts.onEvent(evt));

  for await (const evt of runGoal(providerMessages, {
    provider: router,
    systemPrompt,
    model: opts.model ?? 'auto',
    signal: opts.signal,
    tools,
    maxRounds: opts.maxRounds ?? 8,
    onEvent: opts.onEvent,
  })) {
    opts.onEvent(evt);
  }
}

/**
 * Read-only planning pass: produces an ordered task list grounded in the repo.
 * Powers the `/plan` command in real (not a synthesized prompt).
 */
export async function runPlanChat(
  history: SessionMessage[],
  opts: RunChatOptions,
): Promise<{ plan: string; steps: string[] }> {
  const router = getRouter();
  const providerMessages = toProviderMessages(history);
  const { tools } = await buildAgentTools(opts.approvalUI, '', (evt) => opts.onEvent(evt));

  return runPlan(providerMessages, {
    provider: router,
    model: opts.model ?? 'auto',
    tools,
    signal: opts.signal,
    onEvent: opts.onEvent,
  });
}

function summarizeCall(name: string, input: Record<string, unknown>): string {
  if (name === 'run_command') return `Run: ${String(input.command ?? '')}`;
  if (name === 'write_file') return `Create file: ${String(input.path ?? '')}`;
  if (name === 'edit') return `Edit file: ${String(input.path ?? '')}`;
  if (name === 'read_file') return `Read: ${String(input.path ?? '')}`;
  if (name === 'list_dir') return `List: ${String(input.path ?? '')}`;
  if (name === 'grep') return `Grep: /${String(input.pattern ?? '')}/`;
  return `${name}(${Object.keys(input).join(', ')})`;
}
