const input = document.getElementById('apiKey')
const saveBtn = document.getElementById('save')
const savedMsg = document.getElementById('saved')
const autoBlockToggle = document.getElementById('autoBlockToggle')
const hideModeRow = document.getElementById('hideModeRow')
const blocklistDiv = document.getElementById('blocklist')
const blockCount = document.getElementById('blockCount')

// ── API Key ─────────────────────────────────────
chrome.storage.local.get(['apiKey'], (res) => {
  if (res.apiKey) input.value = res.apiKey
})

saveBtn.addEventListener('click', () => {
  const key = input.value.trim()
  chrome.storage.local.set({ apiKey: key }, () => {
    savedMsg.style.display = 'inline-block'
    setTimeout(() => { savedMsg.style.display = 'none' }, 2000)
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' })
  })
})

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click()
})

// ── Auto-block toggle ─────────────────────────────
function setToggle(el, on) {
  if (on) el.classList.add('on')
  else el.classList.remove('on')
}

chrome.storage.local.get(['autoBlockHighRisk', 'hideMode'], (res) => {
  const auto = res.autoBlockHighRisk !== false // 預設 true
  setToggle(autoBlockToggle, auto)
  const mode = res.hideMode || 'blur'
  hideModeRow.querySelectorAll('.radio-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode)
  })
})

autoBlockToggle.addEventListener('click', () => {
  const now = !autoBlockToggle.classList.contains('on')
  setToggle(autoBlockToggle, now)
  chrome.storage.local.set({ autoBlockHighRisk: now })
})

hideModeRow.querySelectorAll('.radio-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    hideModeRow.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    chrome.storage.local.set({ hideMode: btn.dataset.mode })
  })
})

// ── Blocklist ─────────────────────────────────────
function renderBlocklist() {
  chrome.storage.local.get(['blocklist'], (res) => {
    const list = res.blocklist || {}
    const entries = Object.entries(list).sort((a, b) => (b[1].blockedAt || 0) - (a[1].blockedAt || 0))
    blockCount.textContent = entries.length ? `· ${entries.length} 個` : ''

    if (entries.length === 0) {
      blocklistDiv.innerHTML = '<div class="block-empty">還沒有封鎖任何頻道<br>掃到高風險時會自動加入這裡</div>'
      return
    }

    blocklistDiv.innerHTML = ''
    entries.forEach(([url, data]) => {
      const row = document.createElement('div')
      row.className = 'block-item'
      row.innerHTML = `
        <div class="block-name" title="${url}">${escapeHtml(data.channelName || url)}</div>
        <div class="block-score">${data.riskScore || '?'}</div>
        <button class="block-remove" data-url="${url}">解除封鎖</button>
      `
      row.querySelector('.block-remove').addEventListener('click', () => {
        if (!confirm(`確定要解除封鎖「${data.channelName}」嗎？`)) return
        chrome.storage.local.get(['blocklist'], (r) => {
          const bl = r.blocklist || {}
          delete bl[url]
          chrome.storage.local.set({ blocklist: bl }, renderBlocklist)
        })
      })
      blocklistDiv.appendChild(row)
    })
  })
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c])
}

renderBlocklist()

// 即時同步：blocklist 變了就更新
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blocklist) renderBlocklist()
})
