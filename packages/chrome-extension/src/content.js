/**
 * CyberCoder Chrome Extension — Content Script
 *
 * Runs on every page. Responsibilities:
 * - Extract page text for summarization/analysis
 * - Inject floating action button (optional)
 * - Handle text selection for context-menu actions
 * - Communicate with background service worker
 */

// ── Extract readable text from the page ──
function extractPageText() {
  // Try to get the main content (article, main, or body)
  const selectors = ['article', 'main', '[role="main"]', '.content', '#content', '.post-content', '.entry-content']
  let el = null
  for (const s of selectors) {
    el = document.querySelector(s)
    if (el && el.innerText.trim().length > 100) break
    el = null
  }
  if (!el) el = document.body

  // Clean: remove scripts, styles, nav, footer, ads
  const clone = el.cloneNode(true)
  clone.querySelectorAll('script, style, nav, footer, header, aside, [role="navigation"], [role="banner"], .ad, .ads, .sidebar').forEach(n => n.remove())

  let text = clone.innerText || ''
  // Trim to reasonable size for AI context
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  if (text.length > 12000) text = text.slice(0, 12000) + '\n\n…[page truncated]'
  return text
}

// ── Message listener ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'extract-text') {
    const text = extractPageText()
    const title = document.title
    const url = window.location.href
    sendResponse({ text, title, url })
    return true
  }

  if (msg.type === 'highlight-text') {
    // Highlight selected text on the page (visual feedback)
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const span = document.createElement('span')
      span.style.cssText = 'background: rgba(201,100,66,0.2); border-radius: 3px; transition: background 0.3s;'
      range.surroundContents(span)
      setTimeout(() => { span.outerHTML = span.innerHTML }, 3000)
    }
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'fill-input') {
    // Fill the focused input/textarea with AI-generated text
    const active = document.activeElement
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      if (active.isContentEditable) {
        active.innerText = msg.text
      } else {
        active.value = msg.text
        active.dispatchEvent(new Event('input', { bubbles: true }))
      }
      sendResponse({ ok: true })
    } else {
      sendResponse({ ok: false, error: 'No focused input field' })
    }
    return true
  }

  // ── Browser Automation Commands (Puppeteer-like) ──

  if (msg.type === 'click') {
    // Click an element by CSS selector or text content
    try {
      let el = null
      if (msg.selector) el = document.querySelector(msg.selector)
      if (!el && msg.text) {
        const all = document.querySelectorAll('a, button, [role="button"], input[type="submit"]')
        el = Array.from(all).find(e => e.textContent?.trim().toLowerCase().includes(msg.text.toLowerCase()))
      }
      if (el) { el.click(); sendResponse({ ok: true, clicked: el.tagName }) }
      else sendResponse({ ok: false, error: 'Element not found' })
    } catch (e) { sendResponse({ ok: false, error: e.message }) }
    return true
  }

  if (msg.type === 'type-text') {
    // Type text into an element (by selector or the focused element)
    try {
      const el = msg.selector ? document.querySelector(msg.selector) : document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        if (el.isContentEditable) el.innerText = msg.text
        else { el.value = msg.text; el.dispatchEvent(new Event('input', { bubbles: true })) }
        sendResponse({ ok: true })
      } else sendResponse({ ok: false, error: 'No typeable element found' })
    } catch (e) { sendResponse({ ok: false, error: e.message }) }
    return true
  }

  if (msg.type === 'scroll-to') {
    // Scroll to an element or position
    try {
      if (msg.selector) {
        const el = document.querySelector(msg.selector)
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); sendResponse({ ok: true }) }
        else sendResponse({ ok: false, error: 'Element not found' })
      } else {
        window.scrollTo({ top: msg.y || 0, left: msg.x || 0, behavior: 'smooth' })
        sendResponse({ ok: true })
      }
    } catch (e) { sendResponse({ ok: false, error: e.message }) }
    return true
  }

  if (msg.type === 'get-elements') {
    // Get a list of interactive elements on the page (for AI to choose from)
    try {
      const els = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [onclick]')
      const items = Array.from(els).slice(0, 50).map((el, i) => ({
        index: i,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        text: (el.textContent || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').trim().slice(0, 80),
        href: el.getAttribute('href') || '',
        selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : `${el.tagName.toLowerCase()}:nth-of-type(${i + 1})`,
      }))
      sendResponse({ elements: items })
    } catch (e) { sendResponse({ elements: [], error: e.message }) }
    return true
  }

  if (msg.type === 'screenshot') {
    // Capture visible viewport as a data URL using canvas
    try {
      // Use the native browser API to capture the visible area
      // We create a canvas and draw the page content
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // For a proper screenshot, we use the background script's chrome.tabs.captureVisibleTab
      // From content script, we can only provide page metadata + a DOM snapshot
      const info = {
        title: document.title,
        url: window.location.href,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        scrollY: window.scrollY,
        bodyHeight: document.body.scrollHeight,
        // Visible text content (what the user sees)
        visibleText: document.body.innerText.slice(0, 3000),
        // Key visual elements
        images: Array.from(document.querySelectorAll('img')).slice(0, 10).map(img => ({
          src: img.src?.slice(0, 200),
          alt: img.alt?.slice(0, 100),
          width: img.naturalWidth,
          height: img.naturalHeight
        })),
        headings: Array.from(document.querySelectorAll('h1,h2,h3')).slice(0, 10).map(h => h.textContent?.trim().slice(0, 100))
      }
      sendResponse({ screenshot: null, info, note: 'Page structure captured. Use chrome.tabs.captureVisibleTab for visual screenshot.' })
    } catch (e) { sendResponse({ screenshot: null, error: e.message }) }
    return true
  }

  if (msg.type === 'navigate') {
    // Navigate to a URL
    try {
      window.location.href = msg.url
      sendResponse({ ok: true })
    } catch (e) { sendResponse({ ok: false, error: e.message }) }
    return true
  }
})

// ── Floating action button (shows on text selection) ──
let fab = null
document.addEventListener('mouseup', (e) => {
  const sel = window.getSelection()
  if (sel && sel.toString().trim().length > 10) {
    if (!fab) {
      fab = document.createElement('div')
      fab.id = 'cybercoder-fab'
      fab.innerHTML = '✳'
      document.body.appendChild(fab)
      fab.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'run-task', prompt: `Explain: "${sel.toString().trim().slice(0, 500)}"` })
        hideFab()
      })
    }
    fab.style.display = 'flex'
    fab.style.top = `${e.pageY - 40}px`
    fab.style.left = `${e.pageX + 10}px`
  } else {
    hideFab()
  }
})

function hideFab() {
  if (fab) fab.style.display = 'none'
}
document.addEventListener('mousedown', (e) => {
  if (e.target?.id !== 'cybercoder-fab') hideFab()
})
