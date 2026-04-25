'use client'

import { useEffect, useRef, useState } from 'react'
import { CuratedChannel, AgeGroup, filterChannelsByAge } from '@/lib/curated-channels'
import { getUserChannels, removeUserChannel, UserChannel } from '@/lib/user-channels'
import LockScreenGuide from '@/components/LockScreenGuide'
import KidsTimer from '@/components/KidsTimer'
import Mascot, { MascotPose } from '@/components/Mascot'

// 依 channelId 穩定挑一個熊熊姿勢（同一頻道永遠同一隻熊）
const CHANNEL_POSES: MascotPose[] = ['hi', 'thumbs-up', 'fly', 'search', 'guard', 'think']
function mascotForChannel(id: string): MascotPose {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CHANNEL_POSES[h % CHANNEL_POSES.length]
}

// 統一顯示用
type DisplayChannel = {
  channelId: string
  name: string
  description: string
  emoji: string
  ageGroups: AgeGroup[]
  source: 'curated' | 'user'
}

function curatedToDisplay(c: CuratedChannel): DisplayChannel {
  return {
    channelId: c.channelId,
    name: c.name,
    description: c.description,
    emoji: c.emoji,
    ageGroups: c.ageGroups,
    source: 'curated',
  }
}
function userToDisplay(c: UserChannel): DisplayChannel {
  return {
    channelId: c.channelId,
    name: c.name,
    description: '爸媽自己加的頻道',
    emoji: c.emoji,
    ageGroups: [c.ageGroup],
    source: 'user',
  }
}

const LOCK_GUIDE_KEY = 'peekkids_lock_guide_seen'
const AGE_KEY = 'peekkids_kids_age'

interface SafeVideo {
  id: string
  title: string
  thumbnail: string
  madeForKids: boolean
}

export default function KidsModePage() {
  const [mounted, setMounted] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [age, setAge] = useState<AgeGroup | 'all'>('3-6')
  const [userChannels, setUserChannels] = useState<UserChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<DisplayChannel | null>(null)
  const [videos, setVideos] = useState<SafeVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  // 大人出題（小孩沒那麼快算）
  const [exitMath] = useState(() => {
    const a = 6 + Math.floor(Math.random() * 6) // 6–11
    const b = 7 + Math.floor(Math.random() * 6) // 7–12
    return { a, b, answer: a + b }
  })
  const [exitInput, setExitInput] = useState('')
  const [exitError, setExitError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // 算對密碼後要真的離開 → 用 ref 讓 beforeunload 放行
  const allowLeaveRef = useRef(false)

  const tryExit = () => {
    if (parseInt(exitInput, 10) === exitMath.answer) {
      allowLeaveRef.current = true
      // 退全螢幕（如果有）
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      window.location.href = '/'
    } else {
      setExitError(true)
      setTimeout(() => setExitError(false), 900)
    }
  }

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>
      }
      const ua = navigator.userAgent
      const isiOS = /ipad|iphone|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
      if (isiOS || (!el.requestFullscreen && !el.webkitRequestFullscreen)) {
        setShowGuide(true)
        return
      }
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    } catch {
      setShowGuide(true)
    }
  }

  useEffect(() => {
    setMounted(true)
    setShowGuide(localStorage.getItem(LOCK_GUIDE_KEY) !== '1')
    const savedAge = localStorage.getItem(AGE_KEY) as AgeGroup | 'all' | null
    if (savedAge) setAge(savedAge)
    setUserChannels(getUserChannels())
    // Candy Land 主題（美式高飽和 + 毛玻璃）
    document.documentElement.classList.add('candy')
    return () => { document.documentElement.classList.remove('candy') }
  }, [])

  // ═══ 影片播完自動跳回選單（不給 YouTube 推薦下手） ═══
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useEffect(() => {
    if (!playingVideoId) return
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return
      try {
        const data = JSON.parse(e.data)
        // YouTube iframe 發出 onStateChange，state 0 = ended
        if (data.event === 'onStateChange' && data.info === 0) {
          setPlayingVideoId(null)
        }
        // 有些版本是 infoDelivery
        if (data.event === 'infoDelivery' && data.info?.playerState === 0) {
          setPlayingVideoId(null)
        }
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [playingVideoId])

  // ═══ 瀏覽器層鎖定（除了算對數學否則跳不出去） ═══
  useEffect(() => {
    if (!mounted || showGuide) return

    // 1. 攔截「上一頁」：塞一筆 history，popstate 時彈數學題並把 history 塞回去
    const lockState = { peekkidsLock: true }
    window.history.pushState(lockState, '', window.location.href)
    const onPopState = () => {
      window.history.pushState(lockState, '', window.location.href)
      setShowExitConfirm(true)
    }
    window.addEventListener('popstate', onPopState)

    // 2. 關分頁 / 重整 / 關瀏覽器：彈瀏覽器原生確認框
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return // 算對數學後放行
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    // 3. 封鎖右鍵、選字、拖曳（小孩亂搞的常見入口）
    const pd = (e: Event) => {
      // input / textarea 不擋（要留給算數學輸入）
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      e.preventDefault()
    }
    document.addEventListener('contextmenu', pd)
    document.addEventListener('selectstart', pd)
    document.addEventListener('dragstart', pd)

    // 4. 封鎖常見鍵盤捷徑
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const t = e.target as HTMLElement
      const inInput = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
      const combo =
        e.key === 'F5' ||
        e.key === 'F11' ||
        e.key === 'F12' ||
        (!inInput && e.key === 'Backspace') ||
        ((e.metaKey || e.ctrlKey) && ['r', 'w', 't', 'n', 'q', 'u', 's', 'p', 'l'].includes(k)) ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      if (combo) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)

    // 5. 監聽全螢幕狀態（方便 UI 判斷）
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)

    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('contextmenu', pd)
      document.removeEventListener('selectstart', pd)
      document.removeEventListener('dragstart', pd)
      window.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
  }, [mounted, showGuide])

  const removeMyChannel = (channelId: string) => {
    const next = removeUserChannel(channelId)
    setUserChannels(next)
  }

  const saveAge = (a: AgeGroup | 'all') => {
    setAge(a)
    localStorage.setItem(AGE_KEY, a)
  }

  // 合併官方精選 + 爸媽加入的，再依年齡篩
  const curated = filterChannelsByAge(age).map(curatedToDisplay)
  const mine = userChannels
    .filter(c => age === 'all' || c.ageGroup === age)
    .map(userToDisplay)

  const openChannel = async (ch: DisplayChannel) => {
    setSelectedChannel(ch)
    setVideos([])
    setPlayingVideoId(null)
    setLoadingVideos(true)
    try {
      const res = await fetch(`/api/safe-videos?channelId=${ch.channelId}`)
      const data = await res.json()
      if (data.videos) setVideos(data.videos)
    } catch {}
    setLoadingVideos(false)
  }

  if (!mounted) return null

  if (showGuide) {
    return (
      <LockScreenGuide onDone={() => {
        localStorage.setItem(LOCK_GUIDE_KEY, '1')
        setShowGuide(false)
      }} />
    )
  }

  // ── 播放器：全螢幕、無推薦、無側邊 ───────────────
  if (playingVideoId && selectedChannel) {
    return (
      <main style={{
        position: 'fixed', inset: 0,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}>
        <KidsTimer
          onTimeUp={() => setPlayingVideoId(null)}
          onExit={() => {
            allowLeaveRef.current = true
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            localStorage.removeItem('peekkids_timer_end_ts')
            window.location.href = '/'
          }}
        />
        {/* 頂部控制條 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
        }}>
          <button
            onClick={() => setPlayingVideoId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.15)',
              color: '#fff', border: 'none',
              padding: '8px 14px', borderRadius: 9999,
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            ← 回去選影片
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>安心播放中</span>
        </div>

        {/* 影片嵌入 — rel=0 關閉相關影片、modestbranding 隱藏 logo */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <iframe
            ref={iframeRef}
            onLoad={() => {
              // 告訴 iframe 開始送 state 事件給父視窗
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'listening' }),
                '*'
              )
            }}
            src={`https://www.youtube-nocookie.com/embed/${playingVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&playsinline=1&enablejsapi=1&controls=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      </main>
    )
  }

  // ── 頻道內影片清單 ────────────────────────────────
  if (selectedChannel) {
    return (
      <main style={{
        minHeight: '100dvh',
        padding: '20px 16px 40px',
        background: 'var(--paper-hex)',
      }}>
        <KidsTimer
          onTimeUp={() => setPlayingVideoId(null)}
          onExit={() => {
            allowLeaveRef.current = true
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            localStorage.removeItem('peekkids_timer_end_ts')
            window.location.href = '/'
          }}
        />
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <button
            onClick={() => setSelectedChannel(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', marginBottom: 18,
              borderRadius: 9999,
              background: 'var(--ink-05)', border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← 回到頻道列表
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div className="candy-bear" style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--honey-hex)',
              border: '2.5px solid var(--ink-hex)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>
              {selectedChannel.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: 28, fontWeight: 900, letterSpacing: '-0.045em',
                color: 'var(--ink-hex)', lineHeight: 1.08,
              }}>
                {selectedChannel.name}
              </h1>
              <p style={{
                fontSize: 14, color: 'var(--text-secondary)',
                letterSpacing: '-0.005em', marginTop: 6, fontWeight: 500, lineHeight: 1.55,
              }}>
                {selectedChannel.description}
              </p>
            </div>
          </div>

          {loadingVideos ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
              <div style={{ marginBottom: 12 }}>
                <Mascot pose="search" size={140} />
              </div>
              小析正在挑選安心影片⋯
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
              <div style={{ marginBottom: 12 }}>
                <Mascot pose="think" size={140} />
              </div>
              這個頻道暫時沒有通過篩選的影片
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
            }}>
              {videos.map(v => (
                <button
                  key={v.id}
                  onClick={() => setPlayingVideoId(v.id)}
                  className="bee-card"
                  style={{
                    textAlign: 'left',
                    padding: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', marginBottom: 10, background: 'var(--ink-05)', border: '2px solid var(--ink-hex)' }}>
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    {v.madeForKids && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'var(--risk-green)', color: '#fff',
                        padding: '4px 10px', borderRadius: 9999,
                        fontSize: 10, fontWeight: 900, letterSpacing: '0.02em',
                        border: '2px solid var(--ink-hex)',
                      }}>
                        ✓ 兒童認證
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 14, fontWeight: 800,
                    color: 'var(--ink-hex)', letterSpacing: '-0.02em',
                    lineHeight: 1.45,
                    padding: '0 4px 4px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {v.title}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── 首頁：頻道格 + 年齡篩選 ──────────────────────
  return (
    <main style={{
      minHeight: '100dvh',
      padding: '20px 16px 40px',
      background: 'var(--paper-hex)',
    }}>
      {/* ⏱ 計時／護眼守護 */}
      <KidsTimer
        onTimeUp={() => setPlayingVideoId(null)}
        onExit={() => {
          allowLeaveRef.current = true
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
          localStorage.removeItem('peekkids_timer_end_ts')
          window.location.href = '/'
        }}
      />

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* 頂部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mascot pose="hi" size={60} priority />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 3 }}>
                <span className="candy-logo">CareCub Kids · Bear Mode</span>
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.045em', color: 'var(--ink-hex)', lineHeight: 1.05 }}>
                熊熊守護模式
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* 統一 sticker 圖示鈕 — 厚實 ink offset shadow，跟首頁同一個語言 */}
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                aria-label="全螢幕鎖定"
                title="全螢幕（把網址列也鎖掉）"
                className="sticker-icon-btn sticker-pop"
                style={{ animationDelay: '0.05s' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('peekkids_timer_end_ts')
                window.location.reload()
              }}
              aria-label="重新設定時間"
              title="重新設定時間"
              className="sticker-icon-btn sticker-icon-btn--gold sticker-pop"
              style={{ animationDelay: '0.12s' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="12 7 12 12 15 14"/>
              </svg>
            </button>
            <button
              onClick={() => setShowGuide(true)}
              aria-label="鎖螢幕教學"
              title="看鎖螢幕教學"
              className="sticker-icon-btn sticker-pop"
              style={{ animationDelay: '0.19s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2"/>
                <path d="M8 11V7a4 4 0 018 0v4"/>
              </svg>
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              aria-label="離開"
              title="離開（找爸爸媽媽）"
              className="sticker-icon-btn sticker-icon-btn--danger sticker-pop"
              style={{ animationDelay: '0.26s' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 年齡選擇 — sticker 貼紙風，跟首頁同一個語言 */}
        <div className="sticker-tabs" style={{ marginBottom: 18 }}>
          {([
            ['0-3', '0–3 歲'],
            ['3-6', '3–6 歲'],
            ['all', '全部'],
          ] as const).map(([k, label], i) => (
            <button
              key={k}
              onClick={() => saveAge(k)}
              className={`sticker-tab sticker-pop${age === k ? ' is-active' : ''}`}
              style={{ animationDelay: `${0.06 * i}s` }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 第三層防護提示 */}
        <div className="bee-card-flat candy-shield" style={{
          background: '#DCEAD1',
          borderLeft: '8px solid var(--risk-green)',
          padding: '12px 16px',
          marginBottom: 22,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <p style={{ flex: 1, fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.55, fontWeight: 600 }}>
            三層防護：官方頻道 × <strong style={{ fontWeight: 900 }}>YouTube 兒童認證</strong> × 標題黑名單，6 歲內專用
          </p>
        </div>

        {curated.length > 0 && (
          <p style={{
            fontSize: 12, fontWeight: 900, color: 'var(--ink-hex)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12, opacity: 0.7,
          }}>
            ★ 官方精選 · 100% 驗證 ★
          </p>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: curated.length > 0 ? 32 : 0,
        }}>
          {curated.map((ch, idx) => (
            <button
              key={ch.channelId}
              onClick={() => openChannel(ch)}
              className="bee-card sticker-wobble sticker-pop"
              style={{
                padding: 16,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                animationDelay: `${0.05 + idx * 0.05}s`,
              }}
            >
              <div style={{
                width: 76, height: 76, margin: '0 auto 12px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
                border: '2.5px solid #2B1810',
                boxShadow: '0 8px 18px -8px rgba(43, 24, 16, 0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <Mascot pose={CHANNEL_POSES[idx % CHANNEL_POSES.length]} size={64} />
              </div>
              <p style={{
                fontSize: 14, fontWeight: 900,
                color: 'var(--ink-hex)', letterSpacing: '-0.03em',
                marginBottom: 4, lineHeight: 1.2,
              }}>
                {ch.name}
              </p>
              <p style={{
                fontSize: 11, color: 'var(--text-secondary)',
                letterSpacing: '-0.005em', lineHeight: 1.45, fontWeight: 600,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {ch.description}
              </p>
              <div style={{
                marginTop: 10,
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 9999,
                background: 'rgba(242, 184, 75, 0.22)',
                border: '1px solid rgba(242, 184, 75, 0.55)',
                fontSize: 10, fontWeight: 900, letterSpacing: '0.04em',
                color: '#F2B84B',
              }}>
                {ch.ageGroups.join(' · ')} 歲
              </div>
            </button>
          ))}
        </div>

        {/* 爸媽加入的 */}
        {mine.length > 0 && (
          <>
            <p style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              ★ 爸媽自己加的 ★
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}>
              {mine.map(ch => (
                <div
                  key={ch.channelId}
                  className="bee-card-flat"
                  style={{
                    position: 'relative',
                    padding: 16,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`移除「${ch.name}」？`)) removeMyChannel(ch.channelId)
                    }}
                    aria-label="移除"
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 26, height: 26,
                      borderRadius: '50%',
                      background: 'var(--card-hex)',
                      border: '2px solid var(--ink-hex)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12, color: 'var(--ink-hex)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, fontWeight: 900,
                    }}
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => openChannel(ch)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                    }}
                  >
                    <div style={{
                      width: 76, height: 76, margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
                      border: '2.5px solid #2B1810',
                      boxShadow: '0 8px 18px -8px rgba(43, 24, 16, 0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      <Mascot pose={mascotForChannel(ch.channelId)} size={64} />
                    </div>
                    <p style={{
                      fontSize: 14, fontWeight: 900,
                      color: 'var(--ink-hex)', letterSpacing: '-0.03em',
                      marginBottom: 5, lineHeight: 1.2,
                    }}>
                      {ch.name}
                    </p>
                    <p style={{
                      fontSize: 11, color: 'var(--text-secondary)',
                      letterSpacing: '-0.005em', lineHeight: 1.5, fontWeight: 500,
                    }}>
                      {ch.description}
                    </p>
                    <div style={{
                      marginTop: 10,
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 9999,
                      background: 'rgba(242, 184, 75, 0.22)',
                      border: '1px solid rgba(242, 184, 75, 0.55)',
                      fontSize: 10, fontWeight: 900, letterSpacing: '0.04em',
                      color: '#F2B84B',
                    }}>
                      {ch.ageGroups.join(' · ')} 歲
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {curated.length === 0 && mine.length === 0 && (
          <div className="bee-card" style={{
            padding: '28px 24px',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: 12 }}>
              <Mascot pose="guard" size={160} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              目前沒有已驗證的頻道
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.6 }}>
              回 CareCub Kids 首頁掃描你想給小孩看的頻道，<br />
              非高風險就能點「加入熊熊守護模式」
            </p>
            <a href="/" style={{
              display: 'inline-block', marginTop: 14,
              padding: '10px 20px', borderRadius: 9999,
              background: 'var(--ink-hex)', color: '#fff',
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
            }}>
              回首頁掃描
            </a>
          </div>
        )}

        <p style={{
          textAlign: 'center', marginTop: 28,
          fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', lineHeight: 1.5,
        }}>
          想加入其他頻道？回到 CareCub Kids 首頁掃描驗證後加入<br />
          所有頻道持續追蹤中，發現問題會立即下架
        </p>
      </div>

      {/* 找爸爸媽媽對話 — 大人解簡單算式才能離開（深底硬編色，不被 candy 主題覆蓋） */}
      {showExitConfirm && (
        <div
          onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15, 36, 68, 0.78)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(160deg, #1E3A5F 0%, #0F2444 100%)',
              borderRadius: 28, padding: '28px 24px',
              maxWidth: 380, width: '100%',
              textAlign: 'center',
              boxShadow: '0 28px 56px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(242, 184, 75, 0.4)',
            }}
          >
            {/* 警示頭 */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 9999,
              background: 'rgba(194, 65, 59, 0.22)',
              border: '1px solid rgba(194, 65, 59, 0.55)',
              fontSize: 10, fontWeight: 900, letterSpacing: '0.18em',
              color: '#FFB1AB', textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              ⚠ PARENT ONLY
            </div>
            <h3 style={{
              fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em',
              color: '#FFFFFF', marginBottom: 6,
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}>
              大人才能離開
            </h3>
            <p style={{
              fontSize: 13, color: 'rgba(255, 246, 230, 0.82)',
              letterSpacing: '-0.01em', lineHeight: 1.55, marginBottom: 20,
            }}>
              小朋友請去找爸爸媽媽<br />答對下面這題就會回首頁
            </p>

            {/* 算式 — 大字、清晰 */}
            <div style={{
              padding: '20px 16px 18px',
              marginBottom: exitError ? 8 : 16,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1.5px solid rgba(242, 184, 75, 0.42)',
              borderRadius: 20,
            }}>
              <div style={{
                fontSize: 40, fontWeight: 900,
                color: '#F2B84B',
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                letterSpacing: '0.02em',
                marginBottom: 12,
                textShadow: '0 2px 16px rgba(242, 184, 75, 0.3)',
              }}>
                {exitMath.a} + {exitMath.b} = ?
              </div>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={exitInput}
                onChange={e => { setExitInput(e.target.value); setExitError(false) }}
                onKeyDown={e => e.key === 'Enter' && tryExit()}
                placeholder="輸入答案"
                style={{
                  width: '100%', padding: '14px 16px',
                  fontSize: 28, fontWeight: 900,
                  textAlign: 'center',
                  border: `2px solid ${exitError ? '#FF6B5C' : '#F2B84B'}`,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  color: '#0F2444',
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  letterSpacing: '0.04em',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield',
                }}
              />
            </div>

            {exitError && (
              <p style={{
                fontSize: 13, color: '#FFB1AB',
                fontWeight: 800, letterSpacing: '-0.01em',
                marginBottom: 14,
              }}>
                ✗ 答錯了，再算一次
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
                style={{
                  flex: 1, padding: '14px 8px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  cursor: 'pointer',
                  fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                }}
              >
                繼續看影片
              </button>
              <button
                onClick={tryExit}
                disabled={!exitInput}
                style={{
                  flex: 1, padding: '14px 8px',
                  borderRadius: 16,
                  background: exitInput
                    ? 'linear-gradient(135deg, #F2B84B 0%, #D99422 100%)'
                    : 'rgba(255,255,255,0.08)',
                  color: exitInput ? '#0F2444' : 'rgba(255,255,255,0.38)',
                  border: '1.5px solid ' + (exitInput ? '#F2B84B' : 'rgba(255,255,255,0.15)'),
                  cursor: exitInput ? 'pointer' : 'not-allowed',
                  fontSize: 14, fontWeight: 900, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                  boxShadow: exitInput ? '0 6px 18px -6px rgba(242, 184, 75, 0.5)' : 'none',
                }}
              >
                離開安心模式
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

