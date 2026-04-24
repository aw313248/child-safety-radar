'use client'

import { useState, useEffect } from 'react'
import ResultCard from '@/components/ResultCard'
import UnlockModal from '@/components/UnlockModal'
import OwlMascot from '@/components/OwlMascot'
import CaseLibrary from '@/components/CaseLibrary'
import { AnalysisResult } from '@/types/analysis'

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
  const [tab, setTab] = useState<'scan' | 'cases'>('scan')

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === 'true')
    setScanCount(parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10))
  }, [])

  const owlState = loading ? 'scanning'
    : result ? (result.riskLevel === 'high' ? 'danger' : result.riskLevel === 'medium' ? 'scanning' : 'safe')
    : 'idle'

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
      if (!res.ok) { setError(data.error || '分析失敗') }
      else {
        const newCount = scanCount + 1
        setScanCount(newCount)
        localStorage.setItem(SCAN_COUNT_KEY, String(newCount))
        setResult(data)
        try {
          const raw = localStorage.getItem(HISTORY_KEY)
          const existing: AnalysisResult[] = raw ? JSON.parse(raw) : []
          const deduped = existing.filter(h => h.channelUrl !== data.channelUrl)
          localStorage.setItem(HISTORY_KEY, JSON.stringify([data, ...deduped].slice(0, MAX_HISTORY)))
        } catch {}
      }
    } catch {
      clearInterval(timer); setError('網路錯誤，請再試一次')
    } finally { setLoading(false) }
  }

  const handleUnlocked = () => {
    setUnlocked(true); localStorage.setItem(STORAGE_KEY, 'true'); setShowUnlock(false)
  }

  const remainingFree = Math.max(FREE_SCANS - scanCount, 0)
  const canSubmit = url.trim().length > 0 && !loading

  const steps = [
    { n: '01', t: '打開 YouTube 找到頻道', s: '複製 youtube.com/@xxx 或任一影片網址' },
    { n: '02', t: '貼到上面輸入框',         s: 'AI 讀標題、看影片、翻留言' },
    { n: '03', t: '20–40 秒看結果',         s: '紅橘綠三燈 + AI 摘要與建議' },
  ]

  return (
    <main style={{ minHeight: '100vh', padding: '24px 20px 56px' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

        {/* ═══ Top bar — 小 logo + 歷史入口（明確標籤） ═══ */}
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--text-secondary)',
          }}>
            PeekKids
          </span>
          <a
            href="/history"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 9999,
              background: 'var(--ink-05)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            掃描歷史
          </a>
        </nav>

        {/* ═══ Hero — 大貓頭鷹 + 主標題 ═══ */}
        <section style={{
          textAlign: 'center',
          marginBottom: 36,
        }}>
          <div style={{
            width: 120, height: 120,
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <OwlMascot state={owlState} size={120} />
          </div>
          <h1 style={{
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: '-0.055em',
            color: 'var(--text-primary)',
            lineHeight: 1,
            marginBottom: 10,
          }}>
            PeekKids
          </h1>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            letterSpacing: '-0.01em',
            fontWeight: 500,
            lineHeight: 1.5,
          }}>
            YouTube 頻道兒童安全雷達，<br />
            20 秒幫你看穿「艾莎門」
          </p>
        </section>

        {/* ═══ Segmented control ═══ */}
        <div style={{
          background: 'var(--ink-05)',
          border: '1px solid var(--border-soft)',
          borderRadius: 9999,
          padding: 4,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          marginBottom: 24,
        }}>
          {(['scan', 'cases'] as const).map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 9999,
                  border: 'none',
                  background: active ? 'var(--ink-hex)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                  transition: 'background 0.25s, color 0.25s',
                }}
              >
                {t === 'scan' ? '頻道掃描' : '真實案例'}
              </button>
            )
          })}
        </div>

        {tab === 'scan' && (
          <>
            {result && !loading && (
              <div className="animate-slide-up" style={{ marginBottom: 28 }}>
                <ResultCard result={result} onReset={() => { setResult(null); setUrl('') }} />
              </div>
            )}

            {!result && (
              <>
                {/* Hero input card — 單一 stone tint */}
                <div className="surface-stone" style={{
                  padding: '22px 22px 20px',
                  marginBottom: 28,
                }}>
                  {/* meta row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      letterSpacing: '-0.01em',
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--ink-hex)',
                        opacity: loading ? 0.4 : (unlocked || remainingFree > 0) ? 1 : 0.25,
                      }} />
                      {loading ? '掃描中' : unlocked ? '已解鎖 · 無限' : remainingFree > 0 ? `剩 ${remainingFree} 次免費` : '免費已用完'}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                      {loading ? progressText || '分析中' : '約 20–40 秒'}
                    </span>
                  </div>

                  {/* Input + send — iMessage 風 */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: 9999,
                    border: '1px solid var(--border-soft)',
                    padding: '5px 5px 5px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: error ? '0 0 0 3px rgba(194,65,59,0.12)' : 'var(--shadow-hair)',
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
                        flex: 1,
                        minWidth: 0,
                        padding: '13px 0',
                        fontFamily: 'inherit',
                        fontSize: 15,
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        letterSpacing: '-0.01em',
                      }}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={!canSubmit}
                      aria-label="開始掃描"
                      style={{
                        flex: '0 0 auto',
                        width: 44, height: 44,
                        borderRadius: '50%',
                        border: 'none',
                        background: canSubmit ? 'var(--ink-hex)' : 'var(--ink-10)',
                        color: '#fff',
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s, transform 0.1s',
                        boxShadow: canSubmit ? '0 4px 12px rgba(10,10,10,0.22)' : 'none',
                      }}
                    >
                      {loading ? (
                        <span style={{
                          width: 16, height: 16,
                          border: '2.5px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'peekkids-spin 0.8s linear infinite',
                        }} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {loading && (
                    <div style={{ marginTop: 14, background: 'var(--ink-08)', borderRadius: 99, height: 3, overflow: 'hidden' }}>
                      <div className="progress-shimmer" style={{ height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width 1.2s var(--ease-out)' }} />
                    </div>
                  )}
                </div>

                {error && !loading && (
                  <div className="stagger-1" style={{
                    padding: '14px 18px',
                    marginBottom: 24,
                    background: 'rgba(194,65,59,0.06)',
                    border: '1px solid rgba(194,65,59,0.18)',
                    borderRadius: 'var(--radius-lg)',
                  }}>
                    <p style={{ color: 'var(--risk-red)', fontSize: 13, letterSpacing: '-0.01em', fontWeight: 700 }}>
                      {error}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, letterSpacing: '-0.01em' }}>
                      確認網址格式，或直接貼瀏覽器網址列
                    </p>
                  </div>
                )}

                {/* 怎麼用 section */}
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                  margin: '8px 0 14px',
                  paddingLeft: 4,
                }}>
                  怎麼用
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map(item => (
                    <div key={item.n} className="surface-white" style={{
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                    }}>
                      <div style={{
                        flex: '0 0 auto',
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: 'var(--ink-hex)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                      }}>{item.n}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 3 }}>{item.t}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.55 }}>{item.s}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'cases' && (
          <div className="animate-fade-scale-in">
            <CaseLibrary />
          </div>
        )}

        <p style={{
          marginTop: 40,
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          letterSpacing: '-0.01em',
        }}>
          AI 輔助分析 · 結果僅供參考
        </p>
      </div>

      {showUnlock && <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />}
    </main>
  )
}
