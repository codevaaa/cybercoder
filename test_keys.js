

const keys = {
  APIFREELLM: { url: 'https://apifreellm.com/api/v1/models', key: process.env.APIFREELLM_KEY || '' },
  OPENCODE: { url: 'https://opencode.ai/zen/v1/models', key: process.env.OPENCODE_KEY || '' },
  LLM7: { url: 'https://api.llm7.io/v1/models', key: process.env.LLM7_KEY || '' },
  LLM7_ALT: { url: 'https://token.llm7.io/v1/models', key: process.env.LLM7_ALT_KEY || '' },
  CLOUDFLARE: { url: 'https://api.cloudflare.com/client/v4/ai/models', key: process.env.CLOUDFLARE_KEY || '' },
  CEREBRAS: { url: 'https://api.cerebras.ai/v1/models', key: process.env.CEREBRAS_KEY || '' },
  GROQ: { url: 'https://api.groq.com/openai/v1/models', key: process.env.GROQ_KEY || '' },
  MISTRAL: { url: 'https://api.mistral.ai/v1/models', key: process.env.MISTRAL_KEY || '' },
  OPENROUTER: { url: 'https://openrouter.ai/api/v1/models', key: process.env.OPENROUTER_KEY || '' },
};

async function testProvider(name, { url, key }) {
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!response.ok) {
      console.log(`[${name}] Failed: HTTP ${response.status} ${response.statusText}`);
      return;
    }
    const data = await response.json();
    let models = [];
    if (data.data && Array.isArray(data.data)) {
      models = data.data.map(m => m.id);
    } else {
      models = ['Format unknown or empty'];
    }
    console.log(`[${name}] OK! Found ${models.length} models.`);
    console.log(`[${name}] Sample models:`, models.slice(0, 15).join(', '));
  } catch (error) {
    console.log(`[${name}] Error:`, error.message);
  }
}

async function testGemini() {
  const key = process.env.GEMINI_KEY || '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`[GEMINI] Failed: HTTP ${response.status} ${response.statusText}`);
      return;
    }
    const data = await response.json();
    let models = [];
    if (data.models && Array.isArray(data.models)) {
      models = data.models.map(m => m.name);
    }
    console.log(`[GEMINI] OK! Found ${models.length} models.`);
    console.log(`[GEMINI] Sample models:`, models.slice(0, 10).join(', '));
  } catch (e) {
    console.log(`[GEMINI] Error:`, e.message);
  }
}

async function main() {
  for (const [name, config] of Object.entries(keys)) {
    await testProvider(name, config);
  }
  await testGemini();
}

main();
