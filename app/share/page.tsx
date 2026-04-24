'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface SharedResult {
  n: string  // channelName
  u: string  // channelUrl
  s: number  // riskScore
  l: 'high' | 'medium' | 'low'
  t?: string // thumbnail
  sum: string // summary
  rec: string // recommendation
  at: string // checkedAt
}

function decode(b64: string): SharedResult | null {
  try {
    const s = b64.replace(/-/g, '+').replace(/_/g, '/')
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
    const json = decodeURIComponent(escape(atob(s + pad)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

const LEVEL = {
  high:   { label: '高風險',   tagline: '不建議讓孩子觀看', color: 'var(--risk-red)' },
  medium: { label: '注意觀察', tagline: '建議家長全程陪同', color: 'var(--risk-orange)' },
  low:    { label: '目前安全', tagline: '相對安全仍建議偶爾確認', color: 'var(--risk-green)' },
}

function SharedView() {
  const params = useSearchParams()
  const [data, setData] = useState<SharedResult | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const d = params.get('d')
    if (d) setData(decode(d))
  }, [params])

  if (!mounted) return null

  if (!data) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="surface-stone" style={{ maxWidth: 360, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🦉</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
            連結看起來壞掉了
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.55, marginBottom: 20 }}>
            可能太舊、被截斷，<br />或不是 PeekKids 分享的連結
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '11px 22px',
              borderRadius: 9999,
              background: 'var(--ink-hex)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            自己掃一個頻道
          </a>
        </div>
      </main>
    )
  }

  const cfg = LEVEL[data.l]

  return (
    <main style={{ minHeight: '100vh', padding: '24px 20px 56px' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

        {/* Top bar */}
        <nav style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 9999,
              background: 'var(--ink-05)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            回首頁
          </a>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
            家長分享的結果
          </span>
        </nav>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 68, height: 68,
            margin: '0 auto 14px',
            borderRadius: '50%',
            background: 'var(--stone-hex)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
          }}>🦉</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1.05 }}>
            {data.n}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, letterSpacing: '-0.01em' }}>
            另一台裝置掃過的結果
          </p>
        </section>

        {/* Score card */}
        <div className="surface-stone" style={{ padding: 24, marginBottom: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: '-0.05em', color: cfg.color, lineHeight: 0.95 }}>
            {data.s}
            <span style={{ fontSize: 16, color: 'var(--text-tertiary)', fontWeight: 500, marginLeft: 6 }}>/100</span>
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: 10,
            padding: '4px 12px',
            borderRadius: 9999,
            background: 'rgba(255,255,255,0.65)',
            fontSize: 12,
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: '-0.01em',
          }}>
            {cfg.label}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, letterSpacing: '-0.01em' }}>
            {cfg.tagline}
          </p>
        </div>

        {/* Summary */}
        <div className="surface-white" style={{ padding: 18, marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            AI 摘要
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
            {data.sum}
          </p>
        </div>

        <div className="surface-white" style={{ padding: 18, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
            建議
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
            {data.rec}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={`/?u=${encodeURIComponent(data.u)}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 14,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--ink-hex)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            在這台裝置重新掃描
          </a>
          <a
            href={data.u}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 14,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--ink-05)',
              border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            在 YouTube 查看頻道
          </a>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
          掃描時間 {new Date(data.at).toLocaleString('zh-TW')} · 結果僅供參考
        </p>
      </div>
    </main>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <SharedView />
    </Suspense>
  )
}
