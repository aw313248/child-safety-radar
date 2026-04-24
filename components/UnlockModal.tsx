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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      />

      {/* Sheet — slides up from bottom like iOS */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px 20px 0 0',
          padding: '8px 24px 48px',
          width: '100%',
          maxWidth: '480px',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'var(--separator)', borderRadius: 99, margin: '12px auto 24px' }} />

        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(60,60,67,0.08)', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600,
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🥤</div>
          <h2 style={{
            fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: '8px',
          }}>
            一杯手搖的錢<br />換小孩 YouTube 的安全
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
            NT$99 無限掃描，付一次就好，不是訂閱制<br />
            每次小孩說「我要看這個」，20 秒就知道 OK 不 OK
          </p>
        </div>

        <a
          href="https://ko-fi.com/minehoooo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            background: '#FF5E5B',
            color: 'white',
            fontWeight: 600,
            fontSize: '15px',
            letterSpacing: '-0.01em',
            padding: '14px',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            textDecoration: 'none',
            marginBottom: '20px',
            boxShadow: '0 2px 12px rgba(255,94,91,0.3)',
            transition: 'transform 0.12s var(--ease-spring)',
          }}
        >
          NT$99 · 解鎖無限掃描（Ko-fi）
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>已有存取碼</span>
          <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
        </div>

        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="RADAR-XXXX"
          className={`input-field${error ? ' input-field--error' : ''}`}
          style={{ textAlign: 'center', letterSpacing: '0.12em', fontFamily: 'monospace', marginBottom: '10px', fontSize: '16px' }}
          disabled={loading}
        />

        {error && (
          <p style={{ color: 'var(--risk-red)', fontSize: '12px', textAlign: 'center', marginBottom: '10px', letterSpacing: '-0.01em' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !code.trim()}
          className="btn-primary"
        >
          {loading ? '驗證中' : '解鎖'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px', marginTop: '14px', letterSpacing: '-0.01em' }}>
          付款後在 Ko-fi 留言取得存取碼 · @minehoooo
        </p>
      </div>
    </div>
  )
}
