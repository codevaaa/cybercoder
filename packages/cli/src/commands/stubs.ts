import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * Every slash command listed in the master plan is registered up-front, even
 * if its real implementation lands in a later milestone. This lets `/help`
 * advertise the full command surface and gives users a clear "coming in MN"
 * message instead of "unknown command".
 *
 * As each milestone wires a command, delete its stub entry here and add the
 * real handler to its own file under packages/cli/src/commands/.
 */

interface StubSpec {
  name: string;
  description: string;
  category: SlashCommandHandler['category'];
  milestone: string;
  aliases?: string[];
  usage?: string;
}

const STUBS: StubSpec[] = [
  // Session / context (planned)
  { name: 'background', category: 'session', milestone: 'planned', description: 'Send this session to the background and free the terminal.' },
  { name: 'btw', category: 'session', milestone: 'planned', description: 'Ask a quick side question without interrupting the main thread.' },

  // Agent / model (planned)
  { name: 'advisor', category: 'agent', milestone: 'planned', description: 'Consult a stronger advisor model at key moments.' },

  // Auth / sync (planned)
  { name: 'team-workspace', category: 'auth', milestone: 'planned', description: 'Switch the active team workspace.' },
  { name: 'sync', category: 'auth', milestone: 'planned', description: 'Push/pull skills and settings to/from the backend.' },

  // Safety (planned)
  { name: 'sandbox', category: 'safety', milestone: 'planned', description: 'Toggle Docker/Podman sandbox for risky commands.' },

  // Collab (planned)
  { name: 'pair', category: 'collab', milestone: 'planned', description: 'Start or join a live pair session over LAN/tunnel.' },
];

export function buildStubCommands(ctx: CommandContext): SlashCommandHandler[] {
  return STUBS.map((spec) => ({
    name: spec.name,
    description: spec.description,
    category: spec.category,
    aliases: spec.aliases,
    usage: spec.usage,
    run: () => {
      ctx.appendMessage({
        id: `${spec.name}-${Date.now()}`,
        role: 'system',
        content: `/${spec.name} is planned and not yet available. Use /help to see active commands.`,
        createdAt: Date.now(),
      });
    },
  }));
}
