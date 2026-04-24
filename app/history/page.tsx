'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnalysisResult } from '@/types/analysis'

const HISTORY_KEY = 'child_radar_history'

const RISK_STYLE = {
  high:   { label: '高風險',   color: 'var(--risk-red)',    bg: 'rgba(255,59,48,0.08)' },
  medium: { label: '注意觀察', color: 'var(--risk-orange)', bg: 'rgba(255,149,0,0.08)' },
  low:    { label: '目前安全', color: 'var(--risk-green)',  bg: 'rgba(52,199,89,0.08)' },
}

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisResult[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

  const clearHistory = () => {
    if (confirm('確定要清空所有歷史紀錄嗎？')) {
      localStorage.removeItem(HISTORY_KEY)
      setHistory([])
    }
  }

  const removeItem = (url: string) => {
    const updated = history.filter(h => h.channelUrl !== url)
    setHistory(updated)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  }

  if (!mounted) return null

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 80px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Header */}
        <div className="animate-fade-scale-in" style={{ marginBottom: '24px' }}>
          <a
            href="/"
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              display: 'inline-block',
              marginBottom: '12px',
            }}
          >
            ← 返回掃描
          </a>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginBottom: '2px',
              }}>
                掃描歷史
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
                共 {history.length} 筆紀錄 · 僅儲存於此裝置
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--risk-red)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  letterSpacing: '-0.01em',
                }}
              >
                清空
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {history.length === 0 && (
          <div className="card animate-fade-scale-in" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🦉</div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.6 }}>
              還沒有掃描紀錄<br />
              去首頁掃第一個頻道看看
            </p>
          </div>
        )}

        {/* History list */}
        {history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map((item, i) => {
              const style = RISK_STYLE[item.riskLevel]
              return (
                <div
                  key={item.channelUrl + i}
                  className={`card stagger-${Math.min(i + 1, 4)}`}
                  style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  {item.channelThumbnail ? (
                    <Image
                      src={item.channelThumbnail}
                      alt={item.channelName}
                      width={42}
                      height={42}
                      style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: 'var(--surface-raised)', flexShrink: 0,
                    }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: style.bg,
                        color: style.color,
                        letterSpacing: '-0.01em',
                      }}>
                        {style.label}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: style.color,
                        letterSpacing: '-0.02em',
                      }}>
                        {item.riskScore}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.channelName}
                    </p>
                    <p style={{
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      letterSpacing: '-0.01em',
                      marginTop: '1px',
                    }}>
                      {new Date(item.checkedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                      {' · '}
                      {new Date(item.checkedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                    <a
                      href={item.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        background: 'rgba(60,60,67,0.06)',
                        borderRadius: '6px',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      查看
                    </a>
                    <button
                      onClick={() => removeItem(item.channelUrl)}
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        background: 'transparent',
                        border: 'none',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      移除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
