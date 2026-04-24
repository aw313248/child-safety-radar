// PeekKids content script
// 在 YouTube 頻道頁注入浮動檢查按鈕 + 結果 badge
// SPA 導航：YouTube 內部切頁靠 yt-navigate-finish event，需監聽

;(function () {
  const BADGE_ID = '__peekkids_badge__'
  const PANEL_ID = '__peekkids_panel__'

  // ── 判斷當前頁是不是「頻道頁」──────────────────────
  function getChannelUrl() {
    const href = location.href
    // @handle / channel/UCxxx / c/xxx / user/xxx
    const match = href.match(/youtube\.com\/(@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+)/)
    if (match) return `https://www.youtube.com/${match[1]}`
    // watch 頁也能抓（API 會從 video 倒推 channel）
    const watch = href.match(/youtube\.com\/watch\?v=[\w-]+/)
    if (watch) return href.split('&')[0]
    return null
  }

  // ── 主 Badge（右下角浮動按鈕）────────────────────────
  function renderBadge(state, data) {
    let badge = document.getElementById(BADGE_ID)
    if (!badge) {
      badge = document.createElement('div')
      badge.id = BADGE_ID
      badge.className = 'peekkids-badge'
      badge.addEventListener('click', () => {
        if (badge.dataset.state === 'done') {
          togglePanel()
        } else if (badge.dataset.state === 'idle') {
          runScan()
        }
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
      const score = data.riskScore
      const levelLabel = level === 'high' ? '高風險' : level === 'medium' ? '注意' : '安全'
      badge.className = `peekkids-badge peekkids-badge--${level}`
      badge.innerHTML = `
        <span class="peekkids-owl">🦉</span>
        <span class="peekkids-score">${score}</span>
        <span class="peekkids-label">${levelLabel}</span>
      `
    } else if (state === 'error') {
      badge.className = 'peekkids-badge peekkids-badge--error'
      badge.innerHTML = `<span class="peekkids-owl">⚠️</span><span class="peekkids-label">${data || '失敗'}</span>`
    }
  }

  // ── 結果詳情面板 ─────────────────────────────────────
  function togglePanel() {
    const existing = document.getElementById(PANEL_ID)
    if (existing) {
      existing.remove()
      return
    }
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
      </div>
      <div class="peekkids-panel-actions">
        <a href="${PEEKKIDS_SITE}/?u=${encodeURIComponent(data.channelUrl)}" target="_blank" rel="noopener">
          看完整報告 →
        </a>
      </div>
    `
    panel.querySelector('.peekkids-close').addEventListener('click', () => panel.remove())
    document.body.appendChild(panel)
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c])
  }

  // 由 manifest 設定，content script 跑時要在 runtime 讀
  const PEEKKIDS_SITE = 'https://child-safety-radar.vercel.app'

  // ── 掃描流程 ─────────────────────────────────────────
  async function runScan() {
    const url = getChannelUrl()
    if (!url) {
      renderBadge('error', '無法辨識頁面')
      return
    }
    renderBadge('loading')
    try {
      const res = await chrome.runtime.sendMessage({ type: 'ANALYZE', url })
      if (res && res.ok) {
        lastResult = res.data
        renderBadge('done', res.data)
        // 高風險自動展開面板
        if (res.data.riskLevel === 'high') renderPanel(res.data)
      } else {
        renderBadge('error', res?.error?.slice(0, 12) || '失敗')
      }
    } catch (err) {
      renderBadge('error', '失敗')
    }
  }

  // ── 頁面切換監聽（YouTube 是 SPA）─────────────────────
  function init() {
    const url = getChannelUrl()
    lastResult = null
    const existingPanel = document.getElementById(PANEL_ID)
    if (existingPanel) existingPanel.remove()

    if (url) {
      renderBadge('idle')
    } else {
      const badge = document.getElementById(BADGE_ID)
      if (badge) badge.remove()
    }
  }

  init()
  document.addEventListener('yt-navigate-finish', init)
})()
