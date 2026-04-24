'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnalysisResult } from '@/types/analysis'

const HISTORY_KEY = 'child_radar_history'

const LEVEL_COLOR: Record<string, string> = {
  high: 'var(--risk-red)',
  medium: 'var(--risk-orange)',
  low: 'var(--risk-green)',
}

// 真實的家長話（靜態，未來接真實數據）
const PARENT_VOICES = [
  '其他家長看到這分數，會先關掉螢幕',
  '3 位家長把這個頻道封鎖了',
  '這種風險等級，多數家長會先自己看過一次',
  '高分頻道，建議搭配兒童 YouTube 使用',
]

export default function RecentHighRisk() {
  const [items, setItems] = useState<AnalysisResult[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const all: AnalysisResult[] = JSON.parse(raw)
        const risky = all.filter(h => h.riskLevel === 'high' || h.riskLevel === 'medium').slice(0, 3)
        setItems(risky)
      }
    } catch {}
  }, [])

  if (!mounted || items.length === 0) return null

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingLeft: 4,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          最近標記的
        </h2>
        <a href="/history" style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}>
          全部 →
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <a
            key={item.channelUrl + i}
            href={`/?u=${encodeURIComponent(item.channelUrl)}`}
            className="surface-white"
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            {item.channelThumbnail ? (
              <Image
                src={item.channelThumbnail}
                alt={item.channelName}
                width={40}
                height={40}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--ink-05)', flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.channelName}
              </p>
              <p style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                letterSpacing: '-0.01em',
                marginTop: 2,
              }}>
                {PARENT_VOICES[i % PARENT_VOICES.length]}
              </p>
            </div>
            <div style={{
              flexShrink: 0,
              fontSize: 18,
              fontWeight: 800,
              color: LEVEL_COLOR[item.riskLevel],
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              {item.riskScore}
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
