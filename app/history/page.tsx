'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnalysisResult } from '@/types/analysis'

const HISTORY_KEY = 'child_radar_history'

const RISK_STYLE = {
  high:   { label: '高風險',   color: 'var(--risk-red)' },
  medium: { label: '注意觀察', color: 'var(--risk-orange)' },
  low:    { label: '目前安全', color: 'var(--risk-green)' },
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
    <main style={{ minHeight: '100vh', padding: '24px 20px 56px' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

        {/* ═══ Top bar — 返回 ═══ */}
        <nav style={{ marginBottom: 24 }}>
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
            返回掃描
          </a>
        </nav>

        {/* ═══ Hero title ═══ */}
        <header style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
            <div>
              <h1 style={{
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: '-0.055em',
                color: 'var(--text-primary)',
                lineHeight: 0.95,
                marginBottom: 10,
              }}>
                掃描歷史
              </h1>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                letterSpacing: '-0.01em',
                fontWeight: 500,
              }}>
                共 {history.length} 筆 · 僅存於此裝置
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                style={{
                  flex: '0 0 auto',
                  padding: '8px 14px',
                  borderRadius: 9999,
                  background: 'transparent',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                }}
              >
                清空
              </button>
            )}
          </div>
        </header>

        {/* Empty state */}
        {history.length === 0 && (
          <div className="surface-stone animate-fade-scale-in" style={{
            padding: '56px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56,
              margin: '0 auto 14px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.8)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}>🦉</div>
            <p style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 6,
            }}>
              還沒有紀錄
            </p>
            <p style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              letterSpacing: '-0.01em',
              lineHeight: 1.55,
            }}>
              回首頁掃第一個頻道，<br />
              結果會自動存在這邊
            </p>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 18,
                padding: '11px 22px',
                borderRadius: 9999,
                background: 'var(--ink-hex)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
              }}
            >
              回首頁開始掃描
            </a>
          </div>
        )}

        {/* History list */}
        {history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((item, i) => {
              const style = RISK_STYLE[item.riskLevel]
              return (
                <div
                  key={item.channelUrl + i}
                  className={`surface-white stagger-${Math.min(i + 1, 4)}`}
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  {item.channelThumbnail ? (
                    <Image
                      src={item.channelThumbnail}
                      alt={item.channelName}
                      width={48}
                      height={48}
                      style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--ink-05)', flexShrink: 0,
                    }} />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: style.color,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                      }}>
                        {item.riskScore}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: 'var(--ink-05)',
                        color: 'var(--text-secondary)',
                        letterSpacing: '-0.01em',
                      }}>
                        {style.label}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}>
                      {item.channelName}
                    </p>
                    <p style={{
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '-0.01em',
                    }}>
                      {new Date(item.checkedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                      {' · '}
                      {new Date(item.checkedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <a
                      href={item.channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="前往頻道"
                      style={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        background: 'var(--ink-05)',
                        border: '1px solid var(--border-soft)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </a>
                    <button
                      onClick={() => removeItem(item.channelUrl)}
                      aria-label="移除"
                      style={{
                        width: 32, height: 32,
                        borderRadius: '50%',
                        background: 'transparent',
                        border: '1px solid var(--border-soft)',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
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
