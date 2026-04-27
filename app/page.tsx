'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ResultCard from '@/components/ResultCard'
import Mascot from '@/components/Mascot'
import ScanningStages from '@/components/ScanningStages'
import RecentHighRisk from '@/components/RecentHighRisk'
import SocialProof from '@/components/SocialProof'
import LoadingFacts from '@/components/LoadingFacts'
import { AnalysisResult } from '@/types/analysis'

const UnlockModal = dynamic(() => import('@/components/UnlockModal'), { ssr: false })
const CaseLibrary = dynamic(() => import('@/components/CaseLibrary'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      載入案例…
    </div>
  ),
})

const FREE_SCANS = 2
const STORAGE_KEY  = 'child_radar_unlocked'
const SCAN_COUNT_KEY = 'child_radar_scan_count'
const HISTORY_KEY  = 'child_radar_history'
const MAX_HISTORY  = 30

// 動態 placeholder：四個爸媽常掃的範例頻道，輪播告訴使用者可以丟什麼進來
const PLACEHOLDERS = [
  'youtube.com/@cocomelon',
  'youtube.com/@PinkfongBabyShark',
  'youtube.com/@SuperSimpleSongs',
  'youtube.com/@ChuChuTV',
]

export default function Home() {
  const [url, setUrl]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [progressText, setProgressText] = useState('')
  const [result, setResult]       = useState<AnalysisResult | null>(null)
  const [error, setError]         = useState('')
  const [unlocked, setUnlocked]   = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [showUnlock, setShowUnlock] = useState(false)
  // 動態 placeholder：每 3.5s 換一個範例頻道，告訴使用者可以丟什麼進來
  const [phIdx, setPhIdx] = useState(0)
  // confetti：result 出現的瞬間放一次 0.6s 蜂蜜金小點
  const [confetti, setConfetti] = useState(false)

  // 動態 placeholder 輪播
  useEffect(() => {
    if (url || loading) return // 使用者已輸入或掃描中就停
    const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 3500)
    return () => clearInterval(id)
  }, [url, loading])

  // 結果出現觸發 confetti
  useEffect(() => {
    if (result) {
      setConfetti(true)
      const id = setTimeout(() => setConfetti(false), 700)
      return () => clearTimeout(id)
    }
  }, [result])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    // 1. 觀察當下 DOM 上所有 .reveal-up
    document.querySelectorAll<HTMLElement>('.reveal-up:not(.is-visible)').forEach(el => io.observe(el))

    // 2. MutationObserver 兜底：之後動態加入的 .reveal-up 自動 observe
    //    （SocialProof / CaseLibrary 等 fetch 完才渲染的元件）
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return
          if (node.classList?.contains('reveal-up') && !node.classList.contains('is-visible')) {
            io.observe(node)
          }
          node.querySelectorAll?.<HTMLElement>('.reveal-up:not(.is-visible)').forEach(el => io.observe(el))
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
  }, [])

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === 'true')
    setScanCount(parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10))
    try {
      const params = new URLSearchParams(window.location.search)
      const u = params.get('u')
      if (u) {
        setUrl(u)
        // 從「最近標記的」/「歷史」點進來：先查 localStorage 是否有過去的分析結果
        // 有的話直接顯示，不要重新觸發掃描（避免閃跳 / 浪費 API quota / 違反期待）
        try {
          const raw = localStorage.getItem(HISTORY_KEY)
          const history: AnalysisResult[] = raw ? JSON.parse(raw) : []
          const cached = history.find(h => h.channelUrl === u)
          if (cached) {
            setResult(cached)
            // 把 query string 清掉，避免重整 / 分享連結時又觸發
            window.history.replaceState({}, '', '/')
          }
        } catch {}
      }
      if (params.get('unlock') === '1') {
        localStorage.setItem(STORAGE_KEY, 'true')
        setUnlocked(true)
      }
    } catch {}
  }, [])

  const handleAnalyze = async () => {
    const trimmed = url.trim()
    if (!trimmed) return

    // Harden: URL 格式驗證 — 接受 youtube.com / youtu.be / @handle
    const looksLikeYouTube = /youtube\.com|youtu\.be|^@[\w.-]+$|^https?:\/\//.test(trimmed)
                            || /^[a-zA-Z0-9_-]{4,}$/.test(trimmed)
    if (!looksLikeYouTube) {
      setError('看起來不太像 YouTube 網址，再確認一下')
      return
    }

    // Harden: 離線檢測
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('好像沒網路欸，連上 Wi-Fi 再試一次')
      return
    }

    if (!unlocked && scanCount >= FREE_SCANS) { setShowUnlock(true); return }
    setLoading(true); setResult(null); setError(''); setProgress(0)

    const steps = [
      { pct: 20, text: '先打開看看' },
      { pct: 40, text: '翻一翻影片' },
      { pct: 60, text: '讀一下留言' },
      { pct: 80, text: 'AI 正在想' },
      { pct: 95, text: '快好了' },
    ]
    let i = 0
    const timer = setInterval(() => {
      if (i < steps.length) { setProgress(steps[i].pct); setProgressText(steps[i].text); i++ }
    }, 4000)

    // Harden: 60 秒超時保險，避免卡住一直轉
    const ctrl = new AbortController()
    const timeoutId = setTimeout(() => ctrl.abort(), 60_000)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
        signal: ctrl.signal,
      })
      clearTimeout(timeoutId)
      clearInterval(timer); setProgress(100)
      const data = await res.json().catch(() => ({ error: '回傳格式怪怪的，再試一次' }))
      if (!res.ok) {
        // Harden: 區分常見錯誤類型
        if (res.status === 429) setError('太多人在用，等 30 秒再試')
        else if (res.status === 404) setError('找不到這個頻道，確認網址對不對')
        else if (res.status >= 500) setError('伺服器暫時罷工，等等再試')
        else setError(data.error || '分析失敗，再試一次')
      } else {
        const newCount = scanCount + 1
        setScanCount(newCount)
        try { localStorage.setItem(SCAN_COUNT_KEY, String(newCount)) } catch {}
        setResult(data)
        try {
          const raw = localStorage.getItem(HISTORY_KEY)
          const existing: AnalysisResult[] = raw ? JSON.parse(raw) : []
          const deduped = existing.filter((h) => h.channelUrl !== data.channelUrl)
          localStorage.setItem(HISTORY_KEY, JSON.stringify([data, ...deduped].slice(0, MAX_HISTORY)))
        } catch (e) {
          // Harden: localStorage 滿了或無法寫，不影響掃描結果顯示
          console.warn('history save failed:', e)
        }
      }
    } catch (e) {
      clearTimeout(timeoutId); clearInterval(timer)
      if (e instanceof Error && e.name === 'AbortError') {
        setError('掃太久了，可能頻道太大，挑小一點的再試')
      } else {
        setError('網路有點問題，再試一次')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleUnlocked = () => {
    setUnlocked(true); localStorage.setItem(STORAGE_KEY, 'true'); setShowUnlock(false)
  }

  const remainingFree = Math.max(FREE_SCANS - scanCount, 0)
  const canSubmit = url.trim().length > 0 && !loading

  return (
    <main className="page-main" id="main">

      {/* a11y: 鍵盤使用者可跳過 nav 直達主內容 */}
      <a href="#scan-input" className="skip-link">跳到掃描輸入框</a>

      {/* 背景裝飾吉祥物 */}
      <div aria-hidden style={{ position: 'fixed', right: -60, top: 60, opacity: 0.07, pointerEvents: 'none', zIndex: 0, transform: 'rotate(8deg)' }}>
        <Mascot pose="guard" size={320} priority />
      </div>
      <div aria-hidden style={{ position: 'fixed', left: -50, bottom: 80, opacity: 0.05, pointerEvents: 'none', zIndex: 0, transform: 'rotate(-12deg)' }}>
        <Mascot pose="hi" size={220} />
      </div>

      <div className="page-wrapper">

        {/* nav 拿掉 — Oscar 認為無效區塊：歷史已有「最近標記的 → 全部」入口
            品牌名移到 footer 統一收尾 */}

        {/* ── Confetti — 結果出現的 0.7s 蜂蜜金小點散開 ── */}
        {confetti && (
          <div aria-hidden style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60,
            overflow: 'hidden',
          }}>
            {Array.from({ length: 18 }).map((_, i) => {
              const colors = ['#F2B84B', '#D99422', '#C2413B', '#FFF6E6']
              const left = 12 + (i * 4.6) % 78
              const delay = (i % 6) * 30
              const dur = 580 + (i % 5) * 60
              return (
                <span key={i} style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '38%',
                  width: 8, height: 8,
                  borderRadius: i % 3 === 0 ? '50%' : 2,
                  background: colors[i % colors.length],
                  border: '1px solid rgba(43,24,16,0.4)',
                  animation: `confetti-burst ${dur}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms forwards`,
                  ['--tx' as never]: `${(i % 2 === 0 ? -1 : 1) * (40 + (i * 13) % 120)}px`,
                  ['--ty' as never]: `${-80 - (i * 17) % 140}px`,
                  ['--rot' as never]: `${(i * 47) % 360}deg`,
                  opacity: 0,
                }} />
              )
            })}
          </div>
        )}

        {/* ── Result ── */}
        {result && !loading && (
          <div className="animate-slide-up" style={{ marginBottom: 28 }}>
            <ResultCard result={result} onReset={() => { setResult(null); setUrl('') }} />
          </div>
        )}

        {/* ── Hero 標題（無卡片，浮在背景上） ── */}
        {!result && (
          <div className="stagger-1" style={{ marginBottom: 24, paddingLeft: 2 }}>
            <p className="glass-badge">
              <span className="glass-badge__dot" />
              小析守護中
            </p>
            <h1 style={{
              fontSize: 'clamp(44px, 12vw, 68px)',
              fontWeight: 900, letterSpacing: '-0.05em',
              color: 'var(--ink-hex)', lineHeight: 0.98, marginBottom: 14,
            }}>
              這個<span style={{ color: 'var(--cc-red-deep)' }}>卡通</span><br />
              安全嗎？
            </h1>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(43,24,16,0.60)', lineHeight: 1.6 }}>
              讓小析去查，你去泡咖啡
            </p>
          </div>
        )}

        {/* ── 輸入卡（Double-Bezel：外殼 hairline tray + 內核 glass，給機械精品感） ── */}
        {!result && (
          <div className="stagger-2" style={{
            padding: 6,
            marginBottom: 14,
            borderRadius: 30,
            background: 'linear-gradient(135deg, rgba(242,184,75,0.16), rgba(255,255,255,0.04) 60%, rgba(43,24,16,0.04))',
            boxShadow:
              'inset 0 0 0 1px rgba(43,24,16,0.06),' +
              ' 0 1px 0 rgba(255,255,255,0.7),' +
              ' 0 22px 40px -28px rgba(43,24,16,0.22)',
          }}>
          <div className="glass-card" style={{ padding: '20px 20px 18px', borderRadius: 24 }}>

            {/* 輸入框 */}
            <div className={`glass-input-wrap${error ? ' glass-input-wrap--error' : ''}`}>
              <label htmlFor="scan-input" className="sr-only">YouTube 頻道網址</label>
              <input
                id="scan-input"
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleAnalyze()}
                placeholder={PLACEHOLDERS[phIdx]}
                disabled={loading}
                aria-invalid={!!error}
                aria-describedby={error ? 'scan-error' : undefined}
                style={{
                  flex: 1, minWidth: 0, padding: '13px 0',
                  fontFamily: 'inherit', fontSize: 15,
                  color: 'var(--text-primary)', background: 'transparent',
                  border: 'none', outline: 'none', letterSpacing: '-0.01em',
                }}
              />
              <button
                className="glass-btn-honey group"
                onClick={handleAnalyze}
                disabled={!canSubmit}
                aria-label="掃這個頻道"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  paddingRight: 6,
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 14, height: 14,
                      border: '2.5px solid rgba(43,24,16,0.25)',
                      borderTopColor: 'var(--ink-hex)', borderRadius: '50%',
                      animation: 'peekkids-spin 0.8s linear infinite',
                    }} />
                    掃描中
                  </>
                ) : (
                  <>
                    掃這個頻道
                    {/* button-in-button 箭頭：包進深可可小圓，給機械精品感 */}
                    <span aria-hidden style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'var(--ink-hex)',
                      color: 'var(--cc-gold)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                    }} className="cta-arrow-nest">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* 狀態列 — 剩 1 次以下時，免費次數變可點 → 開 modal 預覽 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 4px', alignItems: 'center' }}>
              {loading ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {progressText || '分析中…'}
                </span>
              ) : unlocked ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-hex)' }}>
                  ✓ 已解鎖無限
                </span>
              ) : (
                <button
                  onClick={() => setShowUnlock(true)}
                  className={remainingFree === 0 ? 'chip-blocked' : remainingFree === 1 ? 'chip-urgent' : ''}
                  style={{
                    background: remainingFree === 0 ? 'var(--terra-hex)' : remainingFree === 1 ? 'var(--honey-hex)' : 'transparent',
                    border: remainingFree <= 1 ? '1.5px solid var(--ink-hex)' : 'none',
                    padding: remainingFree <= 1 ? '4px 10px' : 0,
                    borderRadius: 9999,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 11, fontWeight: 600,
                    color: remainingFree === 0 ? '#FFF6E6' : remainingFree === 1 ? 'var(--ink-hex)' : 'var(--text-tertiary)',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                  title={remainingFree > 0 ? '點開看看升級方案' : '解鎖無限掃描'}
                >
                  {remainingFree > 1 && `免費剩 ${remainingFree} 次`}
                  {remainingFree === 1 && (<><span className="bolt-bob" aria-hidden>⚡</span>最後 1 次免費 · 看升級</>)}
                  {remainingFree === 0 && '免費已用完 · 解鎖 →'}
                </button>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {loading ? '' : '≈ 20 秒'}
              </span>
            </div>

            {/* 掃描進度 */}
            {loading && (
              <div role="status" aria-live="polite" aria-busy="true" aria-label={`掃描進度 ${progress}%`}>
                {/* Overdrive 進度條 — 漸層 + shimmer + 流動光點 */}
                <div
                  className="cinematic-progress"
                  style={{ marginTop: 14 }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="cinematic-progress__fill" style={{ width: `${progress}%` }} />
                  <span className="cinematic-progress__pulse" style={{ left: `${Math.max(progress - 1, 0)}%` }} />
                </div>

                {/* Overdrive 掃描卡 — 放大鏡掃光 + 進度文案 */}
                <div className="cinematic-scan" style={{ marginTop: 12 }}>
                  <div className="cinematic-scan__sweep" aria-hidden />
                  <div className="cinematic-scan__mascot">
                    <Mascot pose="search" size={48} alt="小析正在查資料" />
                  </div>
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.45, position: 'relative', zIndex: 1 }}>
                    {progressText || '小析正在查'}
                    <br />
                    <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 500 }}>你先去倒水，快好了</span>
                  </p>
                </div>

                {/*
                  真實震撼數據輪播 — 利用 20-40 秒等待，把「無聊 loading」變成
                  「教育時刻」，讓爸媽不經意看到事情的嚴重性
                  全部含可查證的權威來源（Wikipedia / BBC / AAP / 媒體）
                */}
                <LoadingFacts />

                <ScanningStages progress={progress} />
              </div>
            )}
          </div>
          </div>
        )}

        {/* ── 錯誤 ── */}
        {error && !loading && (
          <div id="scan-error" className="glass-error" role="alert" aria-live="assertive" style={{ marginBottom: 14 }}>
            <Mascot pose="think" size={50} alt="小析在想哪裡出錯" />
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--terra-hex)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>{error}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                試試直接從瀏覽器網址列複製貼上
              </p>
            </div>
          </div>
        )}

        {/* ── Social proof: 累計守護 ── */}
        <SocialProof />

        {/* ── 熊熊精選 CTA ── */}
        <a href="/kids" className="glass-card-honey reveal-up" style={{ marginBottom: 44 }}>
          <div className="glass-avatar" style={{ width: 46, height: 46 }}>
            <Mascot pose="hi" size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em' }}>
              丟平板前，先讓熊熊看過
            </p>
            <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.65)', marginTop: 2, fontWeight: 500, lineHeight: 1.5 }}>
              人工精選，直接給小孩看
            </p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>

        {/* ── 最近高風險 ── */}
        <section className="reveal-up" style={{ marginBottom: 32 }}>
          <RecentHighRisk />
        </section>

        {/* ── 真實案例 ── */}
        <div id="case-library" className="reveal-up">
          <CaseLibrary />
        </div>

        {/* Footer — 品牌名收尾 + 免責，全 SVG 無 emoji */}
        <footer className="reveal-up" style={{
          marginTop: 56, textAlign: 'center',
          paddingTop: 24,
          borderTop: '1px dashed rgba(43,24,16,0.14)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 800,
            color: 'var(--ink-hex)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
              border: '1.5px solid var(--ink-hex)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <Mascot pose="hi" size={18} />
            </span>
            CareCub Kids
          </div>
          <p style={{
            fontSize: 11, color: 'var(--ink-hex)',
            letterSpacing: '0.08em', fontWeight: 600,
            textTransform: 'uppercase', opacity: 0.42,
          }}>
            AI 輔助分析 · 結果僅供參考
          </p>
        </footer>
      </div>

      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
