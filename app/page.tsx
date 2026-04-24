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
        // 存入歷史紀錄
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

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 20px 80px' }}>

      <div style={{ width: '100%', maxWidth: '390px' }}>

        {/* Header */}
        <div className="animate-fade-scale-in" style={{ textAlign: 'center', marginBottom: '32px' }}>

          {/* Owl with scan pulse */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
            {loading && (
              <>
                <div className="scan-ring" style={{ width: 80, height: 80, position: 'absolute', borderRadius: '50%' }} />
                <div className="scan-ring scan-ring-2" style={{ width: 80, height: 80, position: 'absolute', borderRadius: '50%' }} />
                <div className="scan-ring scan-ring-3" style={{ width: 80, height: 80, position: 'absolute', borderRadius: '50%' }} />
              </>
            )}
            <OwlMascot state={owlState} size={72} />
          </div>

          <h1 style={{
            fontSize: '30px',
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color: 'var(--text-primary)',
            marginBottom: '8px',
            lineHeight: 1.1,
          }}>
            Peek<span style={{ color: 'var(--forest-mid)' }}>Kids</span>
          </h1>
          <p style={{
            color: 'var(--text-primary)',
            fontSize: '17px',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            marginBottom: '6px',
            lineHeight: 1.3,
          }}>
            可愛卡通下可能藏著「艾莎門」
          </p>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            marginBottom: '6px',
            lineHeight: 1.45,
          }}>
            貼上 YouTube 頻道網址，20 秒 AI 看穿是否藏有暴力、恐怖、成人梗
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', letterSpacing: '-0.01em' }}>
            給家有「皮」小孩的爸媽用
          </p>
        </div>

        {/* Result */}
        {result && !loading && (
          <div className="animate-slide-up">
            <ResultCard result={result} onReset={() => { setResult(null); setUrl('') }} />
          </div>
        )}

        {/* Input + actions */}
        {!result && (
          <div className="animate-fade-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
              placeholder="貼網址，例：youtube.com/@channelname"
              className={`input-field${error ? ' input-field--error' : ''}`}
              disabled={loading}
            />

            <button
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="btn-primary"
            >
              {loading ? progressText || '分析中' : '幫我 Peek'}
            </button>

            {/* Progress */}
            {loading && (
              <div style={{ padding: '0 2px' }}>
                <div style={{ background: 'rgba(60,60,67,0.12)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                  <div
                    className="progress-shimmer"
                    style={{ height: '100%', borderRadius: 99, width: `${progress}%`, transition: 'width 1.2s var(--ease-out)' }}
                  />
                </div>
                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '7px', letterSpacing: '-0.01em' }}>
                  約需 20–40 秒
                </p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="stagger-1" style={{
                background: 'rgba(255,59,48,0.06)',
                border: '1px solid rgba(255,59,48,0.18)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
              }}>
                <p style={{ color: 'var(--risk-red)', fontSize: '13px', textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                  {error}
                </p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', textAlign: 'center', marginTop: '4px', letterSpacing: '-0.01em' }}>
                  確認網址格式，或直接貼瀏覽器上的網址
                </p>
              </div>
            )}

            {/* Scan counter — 文案反向：從「快用完」變成「送你 X 次」 */}
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em', paddingTop: '2px' }}>
              {unlocked
                ? '已解鎖 · 無限掃描'
                : scanCount === 0
                  ? `前 ${FREE_SCANS} 次免費，用掉再付 NT$99／月`
                  : scanCount < FREE_SCANS
                    ? `還剩 ${FREE_SCANS - scanCount} 次免費`
                    : '免費次數用完，NT$99／月解鎖無限掃描'}
            </p>
          </div>
        )}

        {/* 真實案例庫 — 只在還沒分析時顯示 */}
        {!result && !loading && <CaseLibrary />}
      </div>

      <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <a
          href="/history"
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
            fontWeight: 500,
          }}
        >
          查看掃描歷史 →
        </a>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
          AI 輔助分析，結果僅供參考
        </p>
      </div>

      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
