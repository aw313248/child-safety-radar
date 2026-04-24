// PeekKids content script
// 1) 頻道頁：注入浮動檢查按鈕 + 結果 badge
// 2) 全站（首頁 / 搜尋 / 推薦 / watch 側欄）：掃黑名單頻道，自動隱藏 or 蓋上遮罩
// 3) watch 頁：若當前頻道在黑名單 → 全畫面警告遮罩
// SPA：YouTube 內部切頁靠 yt-navigate-finish event

;(function () {
  const BADGE_ID = '__peekkids_badge__'
  const PANEL_ID = '__peekkids_panel__'
  const SETUP_ID = '__peekkids_setup__'
  const BLOCK_OVERLAY_ID = '__peekkids_block_overlay__'
  const TOAST_ID = '__peekkids_toast__'

  let blocklist = {} // { channelUrl: { channelName, riskScore, riskLevel, blockedAt } }
  let settings = { autoBlockHighRisk: true, hideMode: 'blur' } // 'hide' 或 'blur'
  const PEEKKIDS_SITE = 'https://child-safety-radar.vercel.app'

  // ── 讀取 blocklist 與設定 ────────────────────────────
  function loadBlocklist(cb) {
    chrome.storage.local.get(['blocklist', 'autoBlockHighRisk', 'hideMode'], (res) => {
      blocklist = res.blocklist || {}
      if (typeof res.autoBlockHighRisk === 'boolean') settings.autoBlockHighRisk = res.autoBlockHighRisk
      if (res.hideMode) settings.hideMode = res.hideMode
      cb && cb()
    })
  }

  // 監聽 storage 變更，即時同步（options 頁改了這邊也要跟著動）
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blocklist) blocklist = changes.blocklist.newValue || {}
    if (changes.autoBlockHighRisk) settings.autoBlockHighRisk = changes.autoBlockHighRisk.newValue
    if (changes.hideMode) settings.hideMode = changes.hideMode.newValue
    applyBlocklistToDom()
    checkWatchPageBlocked()
  })

  function addToBlocklist(data) {
    if (!data || !data.channelUrl) return
    blocklist[data.channelUrl] = {
      channelName: data.channelName,
      riskScore: data.riskScore,
      riskLevel: data.riskLevel,
      blockedAt: Date.now(),
    }
    chrome.storage.local.set({ blocklist })
  }

  // ── 判斷當前頁是不是「頻道頁」──────────────────────
  function getChannelUrl() {
    const href = location.href
    const match = href.match(/youtube\.com\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)/)
    if (match) return `https://www.youtube.com/${match[1]}`
    const watch = href.match(/youtube\.com\/watch\?v=[\w-]+/)
    if (watch) return href.split('&')[0]
    return null
  }

  // ── 抓當前 watch 頁的 channel handle / id ──────────
  function getWatchPageChannel() {
    // 嘗試從頁面上的 channel link 抓
    const link = document.querySelector('ytd-watch-metadata ytd-channel-name a, ytd-video-owner-renderer ytd-channel-name a')
    if (!link) return null
    const href = link.getAttribute('href') || ''
    const m = href.match(/\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)/)
    return m ? { url: `https://www.youtube.com${m[0]}`, name: link.textContent?.trim() || '' } : null
  }

  // ── 建立一個頻道 url 的所有可能格式做比對 ──────────
  function matchBlocklist(linkHref) {
    if (!linkHref) return null
    // linkHref 可能是 "/@xxx" 或完整 url，先 normalize
    let full = linkHref
    if (full.startsWith('/')) full = 'https://www.youtube.com' + full
    full = full.split('?')[0].replace(/\/$/, '')
    // 試完整比對
    for (const url in blocklist) {
      const normalized = url.split('?')[0].replace(/\/$/, '')
      if (normalized === full || full.startsWith(normalized + '/')) {
        return { url, data: blocklist[url] }
      }
    }
    return null
  }

  // ── 隱藏黑名單頻道的影片卡（首頁 / 搜尋 / 推薦 / 側欄）─
  function applyBlocklistToDom() {
    if (!blocklist || Object.keys(blocklist).length === 0) return

    // 所有可能的影片卡 selector（YouTube 改版過很多次）
    const cardSelectors = [
      'ytd-rich-item-renderer',      // 首頁 / 訂閱
      'ytd-video-renderer',           // 搜尋結果
      'ytd-compact-video-renderer',   // watch 側欄
      'ytd-grid-video-renderer',      // 舊版網格
      'ytd-rich-grid-media',
      'ytm-shorts-lockup-view-model', // Shorts 卡
    ]

    const cards = document.querySelectorAll(cardSelectors.join(','))
    cards.forEach((card) => {
      if (card.dataset.peekkidsProcessed === '1' && !card.dataset.peekkidsUnblocked) {
        // 已處理過，但要注意黑名單可能有更新 → 重新掃
      }
      // 找卡片內所有可能的頻道連結
      const channelLinks = card.querySelectorAll('a[href*="/channel/"], a[href*="/@"], a[href*="/c/"], a[href*="/user/"]')
      let hit = null
      channelLinks.forEach((a) => {
        if (hit) return
        const href = a.getAttribute('href')
        const m = matchBlocklist(href)
        if (m) hit = m
      })

      if (hit) {
        markCardBlocked(card, hit.data)
      } else {
        // 如果之前被標記但現在 blocklist 已移除 → 還原
        if (card.dataset.peekkidsBlocked === '1') unblockCard(card)
      }
      card.dataset.peekkidsProcessed = '1'
    })
  }

  function markCardBlocked(card, data) {
    if (card.dataset.peekkidsBlocked === '1') return

    if (settings.hideMode === 'hide') {
      card.style.display = 'none'
    } else {
      // blur 模式：保留卡 + 蓋一層警告
      card.style.position = 'relative'
      card.classList.add('peekkids-card-blurred')

      const overlay = document.createElement('div')
      overlay.className = 'peekkids-card-block-overlay'
      overlay.innerHTML = `
        <div class="peekkids-card-block-icon">⚠️</div>
        <div class="peekkids-card-block-title">PeekKids 已標記</div>
        <div class="peekkids-card-block-desc">${escapeHtml(data.channelName || '此頻道')} · 風險 ${data.riskScore || '?'}</div>
        <button class="peekkids-card-block-unblock" data-peekkids-unblock="1">仍要觀看</button>
      `
      overlay.querySelector('[data-peekkids-unblock]').addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        unblockCard(card, true)
      })
      card.appendChild(overlay)
    }
    card.dataset.peekkidsBlocked = '1'
  }

  function unblockCard(card, temporary) {
    card.classList.remove('peekkids-card-blurred')
    const overlay = card.querySelector('.peekkids-card-block-overlay')
    if (overlay) overlay.remove()
    card.style.display = ''
    if (temporary) {
      card.dataset.peekkidsUnblocked = '1'
    }
    delete card.dataset.peekkidsBlocked
  }

  // ── Watch 頁：如果這個影片的頻道在黑名單 → 全畫面警告 ─
  function checkWatchPageBlocked() {
    const existing = document.getElementById(BLOCK_OVERLAY_ID)
    if (!location.href.includes('youtube.com/watch')) {
      if (existing) existing.remove()
      return
    }
    const info = getWatchPageChannel()
    if (!info) return
    const match = matchBlocklist(info.url)
    if (!match) {
      if (existing) existing.remove()
      return
    }
    if (existing) return // 已經有遮罩

    // 嘗試暫停影片
    try {
      const video = document.querySelector('video')
      if (video) video.pause()
    } catch {}

    renderWatchBlockOverlay(match.data)
  }

  function renderWatchBlockOverlay(data) {
    const overlay = document.createElement('div')
    overlay.id = BLOCK_OVERLAY_ID
    overlay.className = 'peekkids-watch-overlay'
    overlay.innerHTML = `
      <div class="peekkids-watch-card">
        <div class="peekkids-watch-owl">🦉</div>
        <div class="peekkids-watch-title">PeekKids 已擋下這個頻道</div>
        <div class="peekkids-watch-channel">${escapeHtml(data.channelName || '')}</div>
        <div class="peekkids-watch-score">風險分數 <b>${data.riskScore || '?'}</b> · ${data.riskLevel === 'high' ? '高風險' : '注意觀察'}</div>
        <div class="peekkids-watch-actions">
          <button class="peekkids-watch-back">返回上一頁</button>
          <button class="peekkids-watch-continue">仍要觀看（解鎖一次）</button>
        </div>
        <button class="peekkids-watch-settings">管理黑名單</button>
      </div>
    `
    overlay.querySelector('.peekkids-watch-back').addEventListener('click', () => {
      if (window.history.length > 1) window.history.back()
      else location.href = 'https://www.youtube.com/'
    })
    overlay.querySelector('.peekkids-watch-continue').addEventListener('click', () => {
      overlay.remove()
      try { document.querySelector('video')?.play() } catch {}
    })
    overlay.querySelector('.peekkids-watch-settings').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
    })
    document.body.appendChild(overlay)
  }

  // ── Toast ──────────────────────────────────────────
  function showToast(text) {
    let t = document.getElementById(TOAST_ID)
    if (t) t.remove()
    t = document.createElement('div')
    t.id = TOAST_ID
    t.className = 'peekkids-toast'
    t.textContent = text
    document.body.appendChild(t)
    setTimeout(() => t.classList.add('peekkids-toast--show'), 10)
    setTimeout(() => {
      t.classList.remove('peekkids-toast--show')
      setTimeout(() => t.remove(), 300)
    }, 3200)
  }

  // ── Badge / Setup / Panel（保留原本邏輯） ────────────
  function renderBadge(state, data) {
    let badge = document.getElementById(BADGE_ID)
    if (!badge) {
      badge = document.createElement('div')
      badge.id = BADGE_ID
      badge.className = 'peekkids-badge'
      badge.addEventListener('click', () => {
        if (badge.dataset.state === 'done') togglePanel()
        else if (badge.dataset.state === 'idle') runScan()
      })
      document.body.appendChild(badge)
    }
    badge.dataset.state = state
    if (state === 'idle') {
      badge.className = 'peekkids-badge peekkids-badge--idle'
      badge.innerHTML = `<span class="peekkids-owl">🦉</span><span class="peekkids-label">PeekKids 檢查</span>`
    } else if (state === 'loading') {
      badge.className = 'peekkids-badge peekkids-badge--loading'
      badge.innerHTML = `<span class="peekkids-spinner"></span><span class="peekkids-label">掃描中</span>`
    } else if (state === 'done' && data) {
      const level = data.riskLevel
      const levelLabel = level === 'high' ? '高風險' : level === 'medium' ? '注意' : '安全'
      badge.className = `peekkids-badge peekkids-badge--${level}`
      badge.innerHTML = `<span class="peekkids-owl">🦉</span><span class="peekkids-score">${data.riskScore}</span><span class="peekkids-label">${levelLabel}</span>`
    } else if (state === 'error') {
      badge.className = 'peekkids-badge peekkids-badge--error'
      badge.innerHTML = `<span class="peekkids-owl">⚠️</span><span class="peekkids-label">${data || '失敗'}</span>`
    }
  }

  function renderSetupCard() {
    const oldBadge = document.getElementById(BADGE_ID)
    if (oldBadge) oldBadge.remove()
    let card = document.getElementById(SETUP_ID)
    if (card) card.remove()
    card = document.createElement('div')
    card.id = SETUP_ID
    card.className = 'peekkids-setup'
    card.innerHTML = `
      <button class="peekkids-setup-dismiss" aria-label="關閉">×</button>
      <div class="peekkids-setup-head">
        <div class="peekkids-setup-icon">🔑</div>
        <div class="peekkids-setup-title">PeekKids 尚未設定<br>API Key</div>
      </div>
      <p class="peekkids-setup-desc">設定後才能掃描 YouTube 頻道，2 分鐘就搞定，沒有 key 的話可以到官網領取</p>
      <button class="peekkids-setup-cta">前往設定 →</button>
    `
    card.querySelector('.peekkids-setup-dismiss').addEventListener('click', () => card.remove())
    card.querySelector('.peekkids-setup-cta').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' })
    })
    document.body.appendChild(card)
  }

  function togglePanel() {
    const existing = document.getElementById(PANEL_ID)
    if (existing) { existing.remove(); return }
    renderPanel(lastResult)
  }

  let lastResult = null

  function renderPanel(data) {
    if (!data) return
    const level = data.riskLevel
    const panel = document.createElement('div')
    panel.id = PANEL_ID
    panel.className = `peekkids-panel peekkids-panel--${level}`
    const levelLabel = level === 'high' ? '高風險' : level === 'medium' ? '注意觀察' : '安全'
    const tagline = level === 'high' ? '不建議讓孩子觀看' : level === 'medium' ? '建議家長全程陪同' : '適合兒童觀看'
    const inBlocklist = !!blocklist[data.channelUrl]

    panel.innerHTML = `
      <div class="peekkids-panel-header">
        <div>
          <div class="peekkids-panel-score">${data.riskScore}<span>/100</span></div>
          <div class="peekkids-panel-level">${levelLabel} · ${tagline}</div>
        </div>
        <button class="peekkids-close" aria-label="關閉">×</button>
      </div>
      <div class="peekkids-panel-body">
        <div class="peekkids-channel">${escapeHtml(data.channelName)}</div>
        <p class="peekkids-summary">${escapeHtml(data.aiSummary || '')}</p>
        <p class="peekkids-recommendation">${escapeHtml(data.recommendation || '')}</p>
        <button class="peekkids-block-btn ${inBlocklist ? 'peekkids-block-btn--active' : ''}" data-peekkids-block>
          ${inBlocklist ? '✓ 已加入黑名單（點此移除）' : '🛡 加入黑名單並隱藏此頻道'}
        </button>
      </div>
      <div class="peekkids-panel-actions">
        <a href="${PEEKKIDS_SITE}/?u=${encodeURIComponent(data.channelUrl)}" target="_blank" rel="noopener">看完整報告 →</a>
      </div>
    `
    panel.querySelector('.peekkids-close').addEventListener('click', () => panel.remove())
    panel.querySelector('[data-peekkids-block]').addEventListener('click', () => {
      if (blocklist[data.channelUrl]) {
        delete blocklist[data.channelUrl]
        chrome.storage.local.set({ blocklist })
        showToast('已從黑名單移除')
      } else {
        addToBlocklist(data)
        showToast(`已封鎖「${data.channelName}」，此頻道的影片會被隱藏`)
      }
      panel.remove()
      applyBlocklistToDom()
    })
    document.body.appendChild(panel)
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c])
  }

  // ── 掃描流程 ─────────────────────────────────────────
  async function runScan() {
    const url = getChannelUrl()
    if (!url) { renderBadge('error', '無法辨識頁面'); return }
    renderBadge('loading')
    try {
      const res = await chrome.runtime.sendMessage({ type: 'ANALYZE', url })
      if (res && res.ok) {
        lastResult = res.data
        renderBadge('done', res.data)
        // 高風險自動加黑名單 + 提示
        if (res.data.riskLevel === 'high' && settings.autoBlockHighRisk) {
          addToBlocklist(res.data)
          showToast(`高風險已自動封鎖：${res.data.channelName}`)
          applyBlocklistToDom()
        }
        if (res.data.riskLevel === 'high') renderPanel(res.data)
      } else if (res?.needsSetup) {
        renderSetupCard()
      } else {
        renderBadge('error', res?.error?.slice(0, 12) || '失敗')
      }
    } catch (err) {
      renderBadge('error', '失敗')
    }
  }

  // ── MutationObserver：YouTube 動態載入內容 ────────────
  let observerSet = false
  function setupObserver() {
    if (observerSet) return
    observerSet = true
    const observer = new MutationObserver(() => {
      // debounce
      clearTimeout(window.__peekkids_obs_timer)
      window.__peekkids_obs_timer = setTimeout(() => {
        applyBlocklistToDom()
        checkWatchPageBlocked()
      }, 300)
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  // ── 初始化 ───────────────────────────────────────────
  function init() {
    const url = getChannelUrl()
    lastResult = null
    const existingPanel = document.getElementById(PANEL_ID)
    if (existingPanel) existingPanel.remove()
    const existingSetup = document.getElementById(SETUP_ID)
    if (existingSetup) existingSetup.remove()
    const existingOverlay = document.getElementById(BLOCK_OVERLAY_ID)
    if (existingOverlay) existingOverlay.remove()

    loadBlocklist(() => {
      applyBlocklistToDom()
      checkWatchPageBlocked()
      setupObserver()

      // 頻道 / watch 頁才顯示掃描 badge
      if (url) {
        chrome.storage.local.get(['apiKey'], (res) => {
          const key = (res.apiKey || '').trim()
          if (!key) renderSetupCard()
          else renderBadge('idle')
        })
      } else {
        const badge = document.getElementById(BADGE_ID)
        if (badge) badge.remove()
      }
    })
  }

  init()
  document.addEventListener('yt-navigate-finish', init)
})()
