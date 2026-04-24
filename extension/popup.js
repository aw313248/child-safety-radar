// PeekKids popup

const content = document.getElementById('content')

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c])
}

function getChannelUrlFromTab(tabUrl) {
  if (!tabUrl || !tabUrl.includes('youtube.com')) return null
  const match = tabUrl.match(/youtube\.com\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)/)
  if (match) return `https://www.youtube.com/${match[1]}`
  const watch = tabUrl.match(/youtube\.com\/watch\?v=[\w-]+/)
  if (watch) return tabUrl.split('&')[0]
  return null
}

function renderResult(data) {
  const levelLabel = data.riskLevel === 'high' ? '高風險' : data.riskLevel === 'medium' ? '注意觀察' : '安全'
  content.innerHTML = `
    <div class="result-card">
      <div class="score-row">
        <div class="score score--${data.riskLevel}">${data.riskScore}<span>/100</span></div>
        <div class="level level--${data.riskLevel}">${levelLabel}</div>
      </div>
      <div class="channel-name">${escapeHtml(data.channelName)}</div>
      <p class="summary">${escapeHtml(data.aiSummary || '')}</p>
      <p class="recommendation">${escapeHtml(data.recommendation || '')}</p>
    </div>
    <button class="btn" id="rescan">重新掃描</button>
  `
  document.getElementById('rescan').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, () => scan())
  })
}

function renderError(msg, needsSetup) {
  content.innerHTML = `
    <div class="error">${escapeHtml(msg)}</div>
    ${needsSetup ? `<button class="btn" id="setupBtn" style="margin-top:10px">前往設定</button>` : ''}
  `
  if (needsSetup) {
    document.getElementById('setupBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage()
    })
  }
}

function renderLoading(url) {
  content.innerHTML = `
    <div class="channel-label">正在分析</div>
    <div class="channel-url">${escapeHtml(url)}</div>
    <button class="btn" disabled>掃描中（20–40 秒）</button>
  `
}

function renderNotYoutube() {
  content.innerHTML = `<p class="hint">請先打開 YouTube 頻道頁（或看影片頁），再按擴充套件圖示</p>`
}

async function scan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = getChannelUrlFromTab(tab?.url || '')
  if (!url) {
    renderNotYoutube()
    return
  }
  renderLoading(url)
  const res = await chrome.runtime.sendMessage({ type: 'ANALYZE', url })
  if (res?.ok) {
    renderResult(res.data)
  } else {
    renderError(res?.error || '分析失敗', res?.needsSetup)
  }
}

// Footer links
document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault()
  chrome.runtime.openOptionsPage()
})
document.getElementById('openSite').addEventListener('click', (e) => {
  e.preventDefault()
  chrome.tabs.create({ url: PEEKKIDS_CONFIG.SITE_URL })
})

scan()
