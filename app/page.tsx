'use client'

import { useState, useEffect } from 'react'
import RadarScanner from '@/components/RadarScanner'
import ResultCard from '@/components/ResultCard'
import UnlockModal from '@/components/UnlockModal'
import { AnalysisResult } from '@/types/analysis'

const FREE_SCANS = 1
const STORAGE_KEY = 'child_radar_unlocked'
const SCAN_COUNT_KEY = 'child_radar_scan_count'

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

  const handleAnalyze = async () => {
    if (!url.trim()) return
    if (!unlocked && scanCount >= FREE_SCANS) { setShowUnlock(true); return }

    setLoading(true)
    setResult(null)
    setError('')
    setProgress(0)

    const steps = [
      { pct: 20, text: '解析網址中' },
      { pct: 40, text: '抓取頻道影片' },
      { pct: 60, text: '讀取留言內容' },
      { pct: 80, text: 'AI 分析中' },
      { pct: 95, text: '產生報告' },
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
    <main className="min-h-screen flex flex-col items-center justify-start px-4 pt-20 pb-16">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <RadarScanner size={40} />
            <h1 className="text-3xl font-black tracking-tight">
              童安<span className="text-red-500">雷達</span>
            </h1>
          </div>
          <p className="text-white/40 text-sm">
            輸入 YouTube 頻道網址，掃描是否適合 6 歲以下觀看
          </p>
        </div>

        {/* Result */}
        {result && !loading && (
          <ResultCard result={result} onReset={() => { setResult(null); setUrl('') }} />
        )}

        {/* Input */}
        {!result && (
          <>
            <div className="glass rounded-2xl p-4 mb-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                placeholder="https://www.youtube.com/@頻道名稱"
                className="w-full bg-transparent text-sm placeholder:text-white/20 focus:outline-none text-white/80"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-30 text-white font-bold py-3.5 rounded-2xl transition-all text-sm"
            >
              {loading ? progressText || '分析中' : '開始掃描'}
            </button>

            {/* Progress bar */}
            {loading && (
              <div className="mt-4">
                <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full progress-bar-shimmer rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-right text-xs text-white/20 mt-1">{progress}%</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="mt-4 text-red-400/80 text-sm text-center">{error}</p>
            )}

            {/* Status */}
            <div className="mt-6 text-center">
              {!unlocked && (
                <span className="text-white/25 text-xs">
                  免費試用 {Math.max(0, FREE_SCANS - scanCount)} 次剩餘
                </span>
              )}
              {unlocked && (
                <span className="text-green-500/40 text-xs">✓ 已解鎖</span>
              )}
            </div>
          </>
        )}

      </div>

      <p className="fixed bottom-5 text-white/15 text-xs">
        AI 輔助分析，結果僅供參考
      </p>

      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
