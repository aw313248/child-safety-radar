// PeekKids service worker
// 負責：呼叫 API、快取結果、回傳給 content script / popup

importScripts('config.js')

const CACHE = new Map() // channelUrl → { result, expiresAt }

async function getApiKey() {
  const stored = await chrome.storage.local.get(['apiKey'])
  return (stored.apiKey && stored.apiKey.trim()) || PEEKKIDS_CONFIG.DEFAULT_API_KEY
}

async function analyzeChannel(url) {
  // 先查快取
  const cached = CACHE.get(url)
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, data: cached.result, cached: true }
  }

  const apiKey = await getApiKey()
  if (!apiKey) {
    return {
      ok: false,
      error: '尚未設定 API Key，請到擴充套件選項設定',
      needsSetup: true,
    }
  }

  try {
    const res = await fetch(`${PEEKKIDS_CONFIG.API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ url }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { ok: false, error: data.error || `API 錯誤 ${res.status}` }
    }

    // 寫入快取
    CACHE.set(url, {
      result: data,
      expiresAt: Date.now() + PEEKKIDS_CONFIG.CACHE_TTL,
    })

    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: '網路錯誤，請稍後再試' }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'ANALYZE') {
    analyzeChannel(msg.url).then(sendResponse)
    return true // async
  }
  if (msg.type === 'CLEAR_CACHE') {
    CACHE.clear()
    sendResponse({ ok: true })
    return false
  }
  if (msg.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
    return false
  }
})
