'use client'

import { useEffect, useRef, useState } from 'react'
import { CuratedChannel, AgeGroup, filterChannelsByAge } from '@/lib/curated-channels'
import { getUserChannels, removeUserChannel, UserChannel } from '@/lib/user-channels'
import LockScreenGuide from '@/components/LockScreenGuide'
import KidsTimer from '@/components/KidsTimer'

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
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    } catch {}
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
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontSize: 14 }}>
              正在挑選安心影片…
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontSize: 14 }}>
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
            <div className="candy-bear" style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--honey-hex)',
              border: '2.5px solid var(--ink-hex)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
              boxShadow: '0 3px 10px rgba(43,24,16,0.22)',
            }}>🐻</div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 3 }}>
                <span className="candy-logo">CareCub Kids · Bear Mode</span>
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.045em', color: 'var(--ink-hex)', lineHeight: 1.05 }}>
                熊熊守護模式
              </h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                aria-label="進入全螢幕鎖定"
                title="進入全螢幕（把網址列也鎖掉）"
                className="candy-chip"
                style={{
                  padding: '8px 12px',
                  borderRadius: 9999,
                  background: 'var(--ink-hex)', border: '1px solid var(--ink-hex)',
                  color: '#fff',
                  fontSize: 12, fontWeight: 800, letterSpacing: '-0.01em',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🔳 全螢幕鎖
              </button>
            )}
            <button
              onClick={() => {
                // 清掉 end_ts 讓 KidsTimer 重跳設定
                localStorage.removeItem('peekkids_timer_end_ts')
                window.location.reload()
              }}
              aria-label="重設時間"
              title="重設時間"
              className="candy-chip candy-chip--primary"
              style={{
                padding: '8px 12px',
                borderRadius: 9999,
                background: 'var(--honey-hex)', border: '2px solid var(--ink-hex)',
                color: 'var(--ink-hex)',
                fontSize: 12, fontWeight: 900, letterSpacing: '-0.01em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ⏱️ 時間
            </button>
            <button
              onClick={() => setShowGuide(true)}
              aria-label="重看鎖螢幕教學"
              title="重看鎖螢幕教學"
              className="candy-chip"
              style={{
                padding: '8px 12px',
                borderRadius: 9999,
                background: 'transparent', border: '1px solid var(--border-soft)',
                color: 'var(--text-secondary)',
                fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🔒 鎖螢幕
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              aria-label="找爸爸媽媽"
              className="candy-chip"
              style={{
                padding: '8px 14px',
                borderRadius: 9999,
                background: 'var(--ink-05)', border: '1px solid var(--border-soft)',
                color: 'var(--text-secondary)',
                fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              找爸爸媽媽
            </button>
          </div>
        </div>

        {/* 年齡選擇（只影響顯示的頻道） */}
        <div className="bee-segmented" style={{ marginBottom: 18, gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {([
            ['0-3', '0–3 歲'],
            ['3-6', '3–6 歲'],
            ['all', '全部'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => saveAge(k)}
              className={`bee-segmented__item${age === k ? ' bee-segmented__item--active' : ''}`}
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
          {curated.map(ch => (
            <button
              key={ch.channelId}
              onClick={() => openChannel(ch)}
              className="bee-card"
              style={{
                padding: 16,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            >
              <div className="candy-bear" style={{
                width: 72, height: 72, margin: '0 auto 12px',
                borderRadius: '50%',
                background: 'var(--honey-hex)',
                border: '2.5px solid var(--ink-hex)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34,
              }}>{ch.emoji}</div>
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
                padding: '3px 10px',
                borderRadius: 9999,
                background: 'var(--ink-hex)',
                fontSize: 10, fontWeight: 900, letterSpacing: '0.04em',
                color: 'var(--honey-hex)',
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
                      width: 72, height: 72, margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: 'var(--honey-hex)',
                      border: '2.5px solid var(--ink-hex)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 34,
                    }}>{ch.emoji}</div>
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
                      background: 'var(--ink-hex)',
                      fontSize: 10, fontWeight: 900, letterSpacing: '0.04em',
                      color: 'var(--honey-hex)',
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
          <div style={{
            padding: 32, textAlign: 'center',
            background: 'var(--card-hex, #FBF7EA)',
            border: '1px dashed var(--border-soft)',
            borderRadius: 20,
          }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🛡️</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
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

      {/* 找爸爸媽媽對話 — 需要大人解簡單算式才能離開（小孩沒那麼快） */}
      {showExitConfirm && (
        <div
          onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: 24, padding: 28, maxWidth: 360, width: '100%',
              textAlign: 'center', boxShadow: '0 28px 56px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 10 }}>👋</div>
            <h3 style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 6 }}>
              大人才能離開
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5, marginBottom: 16 }}>
              算一下下面這題，答對就回首頁
            </p>

            {/* 算式 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginBottom: 14,
              padding: '14px 18px',
              background: 'var(--paper-hex)',
              border: '1px solid var(--border-soft)',
              borderRadius: 16,
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)', fontFamily: 'ui-monospace, "SF Mono", monospace' }}>
                {exitMath.a} + {exitMath.b} =
              </span>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={exitInput}
                onChange={e => { setExitInput(e.target.value); setExitError(false) }}
                onKeyDown={e => e.key === 'Enter' && tryExit()}
                placeholder="?"
                style={{
                  width: 70, padding: '8px 0',
                  fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em',
                  textAlign: 'center',
                  border: `2px solid ${exitError ? 'var(--risk-red)' : 'var(--border-soft)'}`,
                  borderRadius: 12,
                  background: '#fff',
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            {exitError && (
              <p style={{ fontSize: 12, color: 'var(--risk-red)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 10 }}>
                答錯了，再試一次
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
                style={{
                  flex: 1, padding: 12,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--ink-05)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-soft)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                }}
              >
                繼續看影片
              </button>
              <button
                onClick={tryExit}
                disabled={!exitInput}
                style={{
                  flex: 1, padding: 12,
                  borderRadius: 'var(--radius-lg)',
                  background: exitInput ? 'var(--ink-hex)' : 'var(--ink-20)',
                  color: '#fff',
                  border: 'none',
                  cursor: exitInput ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                }}
              >
                離開安心模式
              </button>
            </div>

            <p style={{ marginTop: 14, fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
              若已用引導使用模式 / 螢幕釘選鎖住畫面，<br />
              離開還需要輸入平板密碼或同時按返回+概覽鍵
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

