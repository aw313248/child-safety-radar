'use client'

import { useEffect, useState } from 'react'
import Mascot from './Mascot'

const SCAN_COUNT_KEY = 'child_radar_scan_count'

/**
 * 只顯示「真實的個人累計」，全是 localStorage 自家數據，零造假
 * - 0 次不顯示（避免空話 / 種子騙人）
 * - 1 次以上才出現「你已守護過 N 個頻道」
 * - 之後若接 Vercel KV 做真實全球聚合，再加另一條全站數字
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

  // 還沒掃 / SSR 階段 / 讀失敗 → 不顯示
  if (count === null || count === 0) return null

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', marginBottom: 18,
        background: 'rgba(242,184,75,0.10)',
        border: '1px solid rgba(43,24,16,0.10)',
        borderRadius: 14,
      }}
      aria-label={`你已經守護過 ${count} 個頻道`}
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
        你已經守護過{' '}
        <strong style={{
          fontWeight: 800,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        }}>
          {count}
        </strong>
        {' '}個頻道
      </p>
    </div>
  )
}
