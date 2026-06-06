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

const MODEL_COLORS = { 
  auto: '#E55B3C', 
  'apifreellm/gpt-4o': '#10b981', 
  'apifreellm/claude-3.5-sonnet': '#d4714f', 
  'apifreellm/llama-3-70b': '#f97316', 
  'opencode/deepseek-v4-pro': '#3b82f6', 
  'groq/llama-3.3-70b': '#f59e0b', 
  'groq/deepseek-r1-distill-70b': '#8b5cf6', 
  'groq/qwen-2.5-coder-32b': '#06b6d4' 
};
const MODEL_LABELS = { 
  auto: 'Codeva Auto', 
  'apifreellm/gpt-4o': 'GPT-4o (Premium)', 
  'apifreellm/claude-3.5-sonnet': 'Claude 3.5 Sonnet', 
  'apifreellm/llama-3-70b': 'Llama 3 70B', 
  'opencode/deepseek-v4-pro': 'DeepSeek V4 Pro', 
  'groq/llama-3.3-70b': 'Llama 3.3 70B (Fast)', 
  'groq/deepseek-r1-distill-70b': 'DeepSeek R1 (Groq)', 
  'groq/qwen-2.5-coder-32b': 'Qwen 2.5 Coder' 
};

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

async function loadSettings() {
  try {
    const auth = await chrome.runtime.sendMessage({ type: 'get-auth' }).catch(() => null);
    if (auth?.token) {
      codevaKeyInput.value = auth.token.slice(0, 15) + '...';
      authStatusText.textContent = 'Auth: Connected (' + (auth.email || 'Cloud') + ')';
      authStatusText.style.color = 'var(--success)';
    } else {
      authStatusText.textContent = 'Auth: No token. Log in via Website.';
      authStatusText.style.color = 'var(--muted)';
    }
  } catch { authStatusText.textContent = 'Auth: Error checking status'; authStatusText.style.color = 'var(--error)'; }
}

saveCodevaKey.onclick = async () => {
  const val = codevaKeyInput.value.trim();
  if (val && !val.includes('...')) {
    await chrome.runtime.sendMessage({ type: 'set-auth', auth: { token: val, apiKey: val, email: 'manual@codeva', plan: 'pro' } }).catch(() => null);
    authStatusText.textContent = 'Auth: Connected (Manual Key)';
    authStatusText.style.color = 'var(--success)';
    codevaKeyInput.value = val.slice(0, 15) + '...';
  }
};

// Connection test
document.getElementById('testConnBtn').onclick = async () => {
  const dot = document.getElementById('connDot');
  const txt = document.getElementById('connText');
  dot.style.background = '#f59e0b'; txt.textContent = 'Testing...'; txt.style.color = '#f59e0b';
  try {
    const backend = 'https://cybercli-api.onrender.com/api/v1'; // Hardcoded default
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
    const backend = 'https://cybercli-api.onrender.com/api/v1'; // Hardcoded default
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
  
  // ── Theme Toggle ──
  const themeToggle = document.getElementById('themeToggle');
  chrome.storage.local.get('cyberTheme', (data) => {
    const theme = data.cyberTheme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  });
  themeToggle.onclick = () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
    chrome.storage.local.set({ cyberTheme: next });
  };

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

function renderMD(text) {
  let processed = text;
  
  // Fix reasoning model <think> tags which break markdown rendering
  const openThinkCount = (processed.match(/<think>/g) || []).length;
  const closeThinkCount = (processed.match(/<\/think>/g) || []).length;
  
  processed = processed.replace(/<think>/g, '<div class="think-block" style="border-left: 3px solid var(--accent); padding-left: 10px; margin-bottom: 10px; color: var(--muted); font-size: 0.9em; font-style: italic;"><strong>🧠 Thinking Process:</strong><br>');
  processed = processed.replace(/<\/think>/g, '</div>');
  
  if (openThinkCount > closeThinkCount) {
    processed += '</div>';
  }

  if (typeof marked !== 'undefined') {
    return marked.parse(processed);
  }
  // Fallback if marked fails to load
  var BT = String.fromCharCode(96);
  var RE1 = new RegExp('(' + BT+BT+BT + '[\\w-]*\\n[\\s\\S]*?' + BT+BT+BT + ')', 'g');
  var RE2 = new RegExp('^' + BT+BT+BT + '([\\w-]*)\\n([\\s\\S]*?)' + BT+BT+BT + '$');
  return processed.split(RE1).map(p => {
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
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'get-elements' }).catch(err => {
      chrome.runtime.lastError; // Clear the error
      return null;
    });
    return res?.elements || [];
  } catch { return []; }
}

async function executeAutomation(action) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) return { ok: false, error: 'No active tab' };
    const res = await chrome.tabs.sendMessage(tab.id, action).catch(err => {
      chrome.runtime.lastError;
      return null;
    });
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
      ? 'You are CyberCoder, an advanced AI automation agent. You control the browser by outputting JSON commands in a special format. When interacting with the page (click, type, navigate, scroll), respond with the action AND a concise, highly aesthetic explanation. Use rich Markdown (bolding, lists, code blocks). Format automation commands exactly as: [ACTION:{"type":"click","selector":".btn"}] or [ACTION:{"type":"type-text","selector":"#input","text":"hello"}] or [ACTION:{"type":"navigate","url":"https://..."}] or [ACTION:{"type":"scroll-to","selector":"#section"}]. You can chain multiple actions. Always explain your intent clearly. Available action types: click (selector or text), type-text (selector + text), navigate (url), scroll-to (selector or y), get-elements. Use provided page context to guide actions.'
      : 'You are CyberCoder, a premium AI assistant running inside a Chrome extension. The user is viewing a web page and may ask about its content or request coding help. You MUST use beautiful, rich Markdown formatting. Use strategic bolding, bulleted lists, and clear headers to make your text incredibly readable and aesthetic. If providing code, use fenced code blocks. Be concise, brilliant, and maintain a highly professional, modern tone. Your output should wow the user with its structure and clarity.';

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
          assistantEl.querySelector('.bubble').innerHTML = '<span style="color:var(--error);">⚠ ' + esc(msg.message) + '</span><br><span style="color:var(--muted);font-size:11px;">The Codeva backend may be temporarily unavailable. Please try again in a moment or switch to a different model.</span>';
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