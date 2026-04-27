'use client'

import { useEffect, useState } from 'react'

type IconName = 'channel' | 'video' | 'comment' | 'brain' | 'check'

const STAGES: Array<{ icon: IconName; title: string; sub: string }> = [
  { icon: 'channel', title: '打開頻道', sub: '抓頻道資訊' },
  { icon: 'video', title: '翻影片', sub: '讀標題、縮圖' },
  { icon: 'comment', title: '看留言', sub: '找家長警示訊號' },
  { icon: 'brain', title: 'AI 判讀', sub: '綜合風險評分' },
]

// 統一線條 SVG icon — 取代 emoji
function StageIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  const c = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'channel') return (
    <svg {...c}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>
  )
  if (name === 'video') return (
    <svg {...c}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  )
  if (name === 'comment') return (
    <svg {...c}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  )
  if (name === 'brain') return (
    <svg {...c}><path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-2 5.7v.3a3 3 0 0 0 2 2.8V18a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2.2a3 3 0 0 0 2-2.8v-.3a3 3 0 0 0-2-5.7V6a4 4 0 0 0-4-4z"/></svg>
  )
  return (
    <svg {...c}><polyline points="20 6 9 17 4 12"/></svg>
  )
}

export default function ScanningStages({ progress }: { progress: number }) {
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
              lineHeight: 1,
              marginBottom: 4,
              color: current ? 'var(--ink-hex)' : done ? 'rgba(43,24,16,0.4)' : 'rgba(43,24,16,0.3)',
              display: 'inline-flex',
              animation: current ? 'scan-stage-bob 1.2s ease-in-out infinite' : 'none',
            }}>
              <StageIcon name={done ? 'check' : stage.icon} size={18} />
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
