import type { CommandContext, SlashCommandHandler } from './index.js';

export function buildTestCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: '/test',
    description: 'Run tests and auto-fix failures iteratively (TDD Loop)',
    category: 'agent',
    usage: '/test <command>',
    run: (args) => {
      const cmd = args.trim();
      if (!cmd) {
        ctx.appendMessage({ role: 'assistant', type: 'text', text: 'Usage: /test <command> (e.g. /test npm run test)' });
        return;
      }
      
      const prompt = `Run the following test command: \`${cmd}\`. If it fails with a non-zero exit code, analyze the stderr/stdout, determine why it failed, apply the necessary code fixes using your tools, and then run the test again. Repeat this loop autonomously until the test passes with exit code 0 or you hit a limit of 3 attempts.`;
      
      ctx.appendMessage({
        role: 'user',
        type: 'text',
        text: prompt,
      });
      ctx.submitUserPrompt?.(prompt);
    },
  };
}

export function buildPRCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: '/pr',
    description: 'Automatically generate a PR title/body and open a Pull Request',
    category: 'agent',
    usage: '/pr [branch_name]',
    run: (args) => {
      const branchName = args.trim() || 'auto-pr-' + Math.random().toString(36).substring(2, 8);
      
      const prompt = `Please review the current \`git diff\`. 
1. Create a new branch named \`${branchName}\` if not already on it.
2. Commit the changes with an incredibly detailed, semantic commit message.
3. Push the branch to origin.
4. Use the \`run_command\` tool with \`gh pr create --title "..." --body "..."\` to open a GitHub Pull Request. You MUST generate a beautiful Markdown body describing the changes, testing steps, and architectural decisions.`;

      ctx.appendMessage({
        role: 'user',
        type: 'text',
        text: prompt,
      });
      ctx.submitUserPrompt?.(prompt);
    },
  };
}
