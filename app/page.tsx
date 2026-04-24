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

  const owlState = loading
    ? 'scanning'
    : result
      ? result.riskLevel === 'high' ? 'danger' : result.riskLevel === 'medium' ? 'scanning' : 'safe'
      : 'idle'

  const handleAnalyze = async () => {
    if (!url.trim()) return
    if (!unlocked && scanCount >= FREE_SCANS) { setShowUnlock(true); return }

    setLoading(true)
    setResult(null)
    setError('')
    setProgress(0)

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
      clearInterval(timer)
      setProgress(100)
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
          const updated = [data, ...deduped].slice(0, MAX_HISTORY)
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
        } catch {}
      }
    } catch {
      clearInterval(timer)
      setError('網路錯誤，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlocked = () => {
    setUnlocked(true)
    localStorage.setItem(STORAGE_KEY, 'true')
    setShowUnlock(false)
  }

  const remainingFree = Math.max(FREE_SCANS - scanCount, 0)
  const statusLabel = unlocked ? '已解鎖' : remainingFree > 0 ? `剩 ${remainingFree} 次免費` : '免費已用完'
  const statusColor = unlocked ? 'var(--risk-green)' : remainingFree > 0 ? 'var(--risk-green)' : 'var(--risk-orange)'

  return (
    <main style={{ minHeight: '100vh', padding: '24px 20px 100px' }}>

      <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>

        {/* ── Header：大標題 left + icon pill right ───── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
          <div>
            <h1 style={{
              fontSize: '34px',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              lineHeight: 1,
              marginBottom: '6px',
            }}>
              PeekKids
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em', fontWeight: 500 }}>
              YouTube 頻道兒童安全雷達
            </p>
          </div>
          <a
            href="/history"
            aria-label="掃描歷史"
            style={{
              flex: '0 0 auto',
              width: 44, height: 44,
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '18px',
            }}
          >
            <div className="animate-breathe">
              <OwlMascot state={owlState} size={26} />
            </div>
          </a>
        </div>

        {/* ── Segmented control ───────────────────────── */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 9999,
          padding: 4,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          marginBottom: 20,
          boxShadow: 'var(--shadow-card)',
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
                  background: active ? 'var(--forest)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {t === 'scan' ? '頻道掃描' : '真實案例'}
              </button>
            )
          })}
        </div>

        {/* ══════════════════════════════════════════════
            Tab 1: 頻道掃描
            ══════════════════════════════════════════════ */}
        {tab === 'scan' && (
          <>
            {/* Result */}
            {result && !loading && (
              <div className="animate-slide-up" style={{ marginBottom: 16 }}>
                <ResultCard result={result} onReset={() => { setResult(null); setUrl('') }} />
              </div>
            )}

            {/* Scan card — 浮動白卡 */}
            {!result && (
              <div className="animate-fade-scale-in" style={{
                background: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border-default)',
                boxShadow: '0 10px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: 24,
              }}>
                {/* Status dot row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: statusColor, letterSpacing: '-0.01em' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
                    {loading ? '掃描中' : statusLabel}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
                    {loading ? progressText || '分析中' : '約 20–40 秒'}
                  </span>
                </div>

                <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14, color: 'var(--text-primary)' }}>
                  貼上 YouTube 頻道網址
                </h2>

                {/* Progress bar */}
                {loading && (
                  <div style={{ background: 'rgba(60,60,67,0.12)', borderRadius: 99, height: 4, overflow: 'hidden', marginBottom: 14 }}>
                    <div
                      className="progress-shimmer"
                      style={{ height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width 1.2s var(--ease-out)' }}
                    />
                  </div>
                )}

                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                  placeholder="例：youtube.com/@channelname"
                  className={`input-field${error ? ' input-field--error' : ''}`}
                  disabled={loading}
                  style={{ marginBottom: 10 }}
                />

                <button
                  onClick={handleAnalyze}
                  disabled={loading || !url.trim()}
                  className="btn-primary"
                >
                  {loading ? progressText || '分析中' : '幫我 Peek'}
                </button>

                {error && !loading && (
                  <div className="stagger-1" style={{
                    marginTop: 10,
                    background: 'rgba(255,59,48,0.08)',
                    border: '1px solid rgba(255,59,48,0.22)',
                    borderRadius: 12,
                    padding: '10px 14px',
                  }}>
                    <p style={{ color: 'var(--risk-red)', fontSize: 13, letterSpacing: '-0.01em', lineHeight: 1.5, fontWeight: 600 }}>
                      {error}
                    </p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2, letterSpacing: '-0.01em' }}>
                      確認網址格式，或直接貼瀏覽器網址列
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tip list — 類似「近期行程」 */}
            {!result && !loading && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 12, color: 'var(--text-primary)', paddingLeft: 2 }}>
                  怎麼用
                </h3>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 16, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
                  {[
                    { i: '1', t: '打開 YouTube 找到頻道', s: '複製 youtube.com/@xxx 或任一支影片網址' },
                    { i: '2', t: '貼到上面輸入框', s: 'AI 會讀標題、看影片、翻留言' },
                    { i: '3', t: '20-40 秒看結果', s: '紅橘綠三燈，附 AI 摘要與建議' },
                  ].map((item, idx, arr) => (
                    <div key={item.i} style={{
                      padding: '14px 18px',
                      borderBottom: idx < arr.length - 1 ? '1px solid var(--separator)' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}>
                      <div style={{
                        flex: '0 0 auto',
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: 'rgba(0,122,255,0.10)',
                        color: 'var(--forest)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                      }}>{item.i}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>{item.t}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>{item.s}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════
            Tab 2: 真實案例
            ══════════════════════════════════════════════ */}
        {tab === 'cases' && (
          <div className="animate-fade-scale-in">
            <CaseLibrary />
          </div>
        )}

        {/* Footer links — 類似「查看全部」樣式 */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <a
            href="/history"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--forest)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            查看掃描歷史 →
          </a>
          <p style={{ marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
            AI 輔助分析，結果僅供參考
          </p>
        </div>
      </div>

      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
