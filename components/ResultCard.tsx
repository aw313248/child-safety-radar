'use client'

import Image from 'next/image'
import { useState } from 'react'
import { AnalysisResult, ScoreBreakdownItem } from '@/types/analysis'
import DiscussionReporter from './DiscussionReporter'
import ShareQRModal from './ShareQRModal'
import AddToKidsMode from './AddToKidsMode'
import Mascot from './Mascot'

const CATEGORY_LABEL: Record<ScoreBreakdownItem['category'], string> = {
  ai: 'AI 分析',
  comment: '留言訊號',
  combo: '組合訊號',
  blacklist: '黑名單',
  adjustment: '修正',
}

interface Props {
  result: AnalysisResult
  onReset: () => void
}

const RISK_CONFIG = {
  high: {
    label: '高風險',
    tagline: '不建議讓孩子觀看',
    badgeClass: 'badge-high',
    barColor: 'var(--terra-hex)',
    scoreColor: 'var(--terra-hex)',
    headerBg: '#FFE8E0',
    icon: 'octagon-x' as const,
  },
  medium: {
    label: '注意觀察',
    tagline: '建議家長全程陪同',
    badgeClass: 'badge-medium',
    barColor: 'var(--honey-deep)',
    scoreColor: 'var(--honey-deep)',
    headerBg: 'var(--honey-hex)',
    icon: 'eye' as const,
  },
  low: {
    label: '目前安全',
    tagline: '相對安全，仍建議偶爾確認',
    badgeClass: 'badge-low',
    barColor: 'var(--risk-green)',
    scoreColor: 'var(--risk-green)',
    headerBg: '#DCEAD1',
    icon: 'shield-check' as const,
  },
}

// 統一線條 icon — 1.8px stroke，跟 storybook 風格一致（取代 emoji）
function RiskIcon({ name, size = 14 }: { name: 'octagon-x' | 'eye' | 'shield-check'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'octagon-x') return (
    <svg {...common}><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  )
  if (name === 'eye') return (
    <svg {...common}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
  )
  return (
    <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
  )
}

export default function ResultCard({ result, onReset }: Props) {
  const cfg = RISK_CONFIG[result.riskLevel]
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showQR, setShowQR] = useState(false)
  // distill：警示留言 + 異常標籤 + 熊爸熊媽建議 默認折疊，預設只看分數 + 摘要 + CTA
  const [showDetails, setShowDetails] = useState(false)

  const handleShare = async () => {
    const shareText = `【CareCub Kids 掃描結果】\n${result.channelName}\n風險等級：${cfg.label}\n\n${result.aiSummary.slice(0, 80)}...\n\nCareCub Kids — 越「皮」的孩子，越要先 Peek 過`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CareCub Kids', text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('已複製，可貼到 Line 或 FB 分享給其他家長')
      }
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Risk header — Busy Bee big score card */}
      <div className="bee-card stagger-1" style={{ padding: '24px', background: cfg.headerBg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '12px',
              fontWeight: 900,
              padding: '5px 12px',
              borderRadius: 9999,
              background: 'var(--ink-hex)',
              color: cfg.scoreColor,
              marginBottom: '10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              border: '2px solid var(--ink-hex)',
            }}>
              <RiskIcon name={cfg.icon} size={14} /> {cfg.label}
            </div>
            <p className="font-display" style={{ fontSize: 22, color: 'var(--ink-hex)', lineHeight: 1.1 }}>
              {cfg.tagline}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="font-display" style={{ fontSize: '64px', color: cfg.scoreColor, lineHeight: 0.9, letterSpacing: '-0.06em' }}>
              {result.riskScore}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-hex)', marginTop: '4px', fontWeight: 800, opacity: 0.6, letterSpacing: '0.08em' }}>/ 100</div>
          </div>
        </div>

        <div style={{ background: 'rgba(43,24,16,0.12)', borderRadius: 99, height: 8, overflow: 'hidden', border: '2px solid var(--ink-hex)' }}>
          <div style={{
            height: '100%',
            width: `${result.riskScore}%`,
            background: cfg.barColor,
            transition: 'width 1s var(--ease-out)',
          }} />
        </div>

        {/* 評分依據展開按鈕 */}
        {result.scoreBreakdown && result.scoreBreakdown.length > 0 && (
          <>
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              style={{
                marginTop: '14px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '8px 0',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                letterSpacing: '-0.01em',
              }}
            >
              {showBreakdown ? '收合' : '為什麼是這個分數？'}
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.2s var(--ease-out)',
                transform: showBreakdown ? 'rotate(180deg)' : 'rotate(0)',
                fontSize: '10px',
              }}>▼</span>
            </button>

            {showBreakdown && (
              <div className="animate-fade-scale-in" style={{
                marginTop: '4px',
                padding: '14px',
                background: 'var(--surface-raised)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {result.scoreBreakdown.map((item, i) => {
                  const isAdd = item.points >= 0
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                      paddingBottom: i < result.scoreBreakdown.length - 1 ? '8px' : 0,
                      borderBottom: i < result.scoreBreakdown.length - 1 ? '1px solid var(--separator)' : 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '1px 7px',
                          borderRadius: 'var(--radius-pill)',
                          background: 'rgba(60,60,67,0.08)',
                          color: 'var(--text-secondary)',
                          marginBottom: '3px',
                          letterSpacing: '-0.01em',
                        }}>
                          {CATEGORY_LABEL[item.category]}
                        </div>
                        <p style={{
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          lineHeight: 1.45,
                          letterSpacing: '-0.01em',
                        }}>
                          {item.label}
                        </p>
                      </div>
                      <div style={{
                        fontWeight: 700,
                        fontSize: '13px',
                        color: isAdd ? (item.points >= 20 ? 'var(--risk-red)' : 'var(--risk-orange)') : 'var(--risk-green)',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.02em',
                      }}>
                        {isAdd ? '+' : ''}{item.points}
                      </div>
                    </div>
                  )
                })}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  marginTop: '4px',
                  borderTop: '1.5px solid var(--separator)',
                  fontWeight: 700,
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>總分</span>
                  <span style={{ fontSize: '16px', color: cfg.scoreColor, letterSpacing: '-0.02em' }}>
                    {result.riskScore} / 100
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Channel info */}
      <div className="bee-card stagger-2" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          {result.channelThumbnail && (
            <Image
              src={result.channelThumbnail}
              alt={result.channelName}
              width={40}
              height={40}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--ink-hex)', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 900, fontSize: '15px', letterSpacing: '-0.03em', color: 'var(--ink-hex)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {result.channelName}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: 'rgba(43,24,16,0.5)', fontWeight: 600, letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {result.commentsDisabled
                    ? <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/></>
                    : <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
                </svg>
                {result.commentsDisabled ? '留言關閉' : '留言開啟'}
              </span>
              {result.videoCount ? (
                <span style={{ fontSize: '10px', color: 'rgba(43,24,16,0.5)', fontWeight: 600, letterSpacing: '0.02em' }}>
                  {result.videoCount} 部影片
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--ink-hex)', lineHeight: 1.7, letterSpacing: '-0.005em', fontWeight: 500, opacity: 0.8 }}>
          {result.aiSummary}
        </p>
      </div>

      {/* 折疊：警示留言 / 異常標籤 / 建議 默認收起，使用者按了才展開（distill） */}
      {(result.warningComments.length > 0 || result.suspiciousTags.length > 0 || result.recommendation) && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          aria-expanded={showDetails}
          style={{
            width: '100%', padding: '13px 18px',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            border: '1px solid rgba(43,24,16,0.14)',
            borderRadius: 14,
            color: 'var(--ink-hex)',
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'background 0.18s',
          }}
        >
          <span>
            {showDetails ? '收合' : '看詳細分析'}
            {!showDetails && result.warningComments.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(43,24,16,0.6)', marginLeft: 6 }}>
                · {result.warningComments.length} 則家長警示留言
              </span>
            )}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Warning comments — 折疊內 */}
      {showDetails && result.warningComments.length > 0 && (
        <div className="bee-card stagger-3" style={{ padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px', opacity: 0.75, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            家長警示留言
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.warningComments.map((comment, i) => (
              <div key={i} style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', padding: '11px 13px' }}>
                {comment.textZh ? (
                  <>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, letterSpacing: '-0.01em', fontWeight: 500 }}>
                      「{comment.textZh}」
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5, marginTop: '4px', letterSpacing: '-0.01em' }}>
                      原文：{comment.text}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
                      「{comment.text}」
                    </p>
                    {/* 翻譯失敗 fallback — 告訴使用者為什麼只剩原文 */}
                    {/[a-zA-Z]/.test(comment.text) && (
                      <p style={{ fontSize: '10px', color: 'var(--cc-red-deep)', lineHeight: 1.4, marginTop: '4px', letterSpacing: '-0.005em', fontWeight: 600 }}>
                        ⓘ AI 翻譯失敗，這是英文原句
                      </p>
                    )}
                  </>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  {comment.author && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>— {comment.author}</span>
                  )}
                  {comment.likeCount !== undefined && comment.likeCount > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                      </svg>
                      {comment.likeCount}
                    </span>
                  )}
                  {comment.sourceUrl && (
                    <a
                      href={comment.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '11px',
                        color: 'var(--forest-mid)',
                        textDecoration: 'none',
                        letterSpacing: '-0.01em',
                        marginLeft: 'auto',
                        fontWeight: 500,
                      }}
                      title={comment.videoTitle ? `來源影片：${comment.videoTitle}` : '在 YouTube 查看原留言'}
                    >
                      → 看原文
                    </a>
                  )}
                </div>
                {comment.videoTitle && (
                  <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '3px', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    出自影片：{comment.videoTitle}
                  </p>
                )}
              </div>
            ))}
            <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em', marginTop: '2px', lineHeight: 1.5 }}>
              中文為 AI 翻譯，僅供參考，點「看原文」可到 YouTube 驗證真偽
            </p>
          </div>
        </div>
      )}

      {/* Suspicious tags — 折疊內 */}
      {showDetails && result.suspiciousTags.length > 0 && (
        <div className="bee-card stagger-3" style={{ padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px', opacity: 0.75, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            異常標籤
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {result.suspiciousTags.map((tag, i) => (
              <span key={i} className={cfg.badgeClass} style={{
                fontSize: '12px',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                letterSpacing: '-0.01em',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation — 折疊內 */}
      {showDetails && (
      <div className="bee-card-honey stagger-4" style={{ padding: '20px' }}>
        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px', opacity: 0.75, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
            border: '1.5px solid var(--ink-hex)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            <Mascot pose="hi" size={14} />
          </span>
          熊爸熊媽建議
        </p>
        <p style={{ fontSize: '15px', color: 'var(--ink-hex)', lineHeight: 1.75, letterSpacing: '-0.01em', fontWeight: 500 }}>
          {result.recommendation}
        </p>
      </div>
      )}

      {/* 非高風險 → 給爸媽一鍵加入熊熊守護模式 */}
      <AddToKidsMode
        channelId={result.channelId}
        channelName={result.channelName}
        channelThumbnail={result.channelThumbnail}
        riskScore={result.riskScore}
        riskLevel={result.riskLevel}
      />

      {/* UGC：評分回報 + 討論補充 */}
      <DiscussionReporter
        channelName={result.channelName}
        channelUrl={result.channelUrl}
        riskScore={result.riskScore}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
        <button onClick={handleShare} className="btn-secondary" style={{ flex: 1, fontSize: '13px', padding: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          分享
        </button>
        <button
          onClick={() => setShowQR(true)}
          className="btn-secondary"
          style={{ flex: 1, fontSize: '13px', padding: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          title="用 QR code 傳給另一台裝置"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="14.01"/>
            <line x1="20" y1="14" x2="20" y2="14.01"/><line x1="17" y1="17" x2="17" y2="17.01"/>
          </svg>
          傳裝置
        </button>
        <button onClick={onReset} className="btn-pill btn-pill-honey" style={{ flex: 2, fontSize: '13px', padding: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          再掃一個
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      {showQR && <ShareQRModal result={result} onClose={() => setShowQR(false)} />}

      {(() => {
        const ageMs = Date.now() - new Date(result.checkedAt).getTime()
        const ageDays = Math.floor(ageMs / 86_400_000)
        const stale = ageDays >= 7
        return (
          <>
            {stale && (
              <div style={{
                padding: '10px 14px', marginTop: 6,
                background: 'rgba(242, 184, 75, 0.16)',
                border: '1px solid rgba(217, 148, 34, 0.4)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cc-gold-deep)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
                </svg>
                <p style={{ flex: 1, fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.5, fontWeight: 600 }}>
                  這是 {ageDays} 天前掃的，頻道內容可能變了，建議重新掃描
                </p>
              </div>
            )}
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
              {new Date(result.checkedAt).toLocaleString('zh-TW')} · AI 輔助分析，僅供參考
            </p>
          </>
        )
      })()}
    </div>
  )
}
