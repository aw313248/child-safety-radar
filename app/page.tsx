'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ResultCard from '@/components/ResultCard'
import Mascot from '@/components/Mascot'
import ScanningStages from '@/components/ScanningStages'
import RecentHighRisk from '@/components/RecentHighRisk'
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

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal-up')
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target) }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [result, loading])

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === 'true')
    setScanCount(parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10))
    try {
      const params = new URLSearchParams(window.location.search)
      const u = params.get('u')
      if (u) setUrl(u)
      if (params.get('unlock') === '1') {
        localStorage.setItem(STORAGE_KEY, 'true')
        setUnlocked(true)
      }
    } catch {}
  }, [])

  const handleAnalyze = async () => {
    if (!url.trim()) return
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

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      clearInterval(timer); setProgress(100)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '分析失敗')
      } else {
        const newCount = scanCount + 1
        setScanCount(newCount)
        localStorage.setItem(SCAN_COUNT_KEY, String(newCount))
        setResult(data)
        try {
          const raw = localStorage.getItem(HISTORY_KEY)
          const existing: AnalysisResult[] = raw ? JSON.parse(raw) : []
          const deduped = existing.filter((h) => h.channelUrl !== data.channelUrl)
          localStorage.setItem(HISTORY_KEY, JSON.stringify([data, ...deduped].slice(0, MAX_HISTORY)))
        } catch {}
      }
    } catch {
      clearInterval(timer); setError('網路錯誤，請再試一次')
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
    <main className="page-main">

      {/* 背景裝飾吉祥物 */}
      <div aria-hidden style={{ position: 'fixed', right: -60, top: 60, opacity: 0.07, pointerEvents: 'none', zIndex: 0, transform: 'rotate(8deg)' }}>
        <Mascot pose="guard" size={320} priority />
      </div>
      <div aria-hidden style={{ position: 'fixed', left: -50, bottom: 80, opacity: 0.05, pointerEvents: 'none', zIndex: 0, transform: 'rotate(-12deg)' }}>
        <Mascot pose="hi" size={220} />
      </div>

      <div className="page-wrapper">

        {/* ── Nav ── */}
        <nav className="glass-nav">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-hex)' }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--cc-gold)', border: '1.5px solid var(--ink-hex)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: 'var(--ink-hex)',
            }}>CC</span>
            CareCub Kids
          </span>
          <a href="/history" aria-label="歷史紀錄" title="歷史紀錄"
            className="sticker-icon-btn sticker-icon-btn--gold"
            style={{ width: 38, height: 38, textDecoration: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
            </svg>
          </a>
        </nav>

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
              貼頻道網址，AI 20 秒告訴你<br />能不能給小孩看
            </p>
          </div>
        )}

        {/* ── 輸入卡（毛玻璃，唯一視覺主角） ── */}
        {!result && (
          <div className="glass-card stagger-2" style={{ padding: '20px 20px 18px', marginBottom: 14 }}>

            {/* 吉祥物 + 提示 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Mascot pose="guard" size={48} priority />
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                貼上 YouTube 頻道網址<br />小析幫你翻影片 + 留言
              </p>
            </div>

            {/* 輸入框 */}
            <div className={`glass-input-wrap${error ? ' glass-input-wrap--error' : ''}`}>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleAnalyze()}
                placeholder="youtube.com/@channelname"
                disabled={loading}
                style={{
                  flex: 1, minWidth: 0, padding: '13px 0',
                  fontFamily: 'inherit', fontSize: 15,
                  color: 'var(--text-primary)', background: 'transparent',
                  border: 'none', outline: 'none', letterSpacing: '-0.01em',
                }}
              />
              <button
                className="glass-btn-honey"
                onClick={handleAnalyze}
                disabled={!canSubmit}
                aria-label="掃這個頻道"
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
                ) : '掃這個頻道 →'}
              </button>
            </div>

            {/* 狀態列 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 4px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                {loading ? '掃描中'
                  : unlocked ? '✓ 已解鎖 · 無限'
                  : remainingFree > 0 ? `剩 ${remainingFree} 次免費`
                  : '免費已用完'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {loading ? progressText || '分析中…' : '約 20–40 秒'}
              </span>
            </div>

            {/* 掃描進度 */}
            {loading && (
              <>
                <div style={{ marginTop: 14, background: 'rgba(43,24,16,0.06)', borderRadius: 99, height: 3, overflow: 'hidden' }}>
                  <div className="progress-shimmer" style={{ height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width 1.2s var(--ease-out)' }} />
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  marginTop: 12, padding: '10px 14px',
                  background: 'rgba(255,183,3,0.10)',
                  border: '1px solid rgba(255,183,3,0.28)', borderRadius: 16,
                }}>
                  <Mascot pose="search" size={46} alt="小析正在查資料" />
                  <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.45 }}>
                    小析正在翻影片<br />
                    <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 600 }}>{progressText || '稍等一下下'}</span>
                  </p>
                </div>
                <ScanningStages progress={progress} />
              </>
            )}
          </div>
        )}

        {/* ── 錯誤 ── */}
        {error && !loading && (
          <div className="glass-error" style={{ marginBottom: 14 }}>
            <Mascot pose="think" size={50} alt="小析在想哪裡出錯" />
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--terra-hex)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em' }}>{error}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                試試直接從瀏覽器網址列複製貼上
              </p>
            </div>
          </div>
        )}

        {/* ── 燈號預覽 ── */}
        {!result && !loading && (
          <div className="glass-subtle reveal-up" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
              掃完會看到
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              {([['#7AB87E', '可以看'], ['#F2B84B', '留意'], ['#C2413B', '別給看']] as const).map(([color, label]) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--ink-hex)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 熊熊精選 CTA ── */}
        <a href="/kids" className="glass-card-honey reveal-up" style={{ marginBottom: 44 }}>
          <div className="glass-avatar" style={{ width: 46, height: 46 }}>
            <Mascot pose="hi" size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em' }}>
              不想自己掃？直接用熊熊精選
            </p>
            <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.65)', marginTop: 2, fontWeight: 500, lineHeight: 1.5 }}>
              人工驗證頻道，平板丟給小孩也安心
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

        <p className="reveal-up" style={{
          marginTop: 48, textAlign: 'center',
          fontSize: 11, color: 'var(--ink-hex)',
          letterSpacing: '0.08em', fontWeight: 600,
          textTransform: 'uppercase', opacity: 0.38,
        }}>
          🐻 AI 輔助分析 · 結果僅供參考 🐝
        </p>
      </div>

      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
