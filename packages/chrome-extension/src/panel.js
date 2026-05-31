// ═══════════════════════════════════════════
// Navigation Tab Switcher
// ═══════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.getElementById(tabId + 'View').classList.add('active');
    if (tabId === 'automations') loadJobs();
  });
});

// ═══════════════════════════════════════════
// Model Selector
// ═══════════════════════════════════════════
let selectedModel = 'auto';
const modelBtn = document.getElementById('modelBtn');
const modelDropdown = document.getElementById('modelDropdown');
const modelLabel = document.getElementById('modelLabel');
const modelDot = document.getElementById('modelDot');

const MODEL_COLORS = { auto: '#C96442', groq: '#f97316', gemini: '#3b82f6', openai: '#10b981', anthropic: '#d4714f', openrouter: '#a78bfa' };
const MODEL_LABELS = { auto: 'Codeva Auto', groq: 'Arjun · Groq', gemini: 'Chanakya · Gemini', openai: 'OpenAI · GPT-4o', anthropic: 'Anthropic · Claude', openrouter: 'OpenRouter' };

modelBtn.onclick = (e) => { e.stopPropagation(); modelDropdown.classList.toggle('open'); };
document.addEventListener('click', () => modelDropdown.classList.remove('open'));

document.querySelectorAll('.model-option').forEach(opt => {
  opt.addEventListener('click', () => {
    selectedModel = opt.dataset.model;
    modelLabel.textContent = MODEL_LABELS[selectedModel] || selectedModel;
    modelDot.style.background = MODEL_COLORS[selectedModel] || 'var(--accent)';
    document.querySelectorAll('.model-option').forEach(o => { o.classList.remove('selected'); o.querySelector('.mo-check').style.display = 'none'; });
    opt.classList.add('selected');
    opt.querySelector('.mo-check').style.display = '';
    modelDropdown.classList.remove('open');
    chrome.storage.local.set({ selectedModel });
  });
});

// Load saved model
chrome.storage.local.get('selectedModel', (d) => {
  if (d.selectedModel && MODEL_LABELS[d.selectedModel]) {
    selectedModel = d.selectedModel;
    modelLabel.textContent = MODEL_LABELS[selectedModel];
    modelDot.style.background = MODEL_COLORS[selectedModel] || 'var(--accent)';
    document.querySelectorAll('.model-option').forEach(o => {
      const isSel = o.dataset.model === selectedModel;
      o.classList.toggle('selected', isSel);
      o.querySelector('.mo-check').style.display = isSel ? '' : 'none';
    });
  }
});

// ═══════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════
const codevaKeyInput = document.getElementById('codevaKeyInput');
const saveCodevaKey = document.getElementById('saveCodevaKey');
const authStatusText = document.getElementById('authStatusText');
const backendUrlSelect = document.getElementById('backendUrlSelect');
const customBackendGroup = document.getElementById('customBackendGroup');
const customBackendInput = document.getElementById('customBackendInput');
const saveCustomBackend = document.getElementById('saveCustomBackend');

async function loadSettings() {
  try {
    const auth = await chrome.runtime.sendMessage({ type: 'get-auth' });
    if (auth?.token) {
      codevaKeyInput.value = auth.token.slice(0, 15) + '...';
      authStatusText.textContent = 'Auth: Connected (' + (auth.email || 'Cloud') + ')';
      authStatusText.style.color = 'var(--success)';
    } else {
      authStatusText.textContent = 'Auth: No token. Use BYOK keys or paste token.';
      authStatusText.style.color = 'var(--muted)';
    }
  } catch { authStatusText.textContent = 'Auth: Error checking status'; authStatusText.style.color = 'var(--error)'; }

  try {
    const providers = await chrome.runtime.sendMessage({ type: 'get-providers' }) || {};
    if (providers.groq) document.getElementById('groqKey').value = providers.groq;
    if (providers.gemini) document.getElementById('geminiKey').value = providers.gemini;
    if (providers.openai) document.getElementById('openaiKey').value = providers.openai;
    if (providers.anthropic) document.getElementById('anthropicKey').value = providers.anthropic;
    if (providers.openrouter) document.getElementById('openrouterKey').value = providers.openrouter;
  } catch {}

  try {
    const currentBackend = await chrome.runtime.sendMessage({ type: 'get-backend' });
    if (currentBackend === 'https://cybercli-api.onrender.com/api/v1') {
      backendUrlSelect.value = 'https://cybercli-api.onrender.com/api/v1';
    } else if (currentBackend === 'http://localhost:3000/api/v1') {
      backendUrlSelect.value = 'http://localhost:3000/api/v1';
    } else {
      backendUrlSelect.value = 'custom';
      customBackendInput.value = currentBackend;
      customBackendGroup.classList.remove('hidden');
    }
  } catch {}
}

saveCodevaKey.onclick = async () => {
  const val = codevaKeyInput.value.trim();
  if (val && !val.includes('...')) {
    await chrome.runtime.sendMessage({ type: 'set-auth', auth: { token: val, apiKey: val, email: 'manual@codeva', plan: 'pro' } });
    authStatusText.textContent = 'Auth: Connected (Manual Key)';
    authStatusText.style.color = 'var(--success)';
    codevaKeyInput.value = val.slice(0, 15) + '...';
  }
};

backendUrlSelect.onchange = async () => {
  const val = backendUrlSelect.value;
  if (val === 'custom') { customBackendGroup.classList.remove('hidden'); }
  else { customBackendGroup.classList.add('hidden'); await chrome.runtime.sendMessage({ type: 'set-backend', url: val }); }
};

saveCustomBackend.onclick = async () => {
  const val = customBackendInput.value.trim();
  if (val) { await chrome.runtime.sendMessage({ type: 'set-backend', url: val }); }
};

// Save All BYOK Keys
document.getElementById('saveAllKeys').onclick = async () => {
  const inputs = document.querySelectorAll('.byok-input');
  for (const inp of inputs) {
    const provider = inp.dataset.provider;
    const key = inp.value.trim();
    await chrome.runtime.sendMessage({ type: 'set-provider', provider, key });
  }
  const toast = document.getElementById('keysSaveToast');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
};

// Also save on individual change
document.querySelectorAll('.byok-input').forEach(inp => {
  inp.addEventListener('change', async () => {
    await chrome.runtime.sendMessage({ type: 'set-provider', provider: inp.dataset.provider, key: inp.value.trim() });
  });
});

// Connection test
document.getElementById('testConnBtn').onclick = async () => {
  const dot = document.getElementById('connDot');
  const txt = document.getElementById('connText');
  dot.style.background = '#f59e0b'; txt.textContent = 'Testing...'; txt.style.color = '#f59e0b';
  try {
    const backend = await chrome.runtime.sendMessage({ type: 'get-backend' });
    const res = await fetch(backend.replace('/api/v1','') + '/health', { signal: AbortSignal.timeout(8000) });
    if (res.ok) { dot.style.background = 'var(--success)'; txt.textContent = 'Connected to backend ✓'; txt.style.color = 'var(--success)'; }
    else { dot.style.background = 'var(--error)'; txt.textContent = 'Backend returned ' + res.status; txt.style.color = 'var(--error)'; }
  } catch (e) {
    dot.style.background = 'var(--error)'; txt.textContent = 'Cannot reach backend: ' + (e.message || 'timeout'); txt.style.color = 'var(--error)';
  }
};

// Update check
document.getElementById('checkUpdateBtn').onclick = async () => {
  const statusMsg = document.getElementById('updateStatusMsg');
  statusMsg.classList.remove('hidden');
  statusMsg.textContent = 'Checking...'; statusMsg.style.color = 'var(--muted)';
  try {
    const backend = await chrome.runtime.sendMessage({ type: 'get-backend' });
    const res = await fetch(backend + '/downloads/extension/version');
    if (!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (data.version && data.version !== '0.2.1') {
      statusMsg.innerHTML = '⚡ Update: <strong>v' + data.version + '</strong>. <a href="' + data.downloadUrl + '" target="_blank" style="color:var(--accent);text-decoration:underline;">Download</a>';
      statusMsg.style.color = '#F59E0B';
    } else { statusMsg.textContent = '✓ Up to date!'; statusMsg.style.color = 'var(--success)'; }
  } catch { statusMsg.textContent = 'Update server unreachable.'; statusMsg.style.color = 'var(--error)'; }
};

document.getElementById('reloadExtBtn').onclick = () => chrome.runtime.reload();

// ═══════════════════════════════════════════
// On Load
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  // Check if popup requested Settings tab
  chrome.storage.local.get('openSettingsTab', (data) => {
    if (data && data.openSettingsTab) {
      chrome.storage.local.remove('openSettingsTab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.querySelector('[data-tab="settings"]').classList.add('active');
      document.getElementById('settingsView').classList.add('active');
    }
  });
  // Check for pending task from popup
  chrome.storage.local.get('pendingTask', (data) => {
    if (data && data.pendingTask) {
      const prompt = data.pendingTask;
      chrome.storage.local.remove('pendingTask');
      setTimeout(() => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelector('[data-tab="chat"]').classList.add('active');
        document.getElementById('chatView').classList.add('active');
        send(prompt);
      }, 300);
    }
  });
});

// ═══════════════════════════════════════════
// Chat & Automation Engine
// ═══════════════════════════════════════════
const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const autoBtn = document.getElementById('autoBtn');
const empty = document.getElementById('empty');
const errbar = document.getElementById('errbar');
let streaming = false, assistantEl = null, port = null;
let history = [];
let autoMode = false;

function esc(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function addMsg(role, text) {
  empty.style.display = 'none';
  const el = document.createElement('div');
  el.className = 'msg ' + role;
  el.innerHTML = '<div class="role">' + (role === 'user' ? 'You' : (MODEL_LABELS[selectedModel] || 'CyberCoder')) + '</div><div class="bubble">' + (role === 'user' ? esc(text) : '') + '</div>';
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

function addToolStep(summary) {
  const el = document.createElement('div');
  el.className = 'tool-step running';
  el.innerHTML = '<span class="icon spin">⟳</span><span class="name">' + esc(summary) + '</span><span class="time"></span>';
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el;
}

function renderMD(t) {
  var BT = String.fromCharCode(96);
  var RE1 = new RegExp('(' + BT+BT+BT + '[\\w-]*\\n[\\s\\S]*?' + BT+BT+BT + ')', 'g');
  var RE2 = new RegExp('^' + BT+BT+BT + '([\\w-]*)\\n([\\s\\S]*?)' + BT+BT+BT + '$');
  return t.split(RE1).map(p => {
    const m = p.match(RE2);
    if (m) return '<pre><code>' + esc(m[2]) + '</code></pre>';
    let h = esc(p);
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\n/g, '<br>');
    return '<span>' + h + '</span>';
  }).join('');
}

async function getPageContext() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'get-page-content' });
    return res?.text ? '[Page: ' + (res.title || 'untitled') + ']\n' + res.text.slice(0, 8000) : '';
  } catch { return ''; }
}

async function getPageElements() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return [];
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'get-elements' });
    return res?.elements || [];
  } catch { return []; }
}

async function executeAutomation(action) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return { ok: false, error: 'No active tab' };
    const res = await chrome.tabs.sendMessage(tab.id, action);
    return res || { ok: false, error: 'No response' };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ── Agentic self-correcting automation loop ──
async function send(textOverride) {
  const text = (textOverride || input.value).trim();
  if (!text || streaming) return;
  input.value = '';
  input.style.height = 'auto';

  addMsg('user', text);
  streaming = true;
  sendBtn.disabled = true;
  stopBtn.style.display = 'flex';

  let currentPrompt = text;
  let loopCount = 0;
  const maxLoops = 5;
  let stopRequest = false;

  stopBtn.onclick = () => {
    stopRequest = true;
    if (port) port.disconnect();
    finish('');
  };

  while (loopCount < maxLoops && !stopRequest) {
    const pageCtx = await getPageContext();
    let elementsCtx = '';
    
    if (autoMode) {
      const elements = await getPageElements();
      if (elements.length) {
        elementsCtx = '\n\n[Interactive elements on page:]\n' + elements.slice(0, 30).map((e, i) =>
          i + '. <' + e.tag + '> ' + (e.text || e.href || e.type || '').slice(0, 60) + ' [selector: ' + e.selector + ']'
        ).join('\n');
      }
    }

    const userContent = pageCtx ? currentPrompt + '\n\n---\n' + pageCtx + elementsCtx : currentPrompt + elementsCtx;
    history.push({ role: 'user', content: userContent });

    assistantEl = addMsg('assistant', '');
    assistantEl.querySelector('.bubble').innerHTML = '<div class="thinking"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
    
    let full = '';
    let hasContent = false;
    let resolvePromise;
    const messageComplete = new Promise(resolve => { resolvePromise = resolve; });

    const system = autoMode
      ? 'You are CyberCoder, an AI assistant with browser automation capabilities. You can control the browser by outputting JSON commands in a special format. When the user asks you to interact with the page (click, type, navigate, scroll), respond with the action AND a brief explanation. Format automation commands as: [ACTION:{"type":"click","selector":".btn"}] or [ACTION:{"type":"type-text","selector":"#input","text":"hello"}] or [ACTION:{"type":"navigate","url":"https://..."}] or [ACTION:{"type":"scroll-to","selector":"#section"}]. You can chain multiple actions. Always explain what you are doing. Available action types: click (selector or text), type-text (selector + text), navigate (url), scroll-to (selector or y), get-elements. The page elements are listed in the context.'
      : 'You are CyberCoder, an AI assistant in a Chrome browser extension. The user is viewing a web page and may ask about its content. Be concise, helpful, and use markdown for structure. If page content is provided, use it to answer accurately.';

    port = chrome.runtime.connect({ name: 'stream' });
    
    port.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError?.message || '';
      if (err && !stopRequest) {
        errbar.textContent = 'Connection lost: ' + err;
        errbar.classList.remove('hidden');
        setTimeout(() => errbar.classList.add('hidden'), 5000);
      }
      resolvePromise(full || '');
    });

    port.onMessage.addListener(async (msg) => {
      if (msg.type === 'chunk') {
        if (!hasContent) { hasContent = true; assistantEl.querySelector('.bubble').innerHTML = ''; }
        full += msg.text;
        assistantEl.querySelector('.bubble').innerHTML = renderMD(full);
        assistantEl.querySelector('.bubble').classList.add('typing-cursor');
        messages.scrollTop = messages.scrollHeight;
      } else if (msg.type === 'done') {
        resolvePromise(full);
      } else if (msg.type === 'error') {
        if (!hasContent) {
          assistantEl.querySelector('.bubble').innerHTML = '<span style="color:var(--error);">⚠ ' + esc(msg.message) + '</span><br><span style="color:var(--muted);font-size:11px;">Go to Settings tab → add a provider API key (Groq, Gemini, etc.) or check your backend connection.</span>';
        } else {
          errbar.textContent = msg.message;
          errbar.classList.remove('hidden');
          setTimeout(() => errbar.classList.add('hidden'), 5000);
        }
        resolvePromise(full || '');
      }
    });

    port.postMessage({ type: 'start', messages: history, system, model: selectedModel });

    const resultText = await messageComplete;
    if (assistantEl) assistantEl.querySelector('.bubble').classList.remove('typing-cursor');
    if (resultText) history.push({ role: 'assistant', content: resultText });

    if (!autoMode || stopRequest) break;

    // Process actions
    const actionRegex = /\[ACTION:(\{[^}]+\})\]/g;
    let match;
    const actionResults = [];
    
    while ((match = actionRegex.exec(resultText)) !== null) {
      try {
        const action = JSON.parse(match[1]);
        const step = addToolStep((action.type || 'action') + ': ' + (action.selector || action.url || action.text || '').slice(0, 40));
        const res = await executeAutomation(action);
        step.classList.remove('running');
        if (res.ok !== false) {
          step.classList.add('ok');
          step.querySelector('.icon').textContent = '✓';
          step.querySelector('.icon').classList.remove('spin');
          step.querySelector('.icon').style.color = 'var(--success)';
          actionResults.push(action.type + ' succeeded.');
        } else {
          step.classList.add('fail');
          step.querySelector('.icon').textContent = '✕';
          step.querySelector('.icon').classList.remove('spin');
          step.querySelector('.icon').style.color = 'var(--error)';
          step.querySelector('.time').textContent = res.error || 'failed';
          actionResults.push(action.type + ' failed: ' + (res.error || 'element not found') + '.');
        }
      } catch (e) {
        actionResults.push('Invalid action parse error: ' + e.message);
      }
    }

    if (actionResults.length > 0) {
      currentPrompt = '[Automation Feedback Results]\n' + actionResults.join('\n') + '\n\nBased on these results, please proceed with the next actions or give the final output.';
      loopCount++;
      addToolStep('Action results fed back to AI. Running step ' + (loopCount + 1) + '...');
    } else {
      break;
    }
  }

  finish('');
}

function finish() {
  streaming = false;
  sendBtn.disabled = false;
  stopBtn.style.display = 'none';
  if (assistantEl) assistantEl.querySelector('.bubble').classList.remove('typing-cursor');
  port = null;
}

// ── Event Bindings ──
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px'; });
sendBtn.onclick = () => send();
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

// New Chat (clearBtn) — THE FIX for the fatal crash
document.getElementById('clearBtn').onclick = () => {
  history = [];
  messages.querySelectorAll('.msg,.tool-step').forEach(n => n.remove());
  empty.style.display = 'flex';
};

// Chips
document.querySelectorAll('.chip').forEach(c => c.onclick = () => {
  const p = c.dataset.p;
  const pLower = p.toLowerCase();
  if (pLower.includes('fill') || pLower.includes('click') || pLower.includes('describe') || pLower.includes('viewport') || pLower.includes('screenshot')) {
    if (!autoMode) {
      autoMode = true;
      autoBtn.classList.add('active');
      document.getElementById('autoBadge').style.display = 'inline-flex';
      input.placeholder = 'Tell AI what to do on this page…';
    }
  }
  send(p);
});

// Toggle automation mode
autoBtn.onclick = () => {
  autoMode = !autoMode;
  autoBtn.classList.toggle('active', autoMode);
  document.getElementById('autoBadge').style.display = autoMode ? 'inline-flex' : 'none';
  input.placeholder = autoMode ? 'Tell AI what to do on this page…' : 'Ask about this page…';
};

// ═══════════════════════════════════════════
// Automations Tab
// ═══════════════════════════════════════════
async function loadJobs() {
  const jobsList = document.getElementById('jobsList');
  const emptyJobs = document.getElementById('emptyJobs');
  try {
    const res = await chrome.runtime.sendMessage({ type: 'cowork-list' });
    const tasks = res?.tasks || [];
    jobsList.querySelectorAll('.job-card').forEach(c => c.remove());
    if (tasks.length > 0) {
      emptyJobs.classList.add('hidden');
      tasks.forEach(t => {
        const div = document.createElement('div');
        div.className = 'job-card';
        div.innerHTML = '<div class="job-header"><span class="job-title" title="' + esc(t.prompt) + '">' + esc(t.prompt) + '</span><span class="job-status status-' + t.status + '">' + t.status + '</span></div>' + (t.result ? '<div class="job-result">' + esc(t.result) + '</div>' : '');
        jobsList.appendChild(div);
      });
    } else {
      emptyJobs.classList.remove('hidden');
    }
  } catch (e) { console.error('Failed to load jobs:', e); }
}

document.getElementById('clearJobsBtn').onclick = async () => {
  await chrome.runtime.sendMessage({ type: 'cowork-clear' });
  loadJobs();
};

// Add new background task from Automations tab
document.getElementById('addTaskBtn').onclick = async () => {
  const inp = document.getElementById('newTaskInput');
  const prompt = inp.value.trim();
  if (!prompt) return;
  inp.value = '';
  await chrome.runtime.sendMessage({ type: 'cowork-add', prompt });
  loadJobs();
};
document.getElementById('newTaskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('addTaskBtn').click(); }
});

// Listen for task completion updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'cowork-done') loadJobs();
});

// ═══════════════════════════════════════════
// Listen for tasks from popup/background
// ═══════════════════════════════════════════
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'run-task' && msg.prompt) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelector('[data-tab="chat"]').classList.add('active');
    document.getElementById('chatView').classList.add('active');
    send(msg.prompt);
  }
});