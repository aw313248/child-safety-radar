'use client'

import { useEffect, useState } from 'react'
import Mascot from './Mascot'

const SCAN_COUNT_KEY = 'child_radar_scan_count'

/**
 * 個人累計守護數：只用真實 localStorage 數據，零造假
 * - 0–4 次不顯示（數字太小反效果，Mia P0 驗證）
 * - 5 次以上：換成情感層文案，不說「守護過 N 個頻道」
 * - 之後若接 Vercel KV 做全站聚合，再加另一條全站數字
 */
export default function SocialProof() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    try {
      const n = parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10)
      setCount(Number.isFinite(n) ? n : 0)
    } catch {
      setCount(0)
    }
  }, [])

  // SSR / 讀失敗 / 掃不到 5 次 → 不顯示（避免小數字反效果）
  if (count === null || count < 5) return null

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', marginBottom: 18,
        background: 'rgba(242,184,75,0.10)',
        border: '1px solid rgba(var(--ink-rgb), 0.10)',
        borderRadius: 14,
      }}
      aria-label={`你已幫孩子把關 ${count} 個頻道`}
    >
      <span aria-hidden style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
        border: '1.5px solid var(--ink-hex)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', flexShrink: 0,
      }}>
        <Mascot pose="hi" size={18} />
      </span>
      <p style={{
        flex: 1, minWidth: 0,
        fontSize: 12, color: 'var(--ink-hex)',
        letterSpacing: '-0.01em', lineHeight: 1.5, fontWeight: 500,
      }}>
        你已幫孩子把關了{' '}
        <strong style={{
          fontWeight: 800,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        }}>
          {count}
        </strong>
        {' '}個頻道，那個不安感，少了一些
      </p>
    </div>
  )
}
