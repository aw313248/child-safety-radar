'use client'

import { useState, useEffect } from 'react'
import ResultCard from '@/components/ResultCard'
import UnlockModal from '@/components/UnlockModal'
import BeeBearMascot from '@/components/BeeBearMascot'
import CaseLibrary from '@/components/CaseLibrary'
import ScanningStages from '@/components/ScanningStages'
import RecentHighRisk from '@/components/RecentHighRisk'
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
  const [activeStep, setActiveStep] = useState<string | null>(null)

  useEffect(() => {
    setUnlocked(localStorage.getItem(STORAGE_KEY) === 'true')
    setScanCount(parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10))
    // 支援 ?u= 從其他頁面帶 URL 進來，?unlock=1 站長自用解鎖
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

  const mascotState: 'idle' | 'scanning' | 'safe' | 'danger' = loading ? 'scanning'
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

  const steps: Array<{
    n: string
    t: string
    s: string
    icon: 'link' | 'brain' | 'shield'
    detail: string
    action?: { label: string; onClick: () => void }
  }> = [
    {
      n: '01',
      t: '貼上頻道網址',
      s: 'youtube.com/@xxx',
      icon: 'link',
      detail: '打開 YouTube 找到你想檢查的頻道，複製網址列的內容。不管是 @handle、channel 連結，或單一支影片的網址都能用',
      action: {
        label: '試貼一個示範頻道',
        onClick: () => {
          setUrl('https://www.youtube.com/@CocoMelon')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        },
      },
    },
    {
      n: '02',
      t: 'AI 掃描內容',
      s: '讀標題 · 看影片 · 翻留言',
      icon: 'brain',
      detail: 'AI 會抓頻道最近的影片標題、縮圖風格、留言區警示訊號，綜合判斷是否有偽裝成兒童內容的暴力/恐怖/成人梗',
    },
    {
      n: '03',
      t: '秒看風險燈號',
      s: '紅橘綠 + 摘要建議',
      icon: 'shield',
      detail: '紅燈（70+）不建議觀看、橘燈（40-69）陪同觀看、綠燈（0-39）相對安全。每個分數都會附 AI 摘要和具體建議',
      action: { label: '看真實案例', onClick: () => setTab('cases') },
    },
  ]

  const StepIcon = ({ name }: { name: 'link' | 'brain' | 'shield' }) => {
    const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    if (name === 'link') return (
      <svg {...common}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
    )
    if (name === 'brain') return (
      <svg {...common}><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 11-5 0V17a3 3 0 01-3-3 3 3 0 01.5-5 3 3 0 013-3 2.5 2.5 0 012-4z"/><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 105 0V17a3 3 0 003-3 3 3 0 00-.5-5 3 3 0 00-3-3 2.5 2.5 0 00-2-4z"/></svg>
    )
    return (
      <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
    )
  }

  return (
    <main style={{ minHeight: '100vh', padding: '24px 20px 56px' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

        {/* ═══ Top bar — Busy Bee 風：黑底蜂蜜文字 + pill ═══ */}
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          padding: '10px 14px',
          background: 'var(--ink-hex)',
          borderRadius: 9999,
          border: '2.5px solid var(--ink-hex)',
          boxShadow: '3px 3px 0 rgba(43, 24, 16, 0.45)',
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--honey-hex)',
          }}>
            🐻 CareCub Kids
          </span>
          <a
            href="/history"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 9999,
              background: 'var(--honey-hex)',
              color: 'var(--ink-hex)',
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              border: '1.5px solid var(--ink-hex)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            歷史
          </a>
        </nav>

        {/* ═══ Hero — 蜂蜜黃大塊 + 超黑黑體巨字 + 熊+蜜蜂 ═══ */}
        <section style={{
          position: 'relative',
          marginBottom: 28,
          padding: '44px 22px 38px',
          background: 'var(--honey-hex)',
          borderRadius: 32,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(43, 24, 16, 0.28)',
          border: '3px solid var(--ink-hex)',
        }}>
          {/* 左上英文 tag */}
          <p className="stagger-1" style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.24em',
            color: 'var(--ink-hex)',
            textTransform: 'uppercase',
            marginBottom: 14,
            opacity: 0.85,
          }}>
            CareCub Kids · 呵護小熊般守護孩子
          </p>

          {/* 右上復古徽章 */}
          <div
            className="retro-badge stagger-1"
            style={{
              position: 'absolute',
              top: 22,
              right: 22,
              width: 72,
              height: 72,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.06em',
              textAlign: 'center',
              lineHeight: 1.1,
              color: 'var(--ink-hex)',
              background: 'var(--sky-hex)',
              border: '2px solid var(--ink-hex)',
            }}
          >
            人工<br />精選<br />過
          </div>

          {/* 熊 + 蜜蜂 吉祥物 */}
          <div className="stagger-2" style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 14,
            marginTop: 4,
          }}>
            <BeeBearMascot state={mascotState} size={140} />
          </div>

          {/* 超大黑體主標 */}
          <h1 className="font-hero stagger-3" style={{
            color: 'var(--ink-hex)',
            textAlign: 'center',
            marginBottom: 20,
            lineHeight: 0.98,
          }}>
            20 秒<br />
            看穿卡通<br />
            藏什麼
          </h1>

          {/* 副標 — 正常字重 + 放大 + 行距 */}
          <p className="stagger-4" style={{
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: '-0.005em',
            color: 'var(--ink-hex)',
            textAlign: 'center',
            lineHeight: 1.7,
            opacity: 0.75,
            padding: '0 12px',
          }}>
            貼上 YouTube 頻道 · AI 翻遍影片跟留言<br />
            紅橘綠燈秒判斷能不能給小孩看
          </p>
        </section>

        {/* ═══ 一鍵開啟兒童模式 — 主打 CTA ═══ */}
        <a
          href="/kids"
          className="bee-card-honey"
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '20px 22px',
            marginBottom: 22,
            color: 'var(--ink-hex)',
            textDecoration: 'none',
          }}
        >
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--ink-hex)',
            color: 'var(--honey-hex)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, flexShrink: 0,
            border: '3px solid var(--ink-hex)',
          }}>🐻</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: 'var(--ink-hex)', textTransform: 'uppercase', marginBottom: 4, opacity: 0.7 }}>
              ★ Bear Mode ★
            </p>
            <p className="font-display" style={{ fontSize: 26, lineHeight: 1.02, color: 'var(--ink-hex)' }}>
              打開熊熊守護模式
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-hex)', letterSpacing: '-0.005em', marginTop: 6, fontWeight: 500, opacity: 0.7, lineHeight: 1.5 }}>
              人工精選頻道，平板丟給小孩也安心
            </p>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>

        {/* ═══ Segmented control — Busy Bee pill ═══ */}
        <div className="bee-segmented" style={{ marginBottom: 24 }}>
          {(['scan', 'cases'] as const).map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`bee-segmented__item${active ? ' bee-segmented__item--active' : ''}`}
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
                {/* Hero input card — Busy Bee 奶油底 + 深咖啡邊 */}
                <div className="bee-card" style={{
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

                  {/* Input + send — Busy Bee 粗邊黑底 pill */}
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: 9999,
                    border: '2.5px solid var(--ink-hex)',
                    padding: '4px 4px 4px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: error
                      ? '0 0 0 3px rgba(194,65,59,0.18), 3px 3px 0 rgba(43,24,16,0.35)'
                      : '3px 3px 0 rgba(43,24,16,0.35)',
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
                        width: 46, height: 46,
                        borderRadius: '50%',
                        border: 'none',
                        background: canSubmit ? 'var(--honey-hex)' : 'var(--ink-10)',
                        color: 'var(--ink-hex)',
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.15s, transform 0.1s',
                        boxShadow: canSubmit ? '0 3px 0 var(--ink-hex)' : 'none',
                      }}
                    >
                      {loading ? (
                        <span style={{
                          width: 16, height: 16,
                          border: '2.5px solid rgba(43,24,16,0.3)',
                          borderTopColor: 'var(--ink-hex)',
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
                    <>
                      <div style={{ marginTop: 14, background: 'var(--ink-08)', borderRadius: 99, height: 3, overflow: 'hidden' }}>
                        <div className="progress-shimmer" style={{ height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width 1.2s var(--ease-out)' }} />
                      </div>
                      <ScanningStages progress={progress} />
                    </>
                  )}
                </div>

                {error && !loading && (
                  <div className="stagger-1" style={{
                    padding: '16px 20px',
                    marginBottom: 24,
                    background: '#FFF4E6',
                    border: '2.5px solid var(--terra-hex)',
                    borderRadius: 20,
                    boxShadow: '4px 4px 0 var(--terra-hex)',
                  }}>
                    <p style={{ color: 'var(--terra-hex)', fontSize: 14, letterSpacing: '-0.02em', fontWeight: 900 }}>
                      {error}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, letterSpacing: '-0.01em', fontWeight: 600 }}>
                      確認網址格式，或直接貼瀏覽器網址列
                    </p>
                  </div>
                )}

                {/* 怎麼用 section — 黑體大字 + 蜂蜜底線 */}
                <h2 style={{
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: '-0.055em',
                  color: 'var(--ink-hex)',
                  margin: '8px 0 16px',
                  paddingLeft: 4,
                  lineHeight: 1,
                  display: 'inline-block',
                  position: 'relative',
                }}>
                  怎麼用
                  <span style={{
                    position: 'absolute',
                    bottom: -4,
                    left: 4,
                    right: 4,
                    height: 8,
                    background: 'var(--honey-hex)',
                    zIndex: -1,
                    borderRadius: 4,
                  }} />
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}>
                  {steps.map((item, idx) => {
                    const isActive = activeStep === item.n
                    return (
                      <button
                        key={item.n}
                        type="button"
                        onClick={() => setActiveStep(isActive ? null : item.n)}
                        className={`bee-card stagger-${idx + 1}`}
                        style={{
                          padding: '20px 12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: 10,
                          cursor: 'pointer',
                          background: isActive ? 'var(--honey-hex)' : 'var(--card-hex)',
                          fontFamily: 'inherit',
                        }}
                        aria-expanded={isActive}
                      >
                        <div className="step-icon" style={{
                          width: 48, height: 48,
                          borderRadius: '50%',
                          background: isActive ? 'var(--ink-hex)' : 'var(--honey-hex)',
                          color: isActive ? 'var(--honey-hex)' : 'var(--ink-hex)',
                          border: '2.5px solid var(--ink-hex)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}>
                          <StepIcon name={item.icon} />
                          <span style={{
                            position: 'absolute',
                            top: -6, right: -6,
                            minWidth: 20, height: 20,
                            padding: '0 5px',
                            borderRadius: 9999,
                            background: 'var(--ink-hex)',
                            color: 'var(--honey-hex)',
                            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                            fontSize: 11,
                            fontWeight: 900,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--card-hex)',
                          }}>{item.n}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink-hex)', letterSpacing: '-0.03em', lineHeight: 1.25 }}>{item.t}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.005em', lineHeight: 1.6, fontWeight: 500, marginTop: 2 }}>{item.s}</div>
                        <div style={{
                          fontSize: 10,
                          color: 'var(--ink-hex)',
                          marginTop: 2,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                        }}>
                          {isActive ? '收起' : '詳情'}
                          <span style={{
                            display: 'inline-block',
                            transition: 'transform 0.25s var(--ease-out)',
                            transform: isActive ? 'rotate(180deg)' : 'rotate(0)',
                            fontSize: 8,
                          }}>▼</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* 展開詳情 */}
                {activeStep && (() => {
                  const item = steps.find(s => s.n === activeStep)!
                  return (
                    <div
                      className="animate-fade-scale-in bee-card-flat"
                      style={{
                        marginTop: 12,
                        padding: '18px 20px',
                        borderLeft: '8px solid var(--honey-hex)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{
                          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                          fontSize: 11,
                          fontWeight: 900,
                          padding: '3px 10px',
                          borderRadius: 9999,
                          background: 'var(--honey-hex)',
                          color: 'var(--ink-hex)',
                          border: '2px solid var(--ink-hex)',
                          letterSpacing: '0.02em',
                        }}>STEP {item.n}</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink-hex)', letterSpacing: '-0.03em' }}>
                          {item.t}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, letterSpacing: '-0.01em', fontWeight: 500 }}>
                        {item.detail}
                      </p>
                      {item.action && (
                        <button
                          onClick={item.action.onClick}
                          className="btn-pill btn-pill-honey"
                          style={{
                            marginTop: 14,
                            padding: '12px 20px',
                            fontSize: 12,
                          }}
                        >
                          {item.action.label} <span className="arrow">→</span>
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* 最近標記的（只有在有歷史紀錄時才顯示） */}
                <RecentHighRisk />
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
          marginTop: 48,
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--ink-hex)',
          letterSpacing: '0.08em',
          fontWeight: 800,
          textTransform: 'uppercase',
          opacity: 0.55,
        }}>
          🐻 AI 輔助分析 · 結果僅供參考 🐝
        </p>
      </div>

      {showUnlock && <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />}
    </main>
  )
}
