'use client'

import { useEffect, useState } from 'react'

interface Props {
  onClose: () => void
  /** 訂閱 redirect 回來：顯示「處理中 / 重整一下」狀態 */
  pendingFromCheckout?: boolean
}

/**
 * Paywall — 免費 2 次掃描用完時跳出
 * 月費 NT$199 對齊 Mia persona sweet spot（NT$99-299）
 * 設計：暖奶油底 + ink 字 + honey button（對齊 CareCub brand）
 * 文案結尾不加句號（Oscar 鐵則）
 * 不放拿鐵媽媽 framework（feedback_carecub_brand_priority）
 */
export default function PaywallModal({ onClose, pendingFromCheckout = false }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ESC 鍵關 modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || '連結建立失敗，再試一次')
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
      {/* Backdrop — glass blur 對齊 CareCub */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(var(--ink-rgb), 0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Sheet — 奶油底 + 墨黑邊 + sticker shadow */}
      <div
        className="animate-slide-up glass-card"
        style={{
          position: 'relative',
          background: '#FBF7EA',
          border: '2.5px solid var(--ink-hex)',
          borderTop: '2.5px solid var(--ink-hex)',
          borderRadius: '24px 24px 0 0',
          padding: '8px 22px 28px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 -10px 40px -8px rgba(var(--ink-rgb), 0.35)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 44, height: 5,
          background: 'rgba(var(--ink-rgb), 0.22)',
          borderRadius: 99,
          margin: '8px auto 18px',
        }} />

        {/* 關閉鈕 */}
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

        {/* 付款 redirect 回來 banner */}
        {pendingFromCheckout && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', marginBottom: 16,
            background: 'rgba(122, 184, 126, 0.16)',
            border: '1px solid rgba(122, 184, 126, 0.4)',
            borderRadius: 12,
          }}>
            <span aria-hidden style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#7AB87E', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            <p style={{ flex: 1, fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.5, fontWeight: 600 }}>
              訂閱已收到，正在啟用無限掃
              <br />
              <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>1 分鐘內生效，重整頁面試試</span>
            </p>
          </div>
        )}

        {/* Headline — 大標 Huninn / 內文 Noto Sans TC（鐵則 feedback_font_hierarchy） */}
        <div style={{ marginBottom: 18, paddingRight: 36, textAlign: 'center' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
            color: 'var(--cc-red-deep, #8E2A24)', textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            ★ 免費掃描已用完 ★
          </p>
          <h2 style={{
            fontFamily: '"Huninn", "Noto Sans TC", system-ui, sans-serif',
            fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em',
            color: 'var(--ink-hex)', lineHeight: 1.15,
            marginBottom: 10,
          }}>
            升級無限掃<br />守住下一支影片
          </h2>
          <p style={{
            fontFamily: '"Noto Sans TC", system-ui, sans-serif',
            fontSize: 13, color: 'rgba(var(--ink-rgb), 0.72)',
            letterSpacing: '-0.005em', lineHeight: 1.6, fontWeight: 500,
          }}>
            每次小孩說「我要看這個」，20 秒就知道 OK 不 OK
          </p>
        </div>

        {/* Pricing card — NT$199/月 無限掃 + 5 維度評分 + AAP/WHO 標準 */}
        <div style={{
          padding: '16px 18px',
          background: 'var(--honey-hex)',
          border: '2px solid var(--ink-hex)',
          borderRadius: 16,
          marginBottom: 14,
          boxShadow: '3px 3px 0 var(--ink-hex)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
            <span style={{
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 36, fontWeight: 800, color: 'var(--ink-hex)',
              letterSpacing: '-0.04em', lineHeight: 1,
            }}>
              NT$199
            </span>
            <span style={{
              fontFamily: '"Noto Sans TC", system-ui, sans-serif',
              fontSize: 14, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.7)',
            }}>
              /月
            </span>
          </div>

          {/* feature list */}
          <ul style={{
            listStyle: 'none', margin: 0, padding: 0,
            display: 'flex', flexDirection: 'column', gap: 6,
            fontFamily: '"Noto Sans TC", system-ui, sans-serif',
          }}>
            {[
              '無限頻道掃描，想查幾個查幾個',
              '5 維度評分（暴力 / 廣告 / 教育 / 節奏 / 留言）',
              'AAP / WHO 國際兒童媒體標準對齊',
            ].map((line) => (
              <li key={line} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                fontSize: 13, fontWeight: 600, color: 'var(--ink-hex)',
                letterSpacing: '-0.005em', lineHeight: 1.5,
              }}>
                <span aria-hidden style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--ink-hex)', color: 'var(--honey-hex)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 主 CTA — honey button → Lemonsqueezy checkout */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="cta-paywall"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%',
            background: 'linear-gradient(135deg, var(--honey-hex) 0%, var(--honey-deep) 100%)',
            color: 'var(--ink-hex)',
            fontFamily: '"Noto Sans TC", system-ui, sans-serif',
            fontWeight: 800, fontSize: 15,
            letterSpacing: '-0.01em',
            padding: '15px 18px',
            borderRadius: 14,
            border: '2px solid var(--ink-hex)',
            boxShadow: '3px 3px 0 var(--ink-hex)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            marginBottom: 10,
          }}
        >
          {loading ? '建立結帳連結中…' : (
            <>
              升級無限掃
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </>
          )}
        </button>

        {error && (
          <p style={{
            color: 'var(--terra-hex)', fontSize: 12, textAlign: 'center',
            marginBottom: 8, letterSpacing: '-0.005em', fontWeight: 600,
            fontFamily: '"Noto Sans TC", system-ui, sans-serif',
          }}>
            {error}
          </p>
        )}

        {/* commitment 小字 */}
        <p style={{
          textAlign: 'center',
          fontFamily: '"Noto Sans TC", system-ui, sans-serif',
          fontSize: 11, color: 'rgba(var(--ink-rgb), 0.55)', fontWeight: 500,
          letterSpacing: '-0.005em',
          marginBottom: 14,
        }}>
          隨時可取消，月費無 commitment
        </p>

        {/* secondary — 取消按鈕 */}
        <button
          onClick={onClose}
          style={{
            display: 'block', margin: '0 auto',
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(var(--ink-rgb), 0.6)',
            fontFamily: '"Noto Sans TC", system-ui, sans-serif',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '-0.005em',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          先試試 2 次
        </button>

        {/* Trust signals */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexWrap: 'wrap', gap: '4px 12px',
          fontFamily: '"Noto Sans TC", system-ui, sans-serif',
          fontSize: 11, color: 'rgba(var(--ink-rgb), 0.5)', fontWeight: 500,
          letterSpacing: '-0.005em',
          marginTop: 14, lineHeight: 1.6,
        }}>
          <span>Apple Pay / Google Pay</span>
          <span>·</span>
          <span>Lemon Squeezy 安全結帳</span>
        </div>
      </div>
    </div>
  )
}
