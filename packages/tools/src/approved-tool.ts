import type { AgentTool, ToolContext } from './core-types.js';
import { ApprovalGate } from './approval.js';
import { WorkspaceCheckpoints } from './workspace-checkpoint.js';

/** Run a workspace tool after approval and checkpoint file edits before mutation. */
export async function executeApprovedWorkspaceTool(
  tool: AgentTool,
  gate: ApprovalGate,
  checkpoints: WorkspaceCheckpoints,
  input: Record<string, unknown>,
  ctx: ToolContext,
  summary: string,
  action: () => Promise<string> = () => tool.execute(input, ctx),
): Promise<string> {
  const result = await gate.withApproval({
    toolName: tool.schema.name,
    input,
    destructive: Boolean(tool.destructive),
    summary,
  }, async () => {
    if (tool.destructive && (tool.schema.name === 'edit' || tool.schema.name === 'write_file')) {
      const target = input.path;
      if (typeof target === 'string' && target) {
        try {
          checkpoints.snapshot([target], `${tool.schema.name} ${target}`);
        } catch {
          // Checkpoint failure must never block the user's approved edit.
        }
      }
    }
    return action();
  });

  return result.allowed ? result.value : `[user denied tool '${tool.schema.name}']`;
}
