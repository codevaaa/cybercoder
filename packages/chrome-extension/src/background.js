/**
 * CyberCoder Chrome Extension — Background Service Worker
 *
 * Handles: auth state, API calls to providers (BYOK direct or Codeva cloud),
 * context menu actions, keyboard shortcuts, and message routing between
 * popup/panel/content scripts.
 */

const API_BASE = 'https://cybercli-api.onrender.com/api/v1'

// ── Storage helpers ──
async function getAuth() {
  const { cyberAuth } = await chrome.storage.local.get('cyberAuth')
  return cyberAuth || null
}
async function setAuth(auth) {
  await chrome.storage.local.set({ cyberAuth: auth })
}
async function clearAuth() {
  await chrome.storage.local.remove('cyberAuth')
}
async function getProviderKeys() {
  const { cyberProviders } = await chrome.storage.local.get('cyberProviders')
  return cyberProviders || {}
}
async function setProviderKey(provider, key) {
  const keys = await getProviderKeys()
  keys[provider] = key
  await chrome.storage.local.set({ cyberProviders: keys })
}

// ── Provider streaming (BYOK — direct to provider, no backend needed) ──
async function* streamGroq(messages, system, key, signal) {
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, temperature: 0.5, stream: true }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const l of lines) {
      if (!l.startsWith('data:')) continue
      const d = l.slice(5).trim()
      if (d === '[DONE]') return
      try { const j = JSON.parse(d); const t = j.choices?.[0]?.delta?.content; if (t) yield t } catch {}
    }
  }
}

async function* streamGemini(messages, system, key, signal) {
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), generationConfig: { temperature: 0.5 } }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const l of lines) {
      if (!l.startsWith('data:')) continue
      try { const j = JSON.parse(l.slice(5).trim()); const t = j.candidates?.[0]?.content?.parts?.[0]?.text; if (t) yield t } catch {}
    }
  }
}

async function getApiBase() {
  const { customApiBase } = await chrome.storage.local.get('customApiBase')
  return customApiBase || 'https://cybercli-api.onrender.com/api/v1'
}

async function* streamCodeva(messages, system, apiKey, signal) {
  const apiBase = await getApiBase()
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const body = { messages: system ? [{ role: 'system', content: system }, ...messages] : messages, model: 'auto', stream: true }
  const res = await fetch(`${apiBase}/completions`, { method: 'POST', headers, body: JSON.stringify(body), signal })
  if (!res.ok) throw new Error(`Codeva ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const l of lines) {
      if (!l.startsWith('data:')) continue
      const d = l.slice(5).trim()
      if (d === '[DONE]') return
      try { const j = JSON.parse(d); if (j.type === 'token' && j.content) yield j.content } catch {}
    }
  }
}

async function* streamOpenAI(messages, system, key, signal) {
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages: msgs, temperature: 0.5, stream: true }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const l of lines) {
      if (!l.startsWith('data:')) continue
      const d = l.slice(5).trim()
      if (d === '[DONE]') return
      try { const j = JSON.parse(d); const t = j.choices?.[0]?.delta?.content; if (t) yield t } catch {}
    }
  }
}

async function* streamAnthropic(messages, system, key, signal) {
  const msgs = messages.map(m => ({ role: m.role, content: m.content }))
  const body = {
    model: 'claude-3-5-sonnet-20241022',
    messages: msgs,
    max_tokens: 4096,
    stream: true,
    ...(system ? { system } : {})
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerously-allow-html-user-agents': 'true'
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const l of lines) {
      if (!l.startsWith('data:')) continue
      const d = l.slice(5).trim()
      try {
        const j = JSON.parse(d)
        if (j.type === 'content_block_delta') {
          const t = j.delta?.text
          if (t) yield t
        }
      } catch {}
    }
  }
}

async function* streamOpenRouter(messages, system, key, signal) {
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: msgs, temperature: 0.5, stream: true }),
  })
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop()
    for (const l of lines) {
      if (!l.startsWith('data:')) continue
      const d = l.slice(5).trim()
      if (d === '[DONE]') return
      try { const j = JSON.parse(d); const t = j.choices?.[0]?.delta?.content; if (t) yield t } catch {}
    }
  }
}

/** Pick the best available provider and stream. */
async function* smartStream(messages, system, signal) {
  const keys = await getProviderKeys()
  if (keys.openai) { yield* streamOpenAI(messages, system, keys.openai, signal); return }
  if (keys.anthropic) { yield* streamAnthropic(messages, system, keys.anthropic, signal); return }
  if (keys.openrouter) { yield* streamOpenRouter(messages, system, keys.openrouter, signal); return }
  if (keys.groq) { yield* streamGroq(messages, system, keys.groq, signal); return }
  if (keys.gemini) { yield* streamGemini(messages, system, keys.gemini, signal); return }
  
  // Fallback to Codeva API base (with apiKey if authenticated, or null for guest fallback)
  const auth = await getAuth()
  try {
    yield* streamCodeva(messages, system, auth?.apiKey || null, signal)
  } catch (e) {
    // If Codeva backend fails too, give actionable error
    const hasAnyKey = Object.values(keys).some(k => k)
    if (!hasAnyKey && !auth?.apiKey) {
      throw new Error('No API keys configured and Codeva backend is unreachable. Go to Settings → add a free Groq or Gemini API key to start chatting.')
    }
    throw e
  }
}

// ── Context menus ──
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'cyber-summarize', title: 'CyberCoder: Summarize this page', contexts: ['page'] })
  chrome.contextMenus.create({ id: 'cyber-explain', title: 'CyberCoder: Explain selection', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'cyber-rewrite', title: 'CyberCoder: Rewrite selection', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'cyber-translate', title: 'CyberCoder: Translate selection', contexts: ['selection'] })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return
  const text = info.selectionText || ''
  let prompt = ''
  switch (info.menuItemId) {
    case 'cyber-summarize': prompt = 'Summarize the following web page content concisely:'; break
    case 'cyber-explain': prompt = `Explain the following text clearly and concisely:\n\n"${text}"`; break
    case 'cyber-rewrite': prompt = `Rewrite the following text to be clearer and more professional:\n\n"${text}"`; break
    case 'cyber-translate': prompt = `Translate the following text to English (if not English) or Hindi:\n\n"${text}"`; break
  }
  // Send to side panel
  chrome.sidePanel.open({ tabId: tab.id })
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'run-task', prompt, context: text || info.pageUrl })
  }, 500)
})

// ── Message handler (from popup/panel/content) ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'get-auth') {
    getAuth().then(sendResponse)
    return true
  }
  if (msg.type === 'set-auth') {
    setAuth(msg.auth).then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'clear-auth') {
    clearAuth().then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'get-providers') {
    getProviderKeys().then(sendResponse)
    return true
  }
  if (msg.type === 'set-provider') {
    setProviderKey(msg.provider, msg.key).then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'capture-screenshot') {
    // Real visual screenshot using chrome.tabs.captureVisibleTab
    chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 80 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ screenshot: null, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ screenshot: dataUrl })
      }
    })
    return true
  }
  if (msg.type === 'get-tabs') {
    // Tab management — list all open tabs
    chrome.tabs.query({}, (tabs) => {
      sendResponse({
        tabs: tabs.map(t => ({
          id: t.id,
          title: t.title?.slice(0, 100),
          url: t.url,
          active: t.active,
          windowId: t.windowId
        }))
      })
    })
    return true
  }
  if (msg.type === 'switch-tab') {
    // Switch to a specific tab
    chrome.tabs.update(msg.tabId, { active: true }, (tab) => {
      if (tab?.windowId) chrome.windows.update(tab.windowId, { focused: true })
      sendResponse({ ok: true })
    })
    return true
  }
  if (msg.type === 'close-tab') {
    chrome.tabs.remove(msg.tabId, () => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'new-tab') {
    chrome.tabs.create({ url: msg.url || 'about:blank' }, (tab) => {
      sendResponse({ ok: true, tabId: tab.id })
    })
    return true
  }
  if (msg.type === 'open-settings') {
    // Open settings tab inside side panel or popup instead of forcing redirect
    sendResponse({ ok: true })
    return true
  }
  if (msg.type === 'get-backend') {
    getApiBase().then(sendResponse)
    return true
  }
  if (msg.type === 'set-backend') {
    chrome.storage.local.set({ customApiBase: msg.url }).then(() => sendResponse({ ok: true }))
    return true
  }
  if (msg.type === 'get-page-content') {
    // Ask content script for the page text
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (!tabs[0]?.id) { sendResponse({ text: '' }); return }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'extract-text' }, (res) => {
        sendResponse(res || { text: '' })
      })
    })
    return true
  }
})

// ── Stream connection handler ──
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'stream') {
    let controller = new AbortController()
    port.onDisconnect.addListener(() => {
      controller.abort()
    })
    port.onMessage.addListener(async (msg) => {
      if (msg.type === 'start') {
        try {
          const model = msg.model || 'auto'
          const keys = await getProviderKeys()
          let stream

          // Route based on user-selected model
          if (model === 'groq' && keys.groq) {
            stream = streamGroq(msg.messages, msg.system, keys.groq, controller.signal)
          } else if (model === 'gemini' && keys.gemini) {
            stream = streamGemini(msg.messages, msg.system, keys.gemini, controller.signal)
          } else if (model === 'openai' && keys.openai) {
            stream = streamOpenAI(msg.messages, msg.system, keys.openai, controller.signal)
          } else if (model === 'anthropic' && keys.anthropic) {
            stream = streamAnthropic(msg.messages, msg.system, keys.anthropic, controller.signal)
          } else if (model === 'openrouter' && keys.openrouter) {
            stream = streamOpenRouter(msg.messages, msg.system, keys.openrouter, controller.signal)
          } else if (model !== 'auto' && !keys[model]) {
            // User selected a specific provider but has no key
            port.postMessage({ type: 'error', message: 'No API key set for ' + model + '. Go to Settings → Provider API Keys to add one.' })
            return
          } else {
            // Auto mode or fallback
            stream = smartStream(msg.messages, msg.system, controller.signal)
          }

          for await (const chunk of stream) {
            port.postMessage({ type: 'chunk', text: chunk })
          }
          port.postMessage({ type: 'done' })
        } catch (err) {
          const errMsg = err.message || 'Unknown error'
          if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ERR_')) {
            port.postMessage({ type: 'error', message: 'Cannot reach the AI provider. Check your internet connection or try a different model.' })
          } else if (errMsg.includes('401') || errMsg.includes('403')) {
            port.postMessage({ type: 'error', message: 'API key is invalid or expired. Update your key in Settings.' })
          } else if (errMsg.includes('429')) {
            port.postMessage({ type: 'error', message: 'Rate limit exceeded. Wait a moment and try again, or switch to a different model.' })
          } else {
            port.postMessage({ type: 'error', message: errMsg })
          }
        }
      }
    })
  }
})

// ── Keyboard shortcuts ──
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'summarize_page') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (tab?.id) chrome.sidePanel.open({ tabId: tab.id })
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'run-task', prompt: 'Summarize this page concisely.' })
    }, 500)
  }
})

// ── Cowork: Background task queue ──
// Tasks run in the background while the user browses. Results are stored and
// shown when the user opens the side panel.
let coworkTasks = []
let coworkResults = []

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'cowork-add') {
    // Add a background task
    const task = { id: Date.now().toString(), prompt: msg.prompt, status: 'pending', createdAt: new Date().toISOString() }
    coworkTasks.push(task)
    // Execute in background
    executeCoworkTask(task)
    sendResponse({ ok: true, taskId: task.id })
    return true
  }
  if (msg.type === 'cowork-list') {
    sendResponse({ tasks: coworkTasks, results: coworkResults })
    return true
  }
  if (msg.type === 'cowork-clear') {
    coworkTasks = []
    coworkResults = []
    sendResponse({ ok: true })
    return true
  }
})

async function executeCoworkTask(task) {
  task.status = 'running'
  try {
    let full = ''
    const system = 'You are CyberCoder running a background task. Complete the task concisely and return the result. Do not ask questions.'
    for await (const chunk of smartStream([{ role: 'user', content: task.prompt }], system, null)) {
      full += chunk
    }
    task.status = 'done'
    task.result = full
    coworkResults.push({ taskId: task.id, result: full, completedAt: new Date().toISOString() })
    // Notify the panel if open
    chrome.runtime.sendMessage({ type: 'cowork-done', taskId: task.id, result: full }).catch(() => {})
  } catch (e) {
    task.status = 'failed'
    task.error = e.message
  }
}
