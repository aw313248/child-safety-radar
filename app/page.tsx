'use client'

import { useState, useEffect } from 'react'
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
      { pct: 20, text: '🔍 解析網址中' },
      { pct: 40, text: '📺 抓取頻道影片' },
      { pct: 60, text: '💬 讀取留言內容' },
      { pct: 80, text: '🤖 AI 分析中' },
      { pct: 95, text: '📋 產生報告' },
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
    <main className="min-h-screen flex flex-col items-center px-4 pt-16 pb-20 relative overflow-hidden">

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="animate-blob absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-pink-500/5 blur-3xl" />
        <div className="animate-blob absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-3xl" style={{ animationDelay: '4s' }} />
        <div className="animate-blob absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-orange-500/5 blur-3xl" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          {/* Shield mascot */}
          <div className="animate-float inline-block mb-5">
            <div className="relative inline-flex items-center justify-center">
              <div className="animate-ping-slow absolute w-20 h-20 rounded-full bg-pink-500/10" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
                <span className="text-4xl">🛡️</span>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-black mb-2 tracking-tight">
            童安<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">雷達</span>
          </h1>
          <p className="text-white/35 text-sm leading-relaxed">
            保護 6 歲以下孩子的 YouTube 安全守門員
          </p>
        </div>

        {/* Result */}
        {result && !loading && (
          <div className="animate-fade-in-up">
            <ResultCard result={result} onReset={() => { setResult(null); setUrl('') }} />
          </div>
        )}

        {/* Input card */}
        {!result && (
          <div className="animate-fade-in-up space-y-3">
            <div className="glass rounded-3xl p-5">
              <p className="text-xs text-white/30 mb-3 font-medium">貼上 YouTube 頻道或影片網址</p>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                placeholder="https://www.youtube.com/@..."
                className="w-full bg-white/5 rounded-2xl px-4 py-3 text-sm placeholder:text-white/15 focus:outline-none focus:bg-white/8 transition-all text-white/80 border border-white/5 focus:border-pink-500/30"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-400 hover:to-orange-300 disabled:opacity-25 text-white font-bold py-4 rounded-3xl transition-all text-sm shadow-lg shadow-pink-500/20"
            >
              {loading ? progressText || '分析中' : '🔍 開始掃描'}
            </button>

            {/* Progress */}
            {loading && (
              <div className="px-1">
                <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full progress-bar-shimmer rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-white/25 mt-2">大約需要 20–40 秒</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="glass rounded-2xl p-4 border border-red-500/20">
                <p className="text-red-400/80 text-sm text-center">⚠️ {error}</p>
              </div>
            )}

            {/* Unlock badge */}
            <div className="text-center pt-2">
              {!unlocked && (
                <span className="text-white/20 text-xs">
                  免費試用剩 {Math.max(0, FREE_SCANS - scanCount)} 次
                </span>
              )}
              {unlocked && (
                <span className="text-emerald-400/40 text-xs">✓ 已解鎖，無限掃描</span>
              )}
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 justify-center pt-4">
              {['💬 分析留言警示', '🏷️ 偵測異常標籤', '🔒 留言區狀態', '🤖 AI 風險評估'].map(f => (
                <span key={f} className="text-xs text-white/25 bg-white/3 border border-white/5 rounded-full px-3 py-1.5">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="fixed bottom-5 text-white/10 text-xs">
        AI 輔助分析，結果僅供參考 · 童安雷達
      </p>

      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
