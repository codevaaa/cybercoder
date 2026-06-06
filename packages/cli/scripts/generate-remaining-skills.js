const fs = require('fs');
const path = require('path');

const skills = [
  { name: 'nothing-design-skill', desc: 'Implements the Nothing Phone UI aesthetic with dot matrix typography, pure black/white contrasts, and minimalist geometric shapes.' },
  { name: 'taste-skill', desc: 'Enforces a premium, world-class design taste across all UI components, removing clutter and emphasizing typography.' },
  { name: 'academic-research-skills', desc: 'Queries academic databases, fetches LaTeX papers, and summarizes complex scientific research using robust citations.' },
  { name: 'Deep-Research-skills', desc: 'Performs multi-step deep web research. Synthesizes dozens of sources into a comprehensive markdown report.' },
  { name: 'Understand-Anything', desc: 'Breaks down complex codebases, algorithms, or concepts into easily digestible analogies and diagrams.' },
  { name: 'humanizer', desc: 'Rewrites robotic AI-generated text into natural, empathetic, and human-like prose.' },
  { name: 'marketingskills', desc: 'Writes high-converting copy, SEO-optimized content, and engaging social media threads.' },
  { name: 'hand-drawn-diagrams', desc: 'Generates Mermaid.js diagrams styled to look like Excalidraw hand-drawn sketches.' },
  { name: 'remotion-dev-skills', desc: 'Writes programmatic video animations and sequences using React and Remotion.' },
  { name: 'codegraph', desc: 'Builds a knowledge graph of the entire project to understand complex cross-file dependencies.' },
  { name: 'ECC', desc: 'Enterprise Code Context builder. Aggregates context across massive monorepos for large-scale refactors.' },
  { name: 'Scrapling', desc: 'Advanced web scraping engine. Navigates complex DOMs, bypasses captchas conceptually, and extracts structured data.' },
  { name: 'codevaaa-skills', desc: 'General collection of Codeva baseline skills for routing and foundational tasks.' },
  { name: 'awesome-copilot', desc: 'Integrates best practices from the Awesome Copilot repository for AI pair programming.' },
  { name: 'aiskillstore-marketplace', desc: 'Connects to the global AI Skill Store marketplace to fetch dynamic capabilities.' },
  { name: 'wondelai-skills', desc: 'A curated collection of creative writing and prompt engineering techniques.' },
  { name: 'knowledge-work-plugins', desc: 'Automates routine knowledge work: email drafting, meeting summaries, and ticket creation.' },
  { name: 'pi', desc: 'A deeply empathetic and conversational AI personality overlay.' }
];

const targetDir = path.resolve(__dirname, '../../skills-bundled');

for (const skill of skills) {
  const skillDir = path.join(targetDir, skill.name);
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }
  
  const content = `---
name: ${skill.name}
description: ${skill.desc}
---
You are the ${skill.name} agent. Your purpose is: ${skill.desc}
Always execute your tasks using the highest quality standards.
`;
  
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content);
  console.log('Generated:', skill.name);
}
