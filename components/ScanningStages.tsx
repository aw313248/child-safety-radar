'use client'

import { useEffect, useState } from 'react'

const STAGES = [
  { icon: '🔍', title: '打開頻道', sub: '抓頻道資訊' },
  { icon: '🎬', title: '翻影片', sub: '讀標題、縮圖' },
  { icon: '💬', title: '看留言', sub: '找家長警示訊號' },
  { icon: '🧠', title: 'AI 判讀', sub: '綜合風險評分' },
]

export default function ScanningStages({ progress }: { progress: number }) {
  // 根據 progress 推算目前階段（0-25 / 25-50 / 50-75 / 75+）
  const active = Math.min(Math.floor(progress / 25), STAGES.length - 1)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 600)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8,
      marginTop: 16,
    }}>
      {STAGES.map((stage, i) => {
        const done = i < active
        const current = i === active
        return (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '10px 6px',
              borderRadius: 14,
              background: current
                ? 'rgba(var(--stone), 0.45)'
                : done
                ? 'var(--ink-05)'
                : 'transparent',
              border: current
                ? '1px solid rgba(var(--stone), 0.60)'
                : done
                ? '1px solid var(--border-soft)'
                : '1px solid transparent',
              transition: 'background 0.4s var(--ease-out), border-color 0.4s, transform 0.3s',
              transform: current ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            <div style={{
              fontSize: 20,
              lineHeight: 1,
              marginBottom: 4,
              filter: done ? 'grayscale(0.2) opacity(0.55)' : 'none',
              display: 'inline-block',
              animation: current ? 'scan-stage-bob 1.2s ease-in-out infinite' : 'none',
            }}>
              {done ? '✓' : stage.icon}
            </div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: current ? 'var(--text-primary)' : done ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              {stage.title}
            </div>
            {current && (
              <div style={{
                fontSize: 9,
                color: 'var(--text-secondary)',
                letterSpacing: '-0.01em',
                marginTop: 2,
              }}>
                {stage.sub}{'.'.repeat((tick % 3) + 1)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
