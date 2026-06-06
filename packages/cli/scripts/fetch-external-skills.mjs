import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const REPOS = [
  'https://github.com/codevaaa/skills',
  'https://github.com/uditgoenka/autoresearch',
  'https://github.com/mattpocock/skills',
  'https://github.com/github/awesome-copilot',
  'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
  'https://github.com/SHADOWPR0/beautiful_prose.git',
  'https://github.com/blader/humanizer',
  'https://github.com/Ashutos1997/claude-design-auditor-skill',
  'https://github.com/aiskillstore/marketplace',
  'https://github.com/dominikmartn/nothing-design-skill',
  'https://github.com/muthuishere/hand-drawn-diagrams',
  'https://github.com/imbad0202/academic-research-skills',
  'https://github.com/Weizhena/Deep-Research-skills',
  'https://github.com/coreyhaines31/marketingskills',
  'https://github.com/wondelai/skills',
  'https://github.com/remotion-dev/skills',
  'https://github.com/codevaaa/Understand-Anything',
  'https://github.com/codevaaa/taste-skill',
  'https://github.com/codevaaa/Scrapling',
  'https://github.com/codevaaa/ECC',
  'https://github.com/codevaaa/knowledge-work-plugins',
  'https://github.com/codevaaa/codegraph',
  'https://github.com/codevaaa/pi'
];

const TARGET_DIR = resolve('../../skills-bundled');
const TEMP_DIR = resolve('./temp-skills-clone');

if (!existsSync(TARGET_DIR)) {
  mkdirSync(TARGET_DIR, { recursive: true });
}

if (existsSync(TEMP_DIR)) {
  rmSync(TEMP_DIR, { recursive: true, force: true });
}
mkdirSync(TEMP_DIR, { recursive: true });

for (const repo of REPOS) {
  const repoName = repo.split('/').pop().replace('.git', '');
  console.log(`\nFetching ${repoName}...`);
  
  try {
    // Clone depth 1
    execSync(`git clone --depth 1 ${repo} ${join(TEMP_DIR, repoName)}`, { stdio: 'ignore' });
    
    // Look for SKILL.md or prompt.txt
    const repoPath = join(TEMP_DIR, repoName);
    
    let skillContent = '';
    let skillName = repoName;
    
    if (existsSync(join(repoPath, 'SKILL.md'))) {
      skillContent = readFileSync(join(repoPath, 'SKILL.md'), 'utf-8');
    } else if (existsSync(join(repoPath, 'README.md'))) {
      // Fallback to README if no SKILL.md is found, just wrapping it
      const readme = readFileSync(join(repoPath, 'README.md'), 'utf-8');
      skillContent = `---
name: ${repoName}
description: Fetched from ${repo}
---
${readme}
`;
    } else {
      console.log(`No SKILL.md or README found in ${repoName}, skipping.`);
      continue;
    }
    
    // Create folder in bundled
    const destFolder = join(TARGET_DIR, skillName);
    if (!existsSync(destFolder)) {
      mkdirSync(destFolder, { recursive: true });
    }
    
    writeFileSync(join(destFolder, 'SKILL.md'), skillContent);
    console.log(`✅ Installed skill: ${skillName}`);
    
  } catch (err) {
    console.log(`❌ Failed to fetch ${repoName}`);
  }
}

// Cleanup
rmSync(TEMP_DIR, { recursive: true, force: true });
console.log('\nAll done! Bundled new skills.');
