/**
 * CyberCoder Chrome Extension — Popup Script
 * Handles login/logout, task buttons, and opening the side panel.
 */

const loginView = document.getElementById('loginView')
const mainView = document.getElementById('mainView')
const loginBtn = document.getElementById('loginBtn')
const providerBtn = document.getElementById('providerBtn')
const signoutBtn = document.getElementById('signoutBtn')
const pinBtn = document.getElementById('pinBtn')
const closeBtn = document.getElementById('closeBtn')

async function checkAuth() {
  const auth = await chrome.runtime.sendMessage({ type: 'get-auth' })
  const providers = await chrome.runtime.sendMessage({ type: 'get-providers' })
  const hasProvider = providers && Object.values(providers).some(v => v)
  if (auth || hasProvider) {
    loginView.classList.add('hidden')
    mainView.classList.remove('hidden')
    mainView.style.display = 'flex'
    if (auth?.email) {
      document.getElementById('userName').textContent = auth.email.split('@')[0]
      document.getElementById('userAvatar').textContent = auth.email[0].toUpperCase()
      document.getElementById('userPlan').textContent = (auth.plan || 'free').toUpperCase()
    } else {
      document.getElementById('userName').textContent = 'BYOK User'
      document.getElementById('userPlan').textContent = 'PROVIDER'
    }
  } else {
    loginView.classList.remove('hidden')
    mainView.classList.add('hidden')
  }
}

loginBtn.addEventListener('click', () => {
  // Always redirect to website for auth — no in-extension provider setup
  chrome.tabs.create({ url: 'https://cybermindcli.info/api-keys' })
})

providerBtn.addEventListener('click', () => {
  // Also redirect to website providers page
  chrome.tabs.create({ url: 'https://cybermindcli.info/providers' })
})

signoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clear-auth' })
  checkAuth()
})

pinBtn.addEventListener('click', async () => {
  // Open side panel
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
