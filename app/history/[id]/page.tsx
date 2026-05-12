'use client'

import { useEffect, useState, use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnalysisResult } from '@/types/analysis'

const HISTORY_KEY = 'child_radar_history'

const RISK_STYLE = {
  high:                { label: '高風險',        color: 'var(--risk-red)' },
  medium:              { label: '注意觀察',      color: 'var(--risk-orange)' },
  low:                 { label: '目前安全',      color: 'var(--risk-green)' },
  adult_inappropriate: { label: '成人露骨內容',  color: '#E07B00' },
}

const RATING_COLOR: Record<string, string> = {
  '優':     'var(--risk-green)',
  '良':     'var(--risk-green)',
  '普':     'var(--risk-orange)',
  '不建議': 'var(--risk-red)',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function HistoryReviewPage({ params }: PageProps) {
  const { id } = use(params)
  const [item, setItem] = useState<AnalysisResult | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const checkedAt = decodeURIComponent(id)
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        const history: AnalysisResult[] = JSON.parse(raw)
        const found = history.find(h => h.checkedAt === checkedAt)
        if (found) setItem(found)
      }
    } catch {}
  }, [id])

  if (!mounted) return null

  if (!item) {
    return (
      <main className="page-main">
        <div className="page-wrapper">
          <nav style={{ marginBottom: 28 }}>
            <Link href="/history" className="glass-back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              返回掃描歷史
            </Link>
          </nav>
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              找不到這筆紀錄
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              可能已被清除，回掃描歷史看看其他紀錄
            </p>
          </div>
        </div>
      </main>
    )
  }

  const style = RISK_STYLE[item.riskLevel]
  const score = item.channelScore

  const dimensions = score ? [
    { key: 'pacing',     label: '畫面節奏',       data: score.pacing },
    { key: 'visual',     label: '視覺環境',       data: score.visual },
    { key: 'auditory',   label: '聲音與互動',     data: score.auditory },
    { key: 'realism',    label: '敘事與真實性',   data: score.realism },
    { key: 'behavioral', label: '觀後反應',       data: score.behavioral },
  ] : []

  return (
    <main className="page-main">
      <div className="page-wrapper">

        {/* ── Nav ── */}
        <nav style={{ marginBottom: 24 }}>
          <Link href="/history" className="glass-back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            返回掃描歷史
          </Link>
        </nav>

        {/* ── Header ── */}
        <header style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', marginBottom: 8 }}>
            歷史掃描 · {new Date(item.checkedAt).toLocaleDateString('zh-TW')}
            {' '}
            {new Date(item.checkedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.045em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
            {item.channelName}
          </h1>
        </header>

        {/* ── 風險分數 + label ── */}
        <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
          {item.channelThumbnail && (
            <Image
              src={item.channelThumbnail}
              alt={item.channelName}
              width={56} height={56}
              style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: style.color, letterSpacing: '-0.045em', lineHeight: 1 }}>
                {item.riskScore}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                borderRadius: 9999, background: style.color, color: '#fff',
                letterSpacing: '-0.01em',
              }}>
                {style.label}
              </span>
            </div>
            {score?.ageRange && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
                建議年齡：{score.ageRange}
              </p>
            )}
          </div>
        </div>

        {/* ── 5 維度評分 ── */}
        {score && (
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 14 }}>
              拿鐵媽媽 5 維度評分
            </h2>
            {dimensions.map(({ key, label, data }) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 0',
                borderBottom: key === 'behavioral' ? 'none' : '1px solid var(--ink-05)',
              }}>
                <div style={{ width: 92, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', flexShrink: 0 }}>
                  {label}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: RATING_COLOR[data.rating] || 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  {'★'.repeat(data.stars)}<span style={{ opacity: 0.25 }}>{'★'.repeat(5 - data.stars)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: RATING_COLOR[data.rating] || 'var(--text-secondary)', letterSpacing: '-0.01em', flexShrink: 0 }}>
                  {data.rating}
                </div>
              </div>
            ))}
            {score.recommendation && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 14, lineHeight: 1.6, letterSpacing: '-0.005em' }}>
                {score.recommendation}
              </p>
            )}
          </div>
        )}

        {/* ── AI 摘要 ── */}
        {item.aiSummary && (
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              AI 摘要
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, letterSpacing: '-0.005em' }}>
              {item.aiSummary}
            </p>
          </div>
        )}

        {/* ── 前往 YouTube 頻道 ── */}
        <a
          href={item.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-btn-honey"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            padding: '14px',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.5px',
            marginBottom: 12,
          }}
        >
          前往 YouTube 頻道
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7" /><polyline points="7 7 17 7 17 17" />
          </svg>
        </a>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', letterSpacing: '-0.005em' }}>
          這是歷史快照，不會重新掃描
        </p>

      </div>
    </main>
  )
}
