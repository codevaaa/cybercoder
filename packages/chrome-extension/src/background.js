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
// ── Provider streaming (via Codeva Cloud backend) ──
async function* smartStream(messages, system, signal, targetModel) {
  const auth = await getAuth()
  const headers = { 'Content-Type': 'application/json' }
  if (auth?.apiKey) headers.Authorization = `Bearer ${auth.apiKey}`
  
  const body = { 
    messages: system ? [{ role: 'system', content: system }, ...messages] : messages, 
    model: targetModel || 'auto', 
    stream: true 
  }
  
  const res = await fetch(`${API_BASE}/completions`, { method: 'POST', headers, body: JSON.stringify(body), signal })
  if (!res.ok) throw new Error(`Codeva Backend ${res.status}`)
  
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
        if (chrome.runtime.lastError) { /* ignore */ }
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
          // Route based on user-selected model
          let stream = smartStream(msg.messages, msg.system, controller.signal, model)

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
