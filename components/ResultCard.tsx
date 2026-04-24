'use client'

import Image from 'next/image'
import { useState } from 'react'
import { AnalysisResult, ScoreBreakdownItem } from '@/types/analysis'
import DiscussionReporter from './DiscussionReporter'
import ShareQRModal from './ShareQRModal'

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
    barColor: 'var(--risk-red)',
    scoreColor: 'var(--risk-red)',
  },
  medium: {
    label: '注意觀察',
    tagline: '建議家長全程陪同',
    badgeClass: 'badge-medium',
    barColor: 'var(--risk-orange)',
    scoreColor: 'var(--risk-orange)',
  },
  low: {
    label: '目前安全',
    tagline: '相對安全，仍建議偶爾確認',
    badgeClass: 'badge-low',
    barColor: 'var(--risk-green)',
    scoreColor: 'var(--risk-green)',
  },
}

export default function ResultCard({ result, onReset }: Props) {
  const cfg = RISK_CONFIG[result.riskLevel]
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const handleShare = async () => {
    const shareText = `【PeekKids 掃描結果】\n${result.channelName}\n風險等級：${cfg.label}\n\n${result.aiSummary.slice(0, 80)}...\n\nPeekKids — 越「皮」的孩子，越要先 Peek 過`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PeekKids', text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('已複製，可貼到 Line 或 FB 分享給其他家長')
      }
    } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Risk header */}
      <div className="card stagger-1" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <span className={cfg.badgeClass} style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              marginBottom: '6px',
              letterSpacing: '-0.01em',
            }}>
              {cfg.label}
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>{cfg.tagline}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 700, color: cfg.scoreColor, lineHeight: 1, letterSpacing: '-0.04em' }}>
              {result.riskScore}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>/ 100</div>
          </div>
        </div>

        <div style={{ background: 'rgba(60,60,67,0.08)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${result.riskScore}%`,
            background: cfg.barColor,
            borderRadius: 99,
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
      <div className="card stagger-2" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '12px' }}>
          {result.channelThumbnail && (
            <Image
              src={result.channelThumbnail}
              alt={result.channelName}
              width={38}
              height={38}
              style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {result.channelName}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', letterSpacing: '-0.01em' }}>
              {result.commentsDisabled ? '⚠️ 留言區已關閉' : '留言區開啟'}
              {result.videoCount ? ` · ${result.videoCount} 部影片` : ''}
            </p>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
          {result.aiSummary}
        </p>
      </div>

      {/* Warning comments */}
      {result.warningComments.length > 0 && (
        <div className="card stagger-3" style={{ padding: '18px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
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
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
                    「{comment.text}」
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  {comment.author && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>— {comment.author}</span>
                  )}
                  {comment.likeCount !== undefined && comment.likeCount > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>👍 {comment.likeCount}</span>
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

      {/* Suspicious tags */}
      {result.suspiciousTags.length > 0 && (
        <div className="card stagger-3" style={{ padding: '18px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '10px' }}>
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

      {/* Recommendation */}
      <div className="card stagger-4" style={{ padding: '18px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
          建議
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, letterSpacing: '-0.01em' }}>
          {result.recommendation}
        </p>
      </div>

      {/* UGC：評分回報 + 討論補充 */}
      <DiscussionReporter
        channelName={result.channelName}
        channelUrl={result.channelUrl}
        riskScore={result.riskScore}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
        <button
          onClick={() => setShowQR(true)}
          className="btn-secondary"
          style={{ flex: 1, fontSize: '13px', padding: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          title="用 QR code 傳給另一台裝置"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="14.01"/>
            <line x1="20" y1="14" x2="20" y2="14.01"/><line x1="14" y1="20" x2="14" y2="20.01"/>
            <line x1="20" y1="20" x2="20" y2="20.01"/><line x1="17" y1="17" x2="17" y2="17.01"/>
          </svg>
          傳給裝置
        </button>
        <button onClick={handleShare} className="btn-secondary" style={{ flex: 1, fontSize: '13px', padding: '12px' }}>
          分享
        </button>
        <button onClick={onReset} className="btn-primary" style={{ flex: 2, fontSize: '13px', padding: '12px' }}>
          再掃一個
        </button>
      </div>

      {showQR && <ShareQRModal result={result} onClose={() => setShowQR(false)} />}

      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>
        {new Date(result.checkedAt).toLocaleString('zh-TW')} · AI 輔助分析，僅供參考
      </p>
    </div>
  )
}
