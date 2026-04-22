'use client'

import { useState } from 'react'

interface Props {
  onUnlocked: () => void
  onClose: () => void
}

export default function UnlockModal({ onUnlocked, onClose }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.valid) {
        onUnlocked()
      } else {
        setError('存取碼無效，請確認後重試')
      }
    } catch {
      setError('網路錯誤，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass rounded-2xl p-8 max-w-sm w-full animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors text-xl"
        >
          ×
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔓</div>
          <h2 className="text-xl font-black mb-2">解鎖無限掃描</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            免費試用已結束<br />
            購買存取碼後可無限次使用
          </p>
        </div>

        {/* Ko-fi CTA */}
        <a
          href="https://ko-fi.com/minehoooo"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-[#FF5E5B] hover:bg-[#ff4845] text-white font-bold py-3 rounded-xl text-center text-sm transition-all mb-4"
        >
          💛 NT$99 買存取碼（Ko-fi）
        </a>

        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-transparent px-3 text-xs text-white/30">已有存取碼？</span>
          </div>
        </div>

        {/* Code Input */}
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="輸入存取碼（例如 RADAR-XXXX）"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-red-500/50 transition-all text-center tracking-widest font-mono mb-3"
          disabled={loading}
        />

        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all"
        >
          {loading ? '驗證中...' : '輸入存取碼解鎖'}
        </button>

        <p className="text-center text-white/25 text-xs mt-4">
          付款後在 Ko-fi 留言或私訊 @minehoooo 取得存取碼
        </p>
      </div>
    </div>
  )
}
