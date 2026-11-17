import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

/** The project configuration path used for new MCP server definitions. */
export function projectMcpConfigPath(cwd = process.cwd()): string {
  return join(cwd, '.cyber', 'mcp.json');
}

/**
 * Read the current project/global paths first, then the pre-.cyber paths for
 * existing installations. New configuration is always written to .cyber.
 */
export function readMcpConfig(cwd = process.cwd(), home = homedir()): McpConfig {
  const paths = [
    projectMcpConfigPath(cwd),
    join(home, '.cyber', 'mcp.json'),
    join(cwd, '.codeva', 'mcp.json'),
    join(home, '.codeva', 'mcp.json'),
  ];

  for (const path of paths) {
    try {
      if (!existsSync(path)) continue;
      const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const servers = (value as McpConfig).mcpServers;
      if (!servers || typeof servers !== 'object' || Array.isArray(servers)) continue;
      return { mcpServers: servers };
    } catch {
      // Ignore malformed files and continue to the next supported location.
    }
  }

  return { mcpServers: {} };
}

/** Persist changes at the canonical project-scoped location. */
export function writeProjectMcpConfig(config: McpConfig, cwd = process.cwd()): string {
  const path = projectMcpConfigPath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
  return path;
}
