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
  const [showCode, setShowCode] = useState(false)

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
      if (data.valid) onUnlocked()
      else setError('授權碼不對，再確認一下')
    } catch {
      setError('網路有點問題，再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0,
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(43,24,16,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Sheet — 跟首頁同一套：奶油底 + 墨黑邊 + 厚實 offset shadow */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative',
          background: '#FBF7EA',
          border: '2.5px solid var(--ink-hex)',
          borderTop: '2.5px solid var(--ink-hex)',
          borderRadius: '24px 24px 0 0',
          padding: '8px 22px 28px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 -10px 40px -8px rgba(43,24,16,0.35)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 44, height: 5,
          background: 'rgba(43,24,16,0.22)',
          borderRadius: 99,
          margin: '8px auto 18px',
        }} />

        {/* 關閉鈕 — sticker 風 */}
        <button
          onClick={onClose}
          aria-label="關閉"
          style={{
            position: 'absolute', top: 18, right: 18,
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--card-hex)',
            border: '2px solid var(--ink-hex)',
            cursor: 'pointer',
            color: 'var(--ink-hex)',
            fontSize: 16, fontWeight: 700,
            lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '2px 2px 0 var(--ink-hex)',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>

        {/* Headline — 主動勾起需求 */}
        <div style={{ marginBottom: 18, paddingRight: 36 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            color: 'var(--cc-red-deep)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            ★ 免費 2 次用完了 ★
          </p>
          <h2 style={{
            fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em',
            color: 'var(--ink-hex)', lineHeight: 1.15,
            marginBottom: 10,
          }}>
            還有想掃的頻道嗎？<br />
            解鎖無限掃描
          </h2>
          <p style={{
            fontSize: 13, color: 'rgba(43,24,16,0.72)',
            letterSpacing: '-0.005em', lineHeight: 1.6, fontWeight: 500,
          }}>
            每次小孩說「我要看這個」，20 秒就知道 OK 不 OK
          </p>
        </div>

        {/* 價格 deconstruct — 拆成每天的錢，比手搖便宜 */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          padding: '14px 18px',
          background: 'var(--honey-hex)',
          border: '2px solid var(--ink-hex)',
          borderRadius: 16,
          marginBottom: 14,
          boxShadow: '3px 3px 0 var(--ink-hex)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                NT$99
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(43,24,16,0.7)' }}>
                /月
              </span>
            </div>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(43,24,16,0.72)',
              letterSpacing: '-0.005em', marginTop: 4,
            }}>
              = 每天 NT$3.3，比一杯手搖便宜
            </p>
          </div>
          <div style={{
            padding: '4px 9px', borderRadius: 9999,
            background: 'var(--ink-hex)', color: 'var(--honey-hex)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}>
            隨時取消
          </div>
        </div>

        {/* 主 CTA — pill + ink shadow 跟首頁同款 */}
        <a
          href="https://peekkids.lemonsqueezy.com/checkout/buy/5468a3b1-03e2-467e-830a-bfabf0b1f20b?locale=zh-TW"
          target="_blank"
          rel="noopener noreferrer"
          className="cta-paywall"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg, #C2413B 0%, #8E2A24 100%)',
            color: '#FFF6E6',
            fontWeight: 800, fontSize: 15,
            letterSpacing: '-0.01em',
            padding: '15px 18px',
            borderRadius: 14,
            border: '2px solid var(--ink-hex)',
            boxShadow: '3px 3px 0 var(--ink-hex)',
            textAlign: 'center',
            textDecoration: 'none',
            marginBottom: 10,
            fontFamily: 'inherit',
          }}
        >
          立即解鎖無限掃描
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>

        {/* Escape hatch — 不想付錢還能用熊熊精選 */}
        <a
          href="/kids"
          className="cta-escape"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px',
            marginBottom: 14,
            background: 'transparent',
            color: 'rgba(43,24,16,0.7)',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '-0.005em',
            textDecoration: 'none',
            border: '1.5px dashed rgba(43,24,16,0.3)',
            borderRadius: 12,
            fontFamily: 'inherit',
          }}
        >
          先不解鎖 · 去看免費的熊熊精選頻道 →
        </a>

        {/* Trust signals — Apple/Google Pay + Lemon Squeezy 結帳 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexWrap: 'wrap', gap: '4px 12px',
          fontSize: 11, color: 'rgba(43,24,16,0.55)', fontWeight: 500,
          letterSpacing: '-0.005em',
          marginBottom: 16, lineHeight: 1.6,
        }}>
          <span>Apple Pay / Google Pay</span>
          <span>·</span>
          <span>Lemon Squeezy 安全結帳</span>
        </div>

        {/* 已有授權碼 — 折疊起來，不要佔視覺重點 */}
        {!showCode ? (
          <button
            onClick={() => setShowCode(true)}
            style={{
              display: 'block', margin: '0 auto',
              background: 'transparent', border: 'none',
              fontSize: 12, color: 'rgba(43,24,16,0.55)',
              fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            已經有授權碼？
          </button>
        ) : (
          <div className="animate-fade-scale-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(43,24,16,0.18)' }} />
              <span style={{ fontSize: 11, color: 'rgba(43,24,16,0.55)', fontWeight: 600, letterSpacing: '-0.005em' }}>
                輸入授權碼
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(43,24,16,0.18)' }} />
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="付款後信箱會收到"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px',
                fontSize: 14, fontFamily: 'monospace',
                fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em',
                color: 'var(--ink-hex)',
                background: 'var(--card-hex)',
                border: `2px solid ${error ? 'var(--terra-hex)' : 'var(--ink-hex)'}`,
                borderRadius: 12,
                outline: 'none',
                marginBottom: 8,
              }}
              disabled={loading}
              autoFocus
            />
            {error && (
              <p style={{
                color: 'var(--terra-hex)', fontSize: 12, textAlign: 'center',
                marginBottom: 8, letterSpacing: '-0.005em', fontWeight: 600,
              }}>
                {error}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || !code.trim()}
              style={{
                width: '100%', padding: '12px 14px',
                background: 'var(--ink-hex)',
                color: '#FFF6E6',
                border: 'none',
                borderRadius: 12,
                fontFamily: 'inherit',
                fontSize: 14, fontWeight: 700,
                letterSpacing: '-0.01em',
                cursor: code.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: code.trim() && !loading ? 1 : 0.4,
              }}
            >
              {loading ? '驗證中…' : '解鎖'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
