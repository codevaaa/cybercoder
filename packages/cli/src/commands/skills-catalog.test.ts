import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadAllSkills, routeTaskToSkill, SkillRegistry } from '@cybermind/skills';
import { builtinTools } from '@cybermind/tools';

const here = dirname(fileURLToPath(import.meta.url));
const sourceSkillsDir = resolve(here, '../../../../skills-bundled');
const packagedSkillsDir = resolve(here, '../../skills-bundled');

function loadBundled(dir: string) {
  return loadAllSkills({ bundledDir: dir, skip: ['project', 'user'] });
}

test('every bundled skill only declares tools the CyberCoder runtime actually registers', () => {
  const tools = new Set(builtinTools().map((tool) => tool.schema.name));
  const invalid = loadBundled(sourceSkillsDir).flatMap((skill) =>
    skill.frontmatter.requires.tools
      .filter((name) => !tools.has(name))
      .map((name) => `${skill.frontmatter.name}: ${name}`),
  );

  assert.deepEqual(invalid, []);
});

test('published CLI skill catalog includes the same skills and tool allowlists as the source catalog', () => {
  const source = loadBundled(sourceSkillsDir)
    .map((skill) => [skill.frontmatter.name, [...skill.frontmatter.requires.tools].sort()] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  const packaged = loadBundled(packagedSkillsDir)
    .map((skill) => [skill.frontmatter.name, [...skill.frontmatter.requires.tools].sort()] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  assert.deepEqual(packaged, source);
});

test('task router selects real specialists from both source and packaged catalogs', () => {
  const expectedRoutes: Array<[string, string]> = [
    ['Build a responsive React settings panel', 'frontend-design'],
    ['Review this code for a security vulnerability', 'security-audit'],
    ['Debug the failing TypeScript test crash', 'debugger'],
    ['Plan a PostgreSQL database schema migration', 'db-architect'],
    ['Design a REST API endpoint', 'api-designer'],
    ['Write documentation for the deployment guide', 'doc-writer'],
  ];

  for (const bundledDir of [sourceSkillsDir, packagedSkillsDir]) {
    const registry = new SkillRegistry({ bundledDir, skip: ['project', 'user'] });
    const available = new Set(registry.list().map((skill) => skill.frontmatter.name));
    for (const [prompt, expected] of expectedRoutes) {
      assert.ok(available.has(expected), `expected specialist ${expected} in ${bundledDir}`);
      assert.equal(routeTaskToSkill(prompt, registry), expected, `${prompt} (${bundledDir})`);
    }
  }
});
