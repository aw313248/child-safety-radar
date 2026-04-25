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
const STORAGE_KEY = 'child_radar_unlocked'
const SCAN_COUNT_KEY = 'child_radar_scan_count'
const HISTORY_KEY = 'child_radar_history'
const MAX_HISTORY = 30

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal-up')
    if (!els.length) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
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
    <main style={{ minHeight: '100vh', padding: '24px 20px 56px' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

        {/* ── Nav ── */}
        <nav style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, padding: '10px 14px',
          background: '#FBF7EA', borderRadius: 9999,
          border: '1.5px solid rgba(168, 115, 81, 0.32)',
          boxShadow: '0 3px 10px rgba(43, 24, 16, 0.08)',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-hex)',
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--cc-gold)', border: '1.5px solid var(--ink-hex)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: 'var(--ink-hex)',
            }}>CC</span>
            CareCub Kids
          </span>
          <a
            href="/history"
            aria-label="歷史紀錄"
            title="歷史紀錄"
            className="sticker-icon-btn sticker-icon-btn--gold"
            style={{ width: 38, height: 38, textDecoration: 'none' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
            </svg>
          </a>
        </nav>

        {/* ── Result ── */}
        {result && !loading && (
          <div className="animate-slide-up" style={{ marginBottom: 28 }}>
            <ResultCard
              result={result}
              onReset={() => { setResult(null); setUrl('') }}
            />
          </div>
        )}

        {/* ── Hero + Input（合一） ── */}
        {!result && (
          <section style={{
            marginBottom: 14,
            padding: '28px 24px 24px',
            background: '#FBF7EA',
            borderRadius: 28,
            border: '1.5px solid rgba(168, 115, 81, 0.22)',
            boxShadow: '0 14px 36px -16px rgba(43, 24, 16, 0.18), 0 3px 10px rgba(43, 24, 16, 0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 背景光暈 */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 88% 20%, rgba(242,184,75,0.22), transparent 55%), radial-gradient(circle at 0% 100%, rgba(210,221,194,0.28), transparent 50%)',
              pointerEvents: 'none',
            }} />

            {/* 標題列：文字 + 吉祥物 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 96px',
              gap: 12, alignItems: 'center',
              marginBottom: 22, position: 'relative', zIndex: 1,
            }}>
              <div>
                <p className="stagger-1" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                  color: 'var(--ink-hex)', textTransform: 'uppercase',
                  marginBottom: 10, padding: '4px 9px',
                  background: 'rgba(242, 184, 75, 0.28)', borderRadius: 9999,
                  border: '1px solid rgba(217, 148, 34, 0.42)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cc-gold-deep)' }} />
                  小析守護中
                </p>
                <h1 className="stagger-2" style={{
                  fontSize: 'clamp(30px, 8vw, 46px)',
                  fontWeight: 900, letterSpacing: '-0.045em',
                  color: 'var(--ink-hex)', lineHeight: 1.05, marginBottom: 10,
                }}>
                  這個<span style={{ color: 'var(--cc-red-deep)' }}>卡通</span><br />
                  安全嗎？
                </h1>
                <p className="stagger-3" style={{
                  fontSize: 13, fontWeight: 500,
                  color: 'rgba(43, 24, 16, 0.65)', lineHeight: 1.6,
                }}>
                  貼頻道網址，AI 20 秒告訴你能不能給小孩看
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Mascot pose="guard" size={96} priority />
              </div>
            </div>

            {/* 輸入框：主角 */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                background: '#FBF7EA', borderRadius: 9999,
                border: '2px solid var(--ink-hex)',
                padding: '4px 4px 4px 18px',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: error
                  ? '0 0 0 3px rgba(194,65,59,0.18), 4px 4px 0 var(--ink-hex)'
                  : '4px 4px 0 var(--ink-hex)',
                transition: 'box-shadow 0.2s',
              }}>
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
                  onClick={handleAnalyze}
                  disabled={!canSubmit}
                  aria-label="掃這個頻道"
                  style={{
                    flex: '0 0 auto', height: 46, padding: '0 18px',
                    borderRadius: 9999, border: 'none',
                    background: canSubmit ? 'var(--honey-hex)' : 'var(--ink-10)',
                    color: 'var(--ink-hex)',
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
                    letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                    transition: 'background 0.15s',
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: 14, height: 14,
                        border: '2.5px solid rgba(43,24,16,0.3)',
                        borderTopColor: 'var(--ink-hex)',
                        borderRadius: '50%',
                        animation: 'peekkids-spin 0.8s linear infinite',
                      }} />
                      掃描中
                    </>
                  ) : '掃這個頻道 →'}
                </button>
              </div>

              {/* 狀態列 */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 10, padding: '0 2px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>
                  {loading
                    ? '掃描中'
                    : unlocked
                    ? '✓ 已解鎖 · 無限'
                    : remainingFree > 0
                    ? `剩 ${remainingFree} 次免費`
                    : '免費已用完'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {loading ? progressText || '分析中…' : '約 20–40 秒'}
                </span>
              </div>

              {/* 掃描動畫 */}
              {loading && (
                <>
                  <div style={{ marginTop: 14, background: 'var(--ink-08)', borderRadius: 99, height: 3, overflow: 'hidden' }}>
                    <div
                      className="progress-shimmer"
                      style={{ height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width 1.2s var(--ease-out)' }}
                    />
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    marginTop: 14, padding: '10px 14px',
                    background: 'rgba(242, 184, 75, 0.10)',
                    border: '1px solid rgba(242, 184, 75, 0.32)', borderRadius: 14,
                  }}>
                    <Mascot pose="search" size={48} alt="小析正在查資料" />
                    <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.45 }}>
                      小析正在翻影片<br />
                      <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 600 }}>{progressText || '稍等一下下'}</span>
                    </p>
                  </div>
                  <ScanningStages progress={progress} />
                </>
              )}
            </div>
          </section>
        )}

        {/* ── 錯誤提示 ── */}
        {error && !loading && (
          <div className="stagger-1" style={{
            padding: '16px 20px', marginBottom: 14,
            background: '#FFF4E6',
            border: '2px solid var(--terra-hex)', borderRadius: 20,
            boxShadow: '3px 3px 0 var(--terra-hex)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <Mascot pose="think" size={52} alt="小析在想哪裡出錯" />
            <div style={{ flex: 1 }}>
              <p style={{ color: 'var(--terra-hex)', fontSize: 14, letterSpacing: '-0.02em', fontWeight: 800 }}>
                {error}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, fontWeight: 500 }}>
                試試直接從瀏覽器網址列複製貼上
              </p>
            </div>
          </div>
        )}

        {/* ── 燈號預覽（無結果時） ── */}
        {!result && !loading && (
          <div className="reveal-up" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 14px', marginBottom: 12,
            background: 'rgba(255, 246, 230, 0.5)',
            border: '1px dashed rgba(43, 24, 16, 0.16)', borderRadius: 12,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
              letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              掃完會看到
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              {[['#7AB87E', '可以看'], ['#F2B84B', '留意'], ['#C2413B', '別給看']].map(([color, label]) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--ink-hex)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, border: '1.5px solid var(--ink-hex)' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 熊熊精選 CTA ── */}
        <a
          href="/kids"
          className="reveal-up"
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 20px', marginBottom: 40,
            background: 'var(--honey-hex)',
            color: 'var(--ink-hex)', textDecoration: 'none',
            borderRadius: 20, border: '2px solid var(--ink-hex)',
            boxShadow: '4px 4px 0 var(--ink-hex)',
            transition: 'transform 0.18s var(--ease-spring), box-shadow 0.18s var(--ease-spring)',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#FBF7EA', flexShrink: 0,
            border: '2px solid var(--ink-hex)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mascot pose="hi" size={36} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em' }}>
              不想自己掃？直接用熊熊精選
            </p>
            <p style={{ fontSize: 12, color: 'rgba(43, 24, 16, 0.65)', marginTop: 2, fontWeight: 500, lineHeight: 1.5 }}>
              人工驗證頻道，平板丟給小孩也安心
            </p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>

        {/* ── 最近高風險紀錄 ── */}
        <section className="reveal-up" style={{ marginBottom: 32 }}>
          <RecentHighRisk />
        </section>

        {/* ── 真實案例 ── */}
        <div id="case-library" className="reveal-up">
          <CaseLibrary />
        </div>

        <p className="reveal-up" style={{
          marginTop: 48, textAlign: 'center',
          fontSize: 12, color: 'var(--ink-hex)',
          letterSpacing: '0.08em', fontWeight: 600,
          textTransform: 'uppercase', opacity: 0.45,
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
