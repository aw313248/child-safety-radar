'use client'

import { useState, useEffect } from 'react'
import RadarScanner from '@/components/RadarScanner'
import ResultCard from '@/components/ResultCard'
import UnlockModal from '@/components/UnlockModal'
import { AnalysisResult } from '@/types/analysis'

const STORAGE_KEY = 'child_radar_unlocked'
const FREE_SCANS = 1 // 免費試用次數
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
    const isUnlocked = localStorage.getItem(STORAGE_KEY) === 'true'
    const count = parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10)
    setUnlocked(isUnlocked)
    setScanCount(count)
  }, [])

  const handleAnalyze = async () => {
    if (!url.trim()) return

    // Check if needs unlock
    if (!unlocked && scanCount >= FREE_SCANS) {
      setShowUnlock(true)
      return
    }

    setLoading(true)
    setResult(null)
    setError('')
    setProgress(0)

    const steps = [
      { pct: 15, text: '正在解析 YouTube 網址...' },
      { pct: 35, text: '抓取頻道最近影片資料...' },
      { pct: 55, text: '收集留言區內容...' },
      { pct: 75, text: 'AI 正在分析家長警示訊號...' },
      { pct: 90, text: '產生風險評估報告...' },
    ]

    let stepIdx = 0
    const progressInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].pct)
        setProgressText(steps[stepIdx].text)
        stepIdx++
      }
    }, 4000)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      clearInterval(progressInterval)
      setProgress(100)
      setProgressText('分析完成')

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '分析失敗，請稍後再試')
      } else {
        // Increment scan count
        const newCount = scanCount + 1
        setScanCount(newCount)
        localStorage.setItem(SCAN_COUNT_KEY, String(newCount))
        setResult(data)
      }
    } catch {
      clearInterval(progressInterval)
      setError('網路錯誤，請檢查連線後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlocked = () => {
    setUnlocked(true)
    localStorage.setItem(STORAGE_KEY, 'true')
    setShowUnlock(false)
  }

  const handleReset = () => {
    setResult(null)
    setUrl('')
    setError('')
    setProgress(0)
  }

  const remainingFree = Math.max(0, FREE_SCANS - scanCount)

  return (
    <main className="min-h-screen radar-bg">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <RadarScanner size={48} />
            <h1 className="text-4xl font-black tracking-tight">
              童安<span className="text-red-500">雷達</span>
            </h1>
          </div>
          <p className="text-white/60 text-base leading-relaxed">
            輸入 YouTube 頻道或影片網址<br />
            AI 掃描是否含有偽裝成兒童內容的危險訊號
          </p>

          {/* Usage badge */}
          {!unlocked && (
            <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              {remainingFree > 0 ? (
                <span className="text-xs text-white/50">免費試用剩 <span className="text-white font-bold">{remainingFree}</span> 次</span>
              ) : (
                <span className="text-xs text-yellow-400/80">免費次數已用完</span>
              )}
            </div>
          )}
          {unlocked && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5">
              <span className="text-xs text-green-400">✓ 已解鎖，無限次掃描</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        {!result && (
          <div className="glass rounded-2xl p-6 mb-6 animate-fade-in-up">
            <label className="block text-sm text-white/50 mb-2 font-medium">
              YouTube 網址（頻道或影片皆可）
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleAnalyze()}
                placeholder="https://www.youtube.com/@channel 或 https://youtu.be/xxxxx"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-red-500/50 transition-all"
                disabled={loading}
              />
              <button
                onClick={handleAnalyze}
                disabled={loading || !url.trim()}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-900/40 disabled:text-white/30 text-white font-bold px-5 py-3 rounded-xl transition-all whitespace-nowrap text-sm"
              >
                {loading ? '分析中' : '開始掃描'}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="glass rounded-2xl p-8 mb-6 animate-fade-in-up text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-red-500/20 absolute inset-0 animate-ping-slow" />
                <RadarScanner size={64} spinning />
              </div>
            </div>
            <p className="text-white/80 font-medium mb-1">{progressText}</p>
            <p className="text-white/30 text-sm mb-6">大約需要 20–40 秒，請稍候</p>
            <div className="bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-full progress-bar-shimmer rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-right text-xs text-white/30 mt-1">{progress}%</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="glass border border-red-500/30 rounded-2xl p-6 mb-6 animate-fade-in-up">
            <p className="text-red-400 font-medium">⚠️ {error}</p>
            <button onClick={() => setError('')} className="mt-3 text-sm text-white/40 hover:text-white/60 transition-colors">
              重試
            </button>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <ResultCard result={result} onReset={handleReset} />
        )}

        {/* How it works */}
        {!result && !loading && (
          <div className="mt-8 animate-fade-in-up">
            <p className="text-white/30 text-xs text-center mb-4">掃描項目</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '💬', label: '家長警示留言', desc: '偵測嚇到了、不適合等關鍵訊號' },
                { icon: '🏷️', label: '標題標籤分析', desc: '找出異常的兒童內容包裝模式' },
                { icon: '🔒', label: '留言區狀態', desc: '關閉留言是高風險警示' },
                { icon: '📊', label: '頻道行為模式', desc: '分析內容一致性與異常跡象' },
              ].map((item) => (
                <div key={item.label} className="glass rounded-xl p-4">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-sm font-medium text-white/80 mb-1">{item.label}</p>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-white/20 text-xs mt-10">
          童安雷達 · AI 輔助分析，結果僅供參考，建議家長陪同觀看
        </p>
      </div>

      {/* Unlock Modal */}
      {showUnlock && (
        <UnlockModal onUnlocked={handleUnlocked} onClose={() => setShowUnlock(false)} />
      )}
    </main>
  )
}
