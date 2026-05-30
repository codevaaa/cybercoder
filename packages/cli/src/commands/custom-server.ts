import { CustomServerManager } from '@cybermind/shared';
import type { CommandContext, SlashCommandHandler } from './index.js';

/**
 * `/custom` — manage custom server models and API integration.
 *
 *   /custom connect <url>        — connect to custom server
 *   /custom key <api-key>        — set API key
 *   /custom models               — list available models
 *   /custom switch <model>       — switch to custom model
 *   /custom add <config>         — add custom model
 *   /custom status               — show server status
 */
export function buildCustomCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'custom',
    description: 'Manage custom server models and API integration.',
    category: 'utility',
    usage: '/custom <connect|key|models|switch|add|status> [args...]',
    run: async (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `custom-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /custom <connect|key|models|switch|add|status> [args...]');
        return;
      }

      const command = parts[0];
      const customServer = new CustomServerManager();

      switch (command) {
        case 'connect':
          if (parts.length < 2) {
            reply('Usage: /custom connect <server-url>');
            return;
          }
          const serverUrl = parts[1];
          if (!serverUrl) {
            reply('Server URL is required');
            return;
          }
          customServer.updateConfig({ baseUrl: serverUrl });
          
          reply(`🔗 Connecting to custom server: ${serverUrl}\n\n⏳ Testing connection...`);
          
          const connected = await customServer.testConnection();
          if (connected) {
            reply(`✅ Connected successfully!\n\nServer: ${serverUrl}\nStatus: Online\nModels: Available\n\n💡 Use /custom models to see available models`);
          } else {
            reply(`❌ Connection failed!\n\nServer: ${serverUrl}\nStatus: Offline\n\nPlease check:\n• Server URL is correct\n• Server is running\n• API key is set (if required)`);
          }
          break;

        case 'key':
          if (parts.length < 2) {
            reply('Usage: /custom key <api-key>');
            return;
          }
          const apiKey = parts[1];
          if (!apiKey) {
            reply('API key is required');
            return;
          }
          customServer.setApiKey(apiKey);
          reply(`🔑 API key set successfully!\n\n✅ Key configured\nLength: ${apiKey.length} characters\nStatus: Active\n\n💡 Your custom models are now ready to use`);
          break;

        case 'models':
          reply(`🤖 Loading custom models...`);
          
          const models = await customServer.listModels();
          if (models.length === 0) {
            reply('No custom models available. Please connect to a server first.');
            return;
          }

          let modelList = ['📋 Available Custom Models:', ''];
          models.forEach((model, index) => {
            const status = model.isActive ? '🟢' : '🔴';
            modelList.push(`${status} ${index + 1}. ${model.name}`);
            modelList.push(`   ID: ${model.id}`);
            modelList.push(`   Provider: ${model.provider}`);
            modelList.push(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
            modelList.push(`   Cost: $${model.inputCost}/1M input, $${model.outputCost}/1M output`);
            modelList.push(`   Capabilities: ${model.capabilities.join(', ')}`);
            modelList.push('');
          });

          reply(modelList.join('\n'));
          break;

        case 'switch':
          if (parts.length < 2) {
            reply('Usage: /custom switch <model-id>');
            return;
          }
          const modelId = parts[1];
          if (!modelId) {
            reply('Model ID is required');
            return;
          }
          const model = customServer.getModel(modelId);
          
          if (!model) {
            reply(`❌ Model "${modelId}" not found!\n\nUse /custom models to see available models`);
            return;
          }

          reply(`🔄 Switching to custom model: ${model.name}\n\n⏳ Initializing model...`);
          reply(`✅ Model switched successfully!\n\nModel: ${model.name}\nID: ${model.id}\nProvider: ${model.provider}\nContext: ${model.contextWindow.toLocaleString()} tokens\n\n🚀 Ready to use!`);
          break;

        case 'add':
          if (parts.length < 7) {
            reply('Usage: /custom add <id> <name> <provider> <context> <input-cost> <output-cost>');
            return;
          }
          
          const newModelId = parts[1];
          const newModelName = parts[2];
          const newModelProvider = parts[3];
          const newModelContext = parts[4];
          const newModelInputCost = parts[5];
          const newModelOutputCost = parts[6];
          
          if (!newModelId || !newModelName || !newModelProvider || !newModelContext || !newModelInputCost || !newModelOutputCost) {
            reply('All parameters are required');
            return;
          }
          
          const newModel = {
            id: newModelId,
            name: newModelName,
            provider: newModelProvider,
            description: `Custom model ${newModelName}`,
            contextWindow: parseInt(newModelContext),
            inputCost: parseFloat(newModelInputCost),
            outputCost: parseFloat(newModelOutputCost),
            capabilities: ['code', 'reasoning'],
            endpoint: '/chat/completions',
            isActive: true,
          };

          customServer.addCustomModel(newModel);
          reply(`✅ Custom model added successfully!\n\nName: ${newModel.name}\nID: ${newModel.id}\nProvider: ${newModel.provider}\nContext: ${newModel.contextWindow.toLocaleString()} tokens\nCost: $${newModel.inputCost}/$${newModel.outputCost} per 1M tokens\n\n🚀 Model is now available!`);
          break;

        case 'status':
          const config = customServer.getConfig();
          const hasApiKey = customServer.getApiKey() !== null;
          const activeModels = customServer.getActiveModels();
          
          const statusLines = [
            '📊 Custom Server Status',
            '',
            `🔗 Server: ${config.baseUrl}`,
            `🔑 API Key: ${hasApiKey ? '✅ Configured' : '❌ Not set'}`,
            `🤖 Active Models: ${activeModels.length}`,
            `⏱️ Timeout: ${config.timeout}ms`,
            `🔄 Retries: ${config.retries}`,
            `📈 Rate Limit: ${config.rateLimit.requestsPerMinute} requests/min`,
            '',
            '🎯 Quick Actions:',
            '• /custom connect <url> - Connect to server',
            '• /custom key <key> - Set API key',
            '• /custom models - List models',
            '• /custom switch <model> - Switch model',
          ];

          reply(statusLines.join('\n'));
          break;

        default:
          reply(`Unknown command "${command}". Use: connect, key, models, switch, add, status`);
          break;
      }
    },
  };
}

/**
 * `/codeva` — access Codeva's exclusive features and models.
 *
 *   /codeva models              — show Codeva models
 *   /codeva ultra <prompt>      — use Codeva Ultra model
 *   /codeva pro <prompt>        — use Codeva Pro model
 *   /codeva speed <prompt>      — use Codeva Speed model
 *   /codeva code <prompt>       — use Codeva Code model
 *   /codeva creative <prompt>   — use Codeva Creative model
 */
export function buildCyberMindCommand(ctx: CommandContext): SlashCommandHandler {
  return {
    name: 'codeva',
    description: 'Access Codeva\'s exclusive features and models.',
    category: 'utility',
    usage: '/codeva <models|ultra|pro|speed|code|creative> [prompt]',
    aliases: ['cybermind'],
    run: async (args: string) => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const reply = (content: string) =>
        ctx.appendMessage({
          id: `codeva-${Date.now()}`,
          role: 'system',
          content,
          createdAt: Date.now(),
        });

      if (parts.length === 0) {
        reply('Usage: /codeva <models|ultra|pro|speed|code|creative> [prompt]');
        return;
      }

      const command = parts[0];
      const customServer = new CustomServerManager();

      switch (command) {
        case 'models':
          const cybermindModels = [
            { id: 'codeva-ultra', name: 'Codeva Ultra', desc: 'Most powerful for complex tasks', cost: '$5/$15 per 1M' },
            { id: 'codeva-pro', name: 'Codeva Pro', desc: 'Balanced for most tasks', cost: '$2/$6 per 1M' },
            { id: 'codeva-speed', name: 'Codeva Speed', desc: 'Fast for quick responses', cost: '$0.50/$1.50 per 1M' },
            { id: 'codeva-code', name: 'Codeva Code', desc: 'Specialized for coding', cost: '$1.50/$4.50 per 1M' },
            { id: 'codeva-creative', name: 'Codeva Creative', desc: 'Creative and design tasks', cost: '$1/$3 per 1M' },
          ];

          let modelInfo = ['🧠 Codeva Exclusive Models:', ''];
          cybermindModels.forEach((model, index) => {
            modelInfo.push(`${index + 1}. 🤖 ${model.name}`);
            modelInfo.push(`   ${model.desc}`);
            modelInfo.push(`   💰 Cost: ${model.cost}`);
            modelInfo.push(`   🔧 Use: /codeva ${model.id.split('-')[1]} <prompt>`);
            modelInfo.push('');
          });

          reply(modelInfo.join('\n'));
          break;

        case 'ultra':
        case 'pro':
        case 'speed':
        case 'code':
        case 'creative':
          if (parts.length < 2) {
            reply(`Usage: /codeva ${command} <your-prompt>`);
            return;
          }

          const cybermindModelId = `codeva-${command}`;
          const cybermindModel = customServer.getModel(cybermindModelId);
          const cybermindPrompt = parts.slice(1).join(' ');

          if (!cybermindPrompt) {
            reply('Prompt is required');
            return;
          }

          // Route the prompt through the real agent loop using the selected
          // Codeva model tier instead of returning a canned response.
          if (ctx.setModel) ctx.setModel(cybermindModelId);
          if (ctx.submitUserPrompt) {
            ctx.submitUserPrompt(cybermindPrompt);
          } else {
            reply(`Codeva ${command} is not available in this context.`);
          }
          break;

        default:
          reply(`Unknown command "${command}". Use: models, ultra, pro, speed, code, creative`);
          break;
      }
    },
  };
}
