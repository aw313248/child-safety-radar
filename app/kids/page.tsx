'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { CuratedChannel, AgeGroup, filterChannelsByAge } from '@/lib/curated-channels'
import { getUserChannels, removeUserChannel, UserChannel } from '@/lib/user-channels'
import KidsTimer from '@/components/KidsTimer'
import Mascot, { MascotPose } from '@/components/Mascot'

const LockScreenGuide = dynamic(() => import('@/components/LockScreenGuide'), { ssr: false })

const CHANNEL_POSES: MascotPose[] = ['hi', 'thumbs-up', 'fly', 'search', 'guard', 'think']
function mascotForChannel(id: string): MascotPose {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CHANNEL_POSES[h % CHANNEL_POSES.length]
}

type DisplayChannel = {
  channelId: string
  name: string
  description: string
  pose: MascotPose
  ageGroups: AgeGroup[]
  source: 'curated' | 'user'
}

function curatedToDisplay(c: CuratedChannel): DisplayChannel {
  return { channelId: c.channelId, name: c.name, description: c.description, pose: mascotForChannel(c.channelId), ageGroups: c.ageGroups, source: 'curated' }
}
function userToDisplay(c: UserChannel): DisplayChannel {
  // 優先用 user 自選的 mascotPose，舊資料 fallback 用 channelId 算 hash pose
  const pose = (c.mascotPose as MascotPose | undefined) ?? mascotForChannel(c.channelId)
  return { channelId: c.channelId, name: c.name, description: '爸媽自己加的頻道', pose, ageGroups: [c.ageGroup], source: 'user' }
}

const LOCK_GUIDE_KEY = 'peekkids_lock_guide_seen'

interface SafeVideo {
  id: string
  title: string
  thumbnail: string
  madeForKids: boolean
}

export default function KidsModePage() {
  const [mounted, setMounted] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [userChannels, setUserChannels] = useState<UserChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<DisplayChannel | null>(null)
  const [videos, setVideos] = useState<SafeVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [exitMath] = useState(() => {
    const a = 6 + Math.floor(Math.random() * 6)
    const b = 7 + Math.floor(Math.random() * 6)
    return { a, b, answer: a + b }
  })
  const [exitInput, setExitInput] = useState('')
  const [exitError, setExitError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const allowLeaveRef = useRef(false)

  const tryExit = () => {
    if (parseInt(exitInput, 10) === exitMath.answer) {
      allowLeaveRef.current = true
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      window.location.href = '/'
    } else {
      setExitError(true)
      setTimeout(() => setExitError(false), 900)
    }
  }

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
      const ua = navigator.userAgent
      const isiOS = /ipad|iphone|ipod/i.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
      if (isiOS || (!el.requestFullscreen && !el.webkitRequestFullscreen)) { setShowGuide(true); return }
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    } catch { setShowGuide(true) }
  }

  useEffect(() => {
    setMounted(true)
    setShowGuide(localStorage.getItem(LOCK_GUIDE_KEY) !== '1')
    setUserChannels(getUserChannels())
  }, [])

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  useEffect(() => {
    if (!playingVideoId) return
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'onStateChange' && data.info === 0) setPlayingVideoId(null)
        if (data.event === 'infoDelivery' && data.info?.playerState === 0) setPlayingVideoId(null)
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [playingVideoId])

  useEffect(() => {
    if (!mounted || showGuide) return
    const lockState = { peekkidsLock: true }
    window.history.pushState(lockState, '', window.location.href)
    const onPopState = () => { window.history.pushState(lockState, '', window.location.href); setShowExitConfirm(true) }
    window.addEventListener('popstate', onPopState)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return
      e.preventDefault(); e.returnValue = ''; return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    const pd = (e: Event) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      e.preventDefault()
    }
    document.addEventListener('contextmenu', pd)
    document.addEventListener('selectstart', pd)
    document.addEventListener('dragstart', pd)
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const t = e.target as HTMLElement
      const inInput = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')
      const combo =
        e.key === 'F5' || e.key === 'F11' || e.key === 'F12' ||
        (!inInput && e.key === 'Backspace') ||
        ((e.metaKey || e.ctrlKey) && ['r', 'w', 't', 'n', 'q', 'u', 's', 'p', 'l'].includes(k)) ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
      if (combo) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('keydown', onKeyDown, true)
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

  // 年齡 filter 拿掉（沒鑑別度），全部秀出來
  const curated = filterChannelsByAge('all').map(curatedToDisplay)
  const mine = userChannels.map(userToDisplay)

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

  // ── 播放器：全黑、無推薦 ──────────────────────────
  if (playingVideoId && selectedChannel) {
    return (
      <main style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
        <KidsTimer
          onTimeUp={() => setPlayingVideoId(null)}
          onExit={() => {
            allowLeaveRef.current = true
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            localStorage.removeItem('peekkids_timer_end_ts')
            window.location.href = '/'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.85)', color: '#fff' }}>
          <button onClick={() => setPlayingVideoId(null)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: 9999,
            cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          }}>
            ← 回去選影片
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>安心播放中</span>
        </div>
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <iframe
            ref={iframeRef}
            onLoad={() => { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*') }}
            // fs=0 鎖全螢幕鈕、disablekb=1 鎖鍵盤捷徑、modestbranding=1 + rel=0 + iv_load_policy=3 藏 YouTube branding 跟外連
            src={`https://www.youtube-nocookie.com/embed/${playingVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&playsinline=1&enablejsapi=1&controls=1&disablekb=1&showinfo=0`}
            // 拿掉 fullscreen 權限，allow 也對應砍掉
            allow="autoplay; encrypted-media"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
          {/*
            鎖跳出 YouTube：iframe 內建的「更多影片」、「YouTube logo」、
            「share」、「全螢幕」按鈕都會把小孩帶離 — 加 4 個透明 overlay
            蓋住右下/右上角 + 影片左上的標題鏈結
            中央 click-through 維持暫停 / 播放正常
          */}
          {/* 右下：YouTube logo + 更多影片 + share */}
          <div aria-hidden style={{
            position: 'absolute', right: 0, bottom: 0,
            width: 220, height: 56,
            zIndex: 5,
            background: 'transparent',
            cursor: 'not-allowed',
          }} onClick={e => { e.preventDefault(); e.stopPropagation() }} />
          {/* 右上：影片標題鏈結（pause 時會出現「在 YouTube 上看」） */}
          <div aria-hidden style={{
            position: 'absolute', right: 0, top: 0,
            width: 80, height: 56,
            zIndex: 5,
            background: 'transparent',
            cursor: 'not-allowed',
          }} onClick={e => { e.preventDefault(); e.stopPropagation() }} />
          {/* 左上：影片標題（pause 時 click 會跳 YouTube watch page） */}
          <div aria-hidden style={{
            position: 'absolute', left: 0, top: 0,
            width: 'calc(100% - 80px)', height: 56,
            zIndex: 5,
            background: 'transparent',
            cursor: 'not-allowed',
          }} onClick={e => { e.preventDefault(); e.stopPropagation() }} />
        </div>
      </main>
    )
  }

  // ── 頻道影片清單 ──────────────────────────────────
  if (selectedChannel) {
    return (
      <main className="page-main">
        <KidsTimer
          onTimeUp={() => setPlayingVideoId(null)}
          onExit={() => {
            allowLeaveRef.current = true
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
            localStorage.removeItem('peekkids_timer_end_ts')
            window.location.href = '/'
          }}
        />
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 40px', position: 'relative', zIndex: 1 }}>

          <button onClick={() => setSelectedChannel(null)} className="glass-back-btn" style={{ marginBottom: 18 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            回到頻道列表
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
              border: '2.5px solid var(--ink-hex)',
              boxShadow: '0 8px 24px -8px rgba(43, 24, 16, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <Mascot pose={selectedChannel.pose} size={60} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.045em', color: 'var(--ink-hex)', lineHeight: 1.08 }}>
                {selectedChannel.name}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', letterSpacing: '-0.005em', marginTop: 6, fontWeight: 500, lineHeight: 1.55 }}>
                {selectedChannel.description}
              </p>
            </div>
          </div>

          {loadingVideos ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
              <div style={{ marginBottom: 12 }}><Mascot pose="search" size={140} /></div>
              小析正在挑選安心影片⋯
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600 }}>
              <div style={{ marginBottom: 12 }}><Mascot pose="think" size={140} /></div>
              這個頻道暫時沒有通過篩選的影片
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {videos.map(v => (
                <button key={v.id} onClick={() => setPlayingVideoId(v.id)}
                  className="bee-card sticker-wobble"
                  style={{ textAlign: 'left', padding: 10, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                  <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 14, overflow: 'hidden', marginBottom: 10, background: 'var(--ink-05)', border: '2px solid var(--ink-hex)' }}>
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                    {v.madeForKids && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'var(--risk-green)', color: '#fff',
                        padding: '4px 10px', borderRadius: 9999,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
                        border: '1.5px solid var(--ink-hex)',
                      }}>
                        ✓ 兒童認證
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 14, fontWeight: 800, color: 'var(--ink-hex)',
                    letterSpacing: '-0.02em', lineHeight: 1.45,
                    padding: '0 4px 4px',
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
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

  // ── 主畫面：頻道格 ────────────────────────────────
  return (
    <main className="page-main">

      {/* 背景裝飾吉祥物 */}
      <div aria-hidden style={{ position: 'fixed', right: -80, top: 80, opacity: 0.06, pointerEvents: 'none', zIndex: 0, transform: 'rotate(8deg)' }}>
        <Mascot pose="guard" size={300} priority />
      </div>
      <div aria-hidden style={{ position: 'fixed', left: -60, bottom: 60, opacity: 0.05, pointerEvents: 'none', zIndex: 0, transform: 'rotate(-10deg)' }}>
        <Mascot pose="fly" size={200} />
      </div>

      <KidsTimer
        onTimeUp={() => setPlayingVideoId(null)}
        onExit={() => {
          allowLeaveRef.current = true
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
          localStorage.removeItem('peekkids_timer_end_ts')
          window.location.href = '/'
        }}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 48px', position: 'relative', zIndex: 1 }}>

        {/* ── Nav ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Mascot pose="hi" size={52} priority />
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                CareCub · Bear Mode
              </p>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.045em', color: 'var(--ink-hex)', lineHeight: 1 }}>
                熊熊守護模式
              </h1>
            </div>
          </div>
          {/*
            使用模式推演（爸媽常用順序）：
            1. 進來 → 鎖定（每次必用）→ 主鈕，蜂蜜金 emphasis + 「鎖定」label
            2. 看時間 / 改設定（中段常用）→ 次鈕
            3. 結束 → 回首頁（需要爸媽算數學）→ 危險色明顯區隔
            4. 第一次教學：拿掉，改用 LOCK_GUIDE_KEY 自動首次秀（不佔 nav）
            每顆 icon + 文字 caption 並列，不再純圖示
          */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                aria-label="鎖定畫面"
                title="把網址列也鎖掉，小孩跳不出去"
                className="kids-action kids-action--primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2"/>
                  <path d="M8 11V7a4 4 0 018 0v4"/>
                </svg>
                <span>鎖定</span>
              </button>
            )}
            <button
              onClick={() => { localStorage.removeItem('peekkids_timer_end_ts'); window.location.reload() }}
              aria-label="改時間"
              title="重新設定看多久"
              className="kids-action"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
              </svg>
              <span>時間</span>
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              aria-label="回首頁"
              title="回首頁（需要爸媽算數學）"
              className="kids-action kids-action--danger"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10"/>
              </svg>
              <span>回家</span>
            </button>
          </div>
        </div>

        {/*
          年齡 tabs 拿掉：5 個官方頻道全部都標記 0-3 + 3-6 雙年齡，
          filter 結果完全相同 → 沒鑑別度的 UI 就不要假裝有
          客製化由「掃完 → 加入熊熊守護模式」承擔（爸媽自己選年齡）
        */}

        {/* ── 三層防護提示（同首頁奶油卡風） ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22,
          padding: '12px 16px',
          background: '#FBF7EA',
          border: '2px solid var(--ink-hex)',
          borderRadius: 16,
          boxShadow: '3px 3px 0 var(--ink-hex)',
        }}>
          <span style={{ fontSize: 18 }}>🛡️</span>
          <p style={{ flex: 1, fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.55, fontWeight: 500 }}>
            三層防護：官方頻道 × <strong style={{ fontWeight: 700 }}>YouTube 兒童認證</strong> × 標題黑名單，6 歲內專用
          </p>
        </div>

        {/* ── 官方精選 — 用首頁那種黃底線高亮 h2 ── */}
        {curated.length > 0 && (
          <h2 style={{
            display: 'inline-block',
            position: 'relative',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.045em',
            color: 'var(--ink-hex)',
            margin: '0 0 14px',
            paddingLeft: 4,
            lineHeight: 1,
          }}>
            精選頻道
            <span style={{
              position: 'absolute',
              bottom: -3, left: 4, right: 4,
              height: 7,
              background: 'var(--honey-hex)',
              zIndex: -1,
              borderRadius: 3,
            }} />
          </h2>
        )}
        {curated.length > 0 && (
          <p style={{
            fontSize: 12, color: 'rgba(43,24,16,0.6)',
            letterSpacing: '-0.005em', fontWeight: 500,
            marginTop: -8, marginBottom: 14, paddingLeft: 4,
          }}>
            人工驗證 6 歲內安心看，想加自己的頻道請從首頁掃描後加入
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
                padding: '20px 14px 16px', cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'center', width: '100%',
                animationDelay: `${0.05 + idx * 0.05}s`,
              }}
            >
              {/* 頭像放大：76 → 92px，視覺主角 */}
              <div style={{
                width: 92, height: 92, margin: '0 auto 12px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
                border: '2.5px solid var(--ink-hex)',
                boxShadow: '0 10px 22px -10px rgba(43, 24, 16, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <Mascot pose={ch.pose} size={78} />
              </div>
              {/* 標題清楚：15 / 800，字距收緊 */}
              <p style={{
                fontSize: 15, fontWeight: 800, color: 'var(--ink-hex)',
                letterSpacing: '-0.03em', lineHeight: 1.2,
              }}>
                {ch.name}
              </p>
              {/* 描述跟年齡 chip 拿掉 — 點進去看詳情 */}
            </button>
          ))}
        </div>

        {/* ── 爸媽加入的 — 跟首頁同套 h2 ── */}
        {mine.length > 0 && (
          <>
            <h2 style={{
              display: 'inline-block', position: 'relative',
              fontSize: 22, fontWeight: 800, letterSpacing: '-0.045em',
              color: 'var(--ink-hex)', margin: '0 0 14px', paddingLeft: 4, lineHeight: 1,
            }}>
              爸媽加的
              <span style={{
                position: 'absolute', bottom: -3, left: 4, right: 4,
                height: 7, background: 'var(--honey-hex)', zIndex: -1, borderRadius: 3,
              }} />
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {mine.map(ch => (
                <div key={ch.channelId} className="bee-card" style={{ position: 'relative', padding: '20px 14px 16px', textAlign: 'center' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`移除「${ch.name}」？`)) removeMyChannel(ch.channelId) }}
                    aria-label="移除"
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.6)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(43,24,16,0.18)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12, color: 'var(--ink-hex)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                  <button onClick={() => openChannel(ch)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    <div style={{
                      width: 92, height: 92, margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
                      border: '2.5px solid var(--ink-hex)',
                      boxShadow: '0 10px 22px -10px rgba(43, 24, 16, 0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      <Mascot pose={ch.pose} size={78} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                      {ch.name}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {curated.length === 0 && mine.length === 0 && (
          <div className="bee-card" style={{ padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ marginBottom: 12 }}>
              <Mascot pose="guard" size={160} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              目前沒有已驗證的頻道
            </p>
            <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.7)', letterSpacing: '-0.01em', lineHeight: 1.6, fontWeight: 500 }}>
              回 CareCub Kids 首頁掃描你想給小孩看的頻道，<br />
              非高風險就能點「加入熊熊守護模式」
            </p>
            <a href="/" className="btn-pill btn-pill-honey" style={{ marginTop: 14, textDecoration: 'none' }}>
              回首頁掃描
            </a>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
          想加入其他頻道？回到 CareCub Kids 首頁掃描驗證後加入<br />
          所有頻道持續追蹤中，發現問題會立即下架
        </p>
      </div>

      {/* ── 退出確認 — 改回 storybook 暖色 + Apple liquid glass，跟 KidsTimer 同套 ── */}
      {showExitConfirm && (
        <div
          onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(43, 24, 16, 0.45)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(255, 246, 230, 0.72)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid rgba(255, 255, 255, 0.55)',
              borderRadius: 28, padding: '28px 24px',
              maxWidth: 380, width: '100%',
              textAlign: 'center',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.7),' +
                ' inset 0 -1px 0 rgba(43,24,16,0.06),' +
                ' 0 30px 60px -20px rgba(43,24,16,0.30)',
            }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 9999,
              background: 'rgba(194, 65, 59, 0.14)', border: '1px solid rgba(194, 65, 59, 0.42)',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.18em',
              color: 'var(--cc-red-deep)', textTransform: 'uppercase', marginBottom: 14,
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              PARENT ONLY
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink-hex)', marginBottom: 6 }}>
              大人才能離開
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(43,24,16,0.66)', letterSpacing: '-0.01em', lineHeight: 1.55, marginBottom: 20, fontWeight: 500 }}>
              小朋友請去找爸爸媽媽<br />答對下面這題就會回首頁
            </p>

            <div style={{
              padding: '20px 16px 16px', marginBottom: exitError ? 8 : 16,
              background: 'rgba(255, 255, 255, 0.45)',
              backdropFilter: 'blur(18px) saturate(150%)',
              WebkitBackdropFilter: 'blur(18px) saturate(150%)',
              border: '1px solid rgba(255, 255, 255, 0.55)',
              borderRadius: 20,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
            }}>
              <div style={{
                fontSize: 36, fontWeight: 800, color: 'var(--ink-hex)',
                fontFamily: 'ui-monospace, "SF Mono", monospace',
                letterSpacing: '0.02em', marginBottom: 12,
              }}>
                {exitMath.a} + {exitMath.b} = ?
              </div>
              <input
                type="number" inputMode="numeric" autoFocus
                value={exitInput}
                onChange={e => { setExitInput(e.target.value); setExitError(false) }}
                onKeyDown={e => e.key === 'Enter' && tryExit()}
                placeholder="輸入答案"
                className="strong-placeholder"
                style={{
                  width: '100%', padding: '14px 16px',
                  fontSize: 26, fontWeight: 800, textAlign: 'center',
                  border: `2px solid ${exitError ? 'var(--terra-hex)' : 'var(--cc-gold-deep)'}`,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: 'var(--ink-hex)',
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  letterSpacing: '0.04em', outline: 'none',
                  WebkitAppearance: 'none', MozAppearance: 'textfield',
                }}
              />
            </div>

            {exitError && (
              <p style={{ fontSize: 13, color: 'var(--terra-hex)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                答錯了，再算一次
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  color: 'var(--ink-hex)',
                  border: '1px solid rgba(43,24,16,0.18)',
                  cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'inherit',
                }}
              >
                繼續看影片
              </button>
              <button
                onClick={tryExit}
                disabled={!exitInput}
                style={{
                  flex: 1, padding: '14px 8px', borderRadius: 14,
                  background: exitInput
                    ? 'linear-gradient(135deg, #F2B84B 0%, #D99422 100%)'
                    : 'rgba(43,24,16,0.06)',
                  color: exitInput ? 'var(--ink-hex)' : 'rgba(43,24,16,0.38)',
                  border: exitInput ? '1px solid var(--cc-gold-deep)' : '1px solid rgba(43,24,16,0.12)',
                  cursor: exitInput ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em', fontFamily: 'inherit',
                  boxShadow: exitInput ? 'inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 14px rgba(242,184,75,0.35)' : 'none',
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
