'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnalysisResult } from '@/types/analysis'
import { RISK_STYLE } from '@/lib/risk-style'
import { ratingToColor, type DimRating } from '@/lib/score-colors'

const HISTORY_KEY = 'child_radar_history'

const DIM_LABELS: Record<string, string> = {
  pacing:     '節奏',
  visual:     '視覺',
  auditory:   '聲音',
  realism:    '敘事',
  behavioral: '觀後',
}

/** 左側顏色條 — 依 riskScore 區段決定顏色 */
function riskBarColor(score: number): string {
  if (score >= 70) return 'var(--risk-red)'
  if (score >= 40) return 'var(--honey-hex)'
  return 'var(--risk-green)'
}

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisResult[]>([])
  const [mounted, setMounted] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (!mounted) return null

  return (
    <main className="page-main">
      <div className="page-wrapper">

        {/* ── Nav ── */}
        <nav style={{ marginBottom: 28 }}>
          <a href="/" className="glass-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            返回掃描
          </a>
        </nav>

        {/* ── Header ── */}
        <header style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-0.055em', color: 'var(--text-primary)', lineHeight: 0.95, marginBottom: 10 }}>
                掃描歷史
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', letterSpacing: '-0.01em', fontWeight: 500 }}>
                共 {history.length} 筆 · 僅存於此裝置
              </p>
            </div>
            {history.length > 0 && (
              <button onClick={clearHistory} className="glass-back-btn" style={{ color: 'var(--text-secondary)' }}>
                清空
              </button>
            )}
          </div>
        </header>

        {/* ── Empty state ── */}
        {history.length === 0 && (
          <div className="glass-card animate-fade-scale-in" style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div className="glass-avatar" style={{ width: 56, height: 56, margin: '0 auto 14px', fontSize: 26 }}>
              🦉
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              還沒有紀錄
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.55 }}>
              回首頁掃第一個頻道，<br />結果會自動存在這邊
            </p>
            <a href="/" className="glass-btn-honey" style={{ marginTop: 20, padding: '0 24px', textDecoration: 'none' }}>
              回首頁開始掃描
            </a>
          </div>
        )}

        {/* ── History list ── */}
        {history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((item, i) => {
              const style = RISK_STYLE[item.riskLevel]
              const barColor = riskBarColor(item.riskScore)
              const itemId = item.checkedAt
              const isExpanded = expandedId === itemId
              const dims = item.channelScore
                ? (['pacing', 'visual', 'auditory', 'realism', 'behavioral'] as const)
                    .map(k => ({ key: k, label: DIM_LABELS[k], dim: item.channelScore![k] }))
                : []
              const summarySnippet = item.aiSummary
                ? item.aiSummary.slice(0, 80) + (item.aiSummary.length > 80 ? '…' : '')
                : ''

              return (
                <div
                  key={itemId + i}
                  className={`glass-list-item stagger-${Math.min(i + 1, 4)}`}
                  style={{ position: 'relative', paddingLeft: 0, flexDirection: 'column', alignItems: 'stretch', gap: 0 }}
                >
                  {/* ── Main row ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 20, paddingRight: 12, paddingTop: 12, paddingBottom: 12, position: 'relative' }}>

                    {/* 左側顏色條 */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: 4, background: barColor, borderRadius: '4px 0 0 4px',
                    }} />

                    {/* 頻道頭像 */}
                    {item.channelThumbnail ? (
                      <Image
                        src={item.channelThumbnail}
                        alt={item.channelName}
                        width={48} height={48}
                        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ink-05)', flexShrink: 0 }} />
                    )}

                    {/* 內容 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: style.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {item.riskScore}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 9999, background: 'rgba(255,255,255,0.55)',
                          border: '1px solid rgba(255,255,255,0.80)',
                          color: 'var(--text-secondary)', letterSpacing: '-0.01em',
                        }}>
                          {style.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                        {item.channelName}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
                        {new Date(item.checkedAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                        {' · '}
                        {new Date(item.checkedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* 查看完整詳情 ↗ */}
                    <a href={`/history/${encodeURIComponent(item.checkedAt)}`} aria-label="查看評分結果"
                      className="glass-avatar"
                      style={{ width: 32, height: 32, color: 'var(--text-primary)', textDecoration: 'none', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7" /><polyline points="7 7 17 7 17 17" />
                      </svg>
                    </a>

                    {/* 展開 chevron */}
                    <button
                      onClick={() => toggleExpand(itemId)}
                      aria-label={isExpanded ? '收合預覽' : '展開預覽'}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isExpanded ? 'rgba(255,183,3,0.15)' : 'rgba(255,255,255,0.55)',
                        border: `1px solid ${isExpanded ? 'rgba(255,183,3,0.4)' : 'rgba(255,255,255,0.8)'}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
                      <svg
                        width="13" height="13"
                        viewBox="0 0 24 24" fill="none"
                        stroke="var(--text-primary)" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.22s ease-out',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* ── Inline expand panel ── */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid rgba(43,24,16,0.08)',
                      padding: '14px 20px 16px',
                      background: 'rgba(255,246,230,0.45)',
                    }}>

                      {/* 5 維度 */}
                      {dims.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                          {dims.map(({ key, label, dim }) => {
                            const dimColor = ratingToColor(dim.rating as DimRating)
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                  fontSize: 11, fontWeight: 700,
                                  color: 'var(--text-secondary)',
                                  letterSpacing: '0.01em',
                                  width: 28, flexShrink: 0,
                                }}>
                                  {label}
                                </span>
                                {/* Stars */}
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[1,2,3,4,5].map(n => (
                                    <svg key={n} width="10" height="10" viewBox="0 0 24 24"
                                      fill={n <= dim.stars ? dimColor : 'none'}
                                      stroke={n <= dim.stars ? dimColor : 'rgba(43,24,16,0.2)'}
                                      strokeWidth="2">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                  ))}
                                </div>
                                {/* Rating chip */}
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  color: dimColor,
                                  letterSpacing: '0.02em',
                                }}>
                                  {dim.rating}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* AI summary 摘要 */}
                      {summarySnippet && (
                        <p style={{
                          fontSize: 13,
                          color: 'rgba(43,24,16,0.85)',
                          lineHeight: 1.65,
                          letterSpacing: '-0.01em',
                          marginBottom: 10,
                          fontFamily: 'var(--font-noto-tc), "Noto Sans TC", "PingFang TC", sans-serif',
                        }}>
                          {summarySnippet}
                        </p>
                      )}

                      {/* 看完整詳情 */}
                      <a
                        href={`/history/${encodeURIComponent(item.checkedAt)}`}
                        style={{
                          fontSize: 12, fontWeight: 700,
                          color: 'var(--honey-deep, #B87A00)',
                          textDecoration: 'none',
                          letterSpacing: '0.01em',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        看完整詳情
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        .glass-list-item {
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0 !important;
          overflow: hidden;
        }
      `}</style>
    </main>
  )
}
