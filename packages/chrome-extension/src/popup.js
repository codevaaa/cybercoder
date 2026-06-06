/**
 * CyberCoder Chrome Extension — Popup Script
 * Handles login/logout, task buttons, connection status, and opening the side panel.
 */

const loginView = document.getElementById('loginView')
const mainView = document.getElementById('mainView')
const loginBtn = document.getElementById('loginBtn')
const signoutBtn = document.getElementById('signoutBtn')
const pinBtn = document.getElementById('pinBtn')
const closeBtn = document.getElementById('closeBtn')
const connIndicator = document.getElementById('connIndicator')

async function checkAuth() {
  try {
    const auth = await chrome.runtime.sendMessage({ type: 'get-auth' }).catch(() => null)
    if (auth) {
      loginView.classList.add('hidden')
      mainView.classList.remove('hidden')
      mainView.style.display = 'flex'
      if (auth?.email) {
        document.getElementById('userName').textContent = auth.email.split('@')[0]
        document.getElementById('userAvatar').textContent = auth.email[0].toUpperCase()
        document.getElementById('userPlan').textContent = (auth.plan || 'free').toUpperCase()
      }
      connIndicator.style.background = '#4ade80'
    } else {
      loginView.classList.remove('hidden')
      mainView.classList.add('hidden')
      connIndicator.style.background = '#d1d1d1'
    }
  } catch (err) {
    console.error('Auth check error:', err)
  }
}

loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://cybermindcli.info/api-keys' })
})

signoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clear-auth' })
  checkAuth()
})

pinBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (tab?.id) chrome.sidePanel.open({ tabId: tab.id })
})

closeBtn.addEventListener('click', () => window.close())

// Task buttons
document.querySelectorAll('.task-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const task = btn.dataset.task
    const prompts = {
      summarize: 'Summarize this page concisely in bullet points.',
      extract: 'Extract the key structured data from this page as a table or JSON.',
      explain: 'Explain this page content in simple terms (ELI5).',
      translate: 'Translate this page content to Hindi.',
      rewrite: 'Rewrite the selected text to be clearer and more professional.',
      code: 'Find and explain all code snippets on this page.',
      md: 'Convert this page content to clean Markdown format.',
    }
    const prompt = prompts[task] || task

    // Visual feedback
    const origText = btn.querySelector('.txt')?.textContent
    if (btn.querySelector('.txt')) btn.querySelector('.txt').textContent = 'Opening...'
    btn.style.borderColor = '#C96442'

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (tab?.id) {
      if (task !== 'chat') {
        await chrome.storage.local.set({ pendingTask: prompt })
      }
      await chrome.sidePanel.open({ tabId: tab.id })
      if (task !== 'chat') {
        chrome.runtime.sendMessage({ type: 'run-task', prompt }).catch(() => {})
      }
    }
    window.close()
  })
})

checkAuth()
