'use client'

import { useEffect, useState } from 'react'

interface Stats {
  channels: number
  parents: number
  since: string
}

export default function SocialProof() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/stats', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive && d) setStats(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!stats) {
    // Skeleton — 不要先空白讓 layout shift
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', marginBottom: 18,
        background: 'rgba(43,24,16,0.04)',
        borderRadius: 14,
        minHeight: 44,
      }} aria-hidden />
    )
  }

  return (
    <div
      className="reveal-up"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', marginBottom: 18,
        background: 'linear-gradient(135deg, rgba(242,184,75,0.18), rgba(255,255,255,0.04) 70%)',
        border: '1px solid rgba(43,24,16,0.10)',
        borderRadius: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
      aria-label={`累計幫 ${stats.parents} 位爸媽守護過 ${stats.channels} 個頻道`}
    >
      {/* 動點 — 「正在運轉中」感 */}
      <span aria-hidden style={{
        position: 'relative',
        width: 8, height: 8, borderRadius: '50%',
        background: '#7AB87E', flexShrink: 0,
        boxShadow: '0 0 0 3px rgba(122,184,126,0.25)',
        animation: 'live-dot 1.6s cubic-bezier(0.22,1,0.36,1) infinite',
      }} />

      <p style={{
        flex: 1, minWidth: 0,
        fontSize: 12, color: 'var(--ink-hex)',
        letterSpacing: '-0.01em', lineHeight: 1.45, fontWeight: 500,
      }}>
        累計幫 <Number n={stats.parents} /> 位爸媽守護過 <Number n={stats.channels} /> 個頻道
        <br />
        <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 600, letterSpacing: '0.04em' }}>
          自 {stats.since} 起 · 持續更新
        </span>
      </p>
    </div>
  )
}

// 數字單獨 wrap — tabular figure 樣式更穩
function Number({ n }: { n: number }) {
  return (
    <strong style={{
      fontWeight: 800, color: 'var(--ink-hex)',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      letterSpacing: '-0.01em',
    }}>
      {n.toLocaleString('en-US')}
    </strong>
  )
}
