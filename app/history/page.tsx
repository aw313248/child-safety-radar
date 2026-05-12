'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { AnalysisResult } from '@/types/analysis'

const HISTORY_KEY = 'child_radar_history'

const RISK_STYLE = {
  high:                { label: '高風險',        color: 'var(--risk-red)' },
  medium:              { label: '注意觀察',      color: 'var(--risk-orange)' },
  low:                 { label: '目前安全',      color: 'var(--risk-green)' },
  adult_inappropriate: { label: '成人露骨內容',  color: '#E07B00' },
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
              return (
                <div key={item.channelUrl + i}
                  className={`glass-list-item stagger-${Math.min(i + 1, 4)}`}
                  style={{ position: 'relative', overflow: 'hidden', paddingLeft: 16 }}>

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

                  {/* 查看評分 */}
                  <a href={`/history/${encodeURIComponent(item.checkedAt)}`} aria-label="查看評分結果"
                    className="glass-avatar"
                    style={{ width: 32, height: 32, color: 'var(--text-primary)', textDecoration: 'none', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7" /><polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
