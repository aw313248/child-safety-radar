'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { AnalysisResult, ChannelScore, ScoreDimension } from '@/types/analysis'
import DiscussionReporter from './DiscussionReporter'
import ShareQRModal from './ShareQRModal'
import AddToKidsMode from './AddToKidsMode'
import Mascot from './Mascot'

interface Props {
  result: AnalysisResult
  onReset: () => void
}

const RISK_CONFIG = {
  high: {
    label: '高風險',
    tagline: '不建議讓孩子觀看',
    badgeClass: 'badge-high',
    scoreColor: 'var(--terra-hex)',
    headerBg: '#FFE8E0',
    icon: 'octagon-x' as const,
  },
  medium: {
    label: '注意觀察',
    tagline: '建議家長全程陪同',
    badgeClass: 'badge-medium',
    scoreColor: 'var(--honey-deep)',
    headerBg: 'var(--honey-hex)',
    icon: 'eye' as const,
  },
  low: {
    label: '目前安全',
    tagline: '相對安全，仍建議偶爾確認',
    badgeClass: 'badge-low',
    scoreColor: 'var(--risk-green)',
    headerBg: '#DCEAD1',
    icon: 'shield-check' as const,
  },
  adult_inappropriate: {
    label: '⚠️ 成人內容，不適合兒童',
    tagline: '含明確成人露骨元素，請勿讓孩子觀看',
    badgeClass: 'badge-high',
    scoreColor: '#E07B00',
    headerBg: '#FFF0DC',
    icon: 'octagon-x' as const,
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

const BLACKLIST_KEY = 'cc_user_blacklist'

// ── 拿鐵媽媽 v1.0 低刺激評分卡 ─────────────────────────────────
// framework 啟發自 @happy.3clatte（Threads）
// 授權確認前以「framework 啟發自」標示

const DIMENSION_LABELS: Record<keyof Pick<ChannelScore, 'pacing'|'visual'|'auditory'|'realism'|'behavioral'>, string> = {
  pacing:    '畫面節奏 (Pacing)',
  visual:    '視覺環境 (Visual)',
  auditory:  '聲音與互動 (Auditory)',
  realism:   '敘事與真實性 (Realism)',
  behavioral:'觀後反應 (Behavioral)',
}

const OVERALL_BANNER: Record<ChannelScore['overallRating'], { bg: string; text: string; headline: string }> = {
  '高度推薦': {
    bg: 'var(--risk-green)',
    text: '#fff',
    headline: '這個頻道符合低刺激標準',
  },
  '中度符合': {
    bg: 'var(--terra-hex)',
    text: '#fff',
    headline: '這個頻道有部分指標需注意，建議家長陪同觀看',
  },
  '不建議觀看': {
    bg: 'var(--adult-orange-hex)',
    text: '#fff',
    headline: '這個頻道高頻刺激，AAP 不建議 2 歲以下單獨觀看',
  },
}

function StarRow({ dim }: { dim: ScoreDimension }) {
  const filled = dim.stars
  const ratingColor =
    dim.rating === '優' ? 'var(--risk-green)' :
    dim.rating === '良' ? '#4A8A6B' :
    dim.rating === '普' ? 'var(--honey-deep)' : 'var(--adult-orange-hex)'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginTop: 1 }}>
        {[1,2,3,4,5].map(n => (
          <span key={n} style={{
            fontSize: 16,
            color: n <= filled ? '#F2B84B' : 'rgba(43,24,16,0.18)',
            lineHeight: 1,
          }}>★</span>
        ))}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: ratingColor,
        letterSpacing: '-0.01em',
        flexShrink: 0,
      }}>（{dim.rating}）</span>
      <span style={{
        fontSize: 13, color: 'rgba(43,24,16,0.72)',
        letterSpacing: '-0.01em', lineHeight: 1.55,
      }}>{dim.reason}</span>
    </div>
  )
}

function LowStimCard({ score }: { score: ChannelScore }) {
  const banner = OVERALL_BANNER[score.overallRating]
  const dims = Object.entries(DIMENSION_LABELS) as [keyof typeof DIMENSION_LABELS, string][]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── 頂部 Overall Rating Banner ── */}
      <div style={{
        background: banner.bg,
        color: banner.text,
        borderRadius: '20px 20px 0 0',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
            低刺激影片評等
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            {banner.headline}
          </div>
        </div>
        <div style={{
          flexShrink: 0,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 12,
          padding: '6px 14px',
          fontSize: 14, fontWeight: 800,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}>
          {score.overallRating}
        </div>
      </div>

      {/* ── 5 維度詳細 ── */}
      <div className="glass-card" style={{
        borderRadius: '0 0 20px 20px',
        padding: '20px 20px 16px',
        display: 'flex', flexDirection: 'column', gap: 16,
        border: '1px solid rgba(255,255,255,0.80)',
        borderTop: '1px solid rgba(43,24,16,0.07)',
      }}>
        {dims.map(([key, label]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{
              fontSize: 12, fontWeight: 800,
              color: 'var(--ink-hex)',
              letterSpacing: '-0.01em',
              opacity: 0.6,
            }}>{label}</div>
            <StarRow dim={score[key]} />
          </div>
        ))}

        {/* ── 刺激等級 + 適合年齡 ── */}
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          paddingTop: 12,
          borderTop: '1px solid rgba(43,24,16,0.08)',
        }}>
          {[
            { label: '刺激等級', value: score.overallStimulation },
            { label: '適合年齡', value: score.ageRange },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', gap: 6, alignItems: 'center',
              background: 'rgba(43,24,16,0.04)',
              borderRadius: 9999,
              padding: '5px 12px',
              fontSize: 12,
            }}>
              <span style={{ color: 'rgba(43,24,16,0.5)', fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: 'var(--ink-hex)', fontWeight: 800, letterSpacing: '-0.01em' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* ── AAP / WHO 引用區 ── */}
        {score.guidelines.length > 0 && (
          <div style={{
            background: 'rgba(74,138,92,0.06)',
            border: '1px solid rgba(74,138,92,0.2)',
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--risk-green)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {score.guidelines.join(' + ')} 育兒準則
            </div>
            {score.guidelines.includes('AAP') && (
              <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.72)', lineHeight: 1.6, letterSpacing: '-0.005em' }}>
                <strong>AAP（美國兒科學會）：</strong>1 歲以下不建議螢幕時間；2-5 歲每日不超過 1 小時，且建議家長陪同
              </p>
            )}
            {score.guidelines.includes('WHO') && (
              <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.72)', lineHeight: 1.6, letterSpacing: '-0.005em' }}>
                <strong>WHO（世界衛生組織）：</strong>2-4 歲每日靜態螢幕時間不超過 1 小時，「愈少愈好」
              </p>
            )}
            {score.ageRange !== '待確認' && (
              <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.72)', lineHeight: 1.6 }}>
                本頻道評估適合年齡：<strong>{score.ageRange}</strong>
              </p>
            )}
          </div>
        )}

        {/* ── 家長建議（從 AI 輸出） ── */}
        <p style={{
          fontSize: 13, fontWeight: 600,
          color: 'var(--ink-hex)',
          letterSpacing: '-0.01em',
          lineHeight: 1.6,
          padding: '8px 12px',
          background: 'rgba(242,184,75,0.10)',
          borderRadius: 10,
          borderLeft: '3px solid var(--honey-hex)',
        }}>
          {score.recommendation}
        </p>

        {/* ── Credit + 免責聲明 ── */}
        <div style={{
          paddingTop: 12,
          borderTop: '1px dashed rgba(43,24,16,0.12)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.5)', lineHeight: 1.6, letterSpacing: '-0.005em' }}>
            評分標準 framework 啟發自拿鐵媽媽（@happy.3clatte）整理 + AAP/WHO 育兒標準 ·{' '}
            <a
              href="https://www.threads.net/@happy.3clatte"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'rgba(43,24,16,0.6)', textDecoration: 'underline' }}
            >
              Threads 查看原文
            </a>
          </p>
          <p style={{ fontSize: 10, color: 'rgba(43,24,16,0.38)', lineHeight: 1.65, letterSpacing: '-0.005em' }}>
            本評估為 AI 自動化分析，僅供家長參考，非專業醫療或教育診斷建議 · 影片內容可能隨平台更新而變動，建議於孩子觀看前再次確認 · 對於因參考本評估產生的任何行為或影響，本工具及其創作者不承擔法律責任
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResultCard({ result, onReset }: Props) {
  // riskLevel 直接決定 config（adult_inappropriate 來自後端關鍵字偵測）
  const cfg = RISK_CONFIG[result.riskLevel] ?? RISK_CONFIG.high
  // overstimulating：覆寫 medium 文案（不改 config，只 override 顯示文字）
  const isOverstimulating = result.riskType === 'overstimulating' && result.riskLevel === 'medium'
  const displayLabel   = isOverstimulating ? '⚠️ 過度刺激爭議' : cfg.label
  const displayTagline = isOverstimulating ? '有過度刺激爭議，建議陪同觀看' : cfg.tagline
  const [showQR, setShowQR] = useState(false)
  // distill：警示留言 + 異常標籤 + 熊爸熊媽建議 默認折疊，預設只看分數 + 摘要 + CTA
  const [showDetails, setShowDetails] = useState(false)
  const [isBlacklisted, setIsBlacklisted] = useState(false)

  // 掛載時檢查是否已在黑名單（backward compat：支援舊 string[] 格式）
  useEffect(() => {
    if (!result.channelId) return
    try {
      const raw = JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]')
      const inList = raw.some((item: string | { channelId: string }) =>
        typeof item === 'string' ? item === result.channelId : item.channelId === result.channelId
      )
      setIsBlacklisted(inList)
    } catch {}
  }, [result.channelId])

  const handleBlacklist = () => {
    if (!result.channelId) return
    try {
      const raw = JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]')
      // 移除舊條目（不論是 string 還是物件格式），再統一存新物件格式
      const filtered = raw.filter((item: string | { channelId: string }) =>
        typeof item === 'string' ? item !== result.channelId : item.channelId !== result.channelId
      )
      filtered.push({
        channelId: result.channelId,
        channelName: result.channelName,
        blacklistedAt: new Date().toISOString(),
      })
      localStorage.setItem(BLACKLIST_KEY, JSON.stringify(filtered))
      setIsBlacklisted(true)
    } catch {}
  }

  const handleShare = async () => {
    const shareText = `【CareCub 掃描結果】\n${result.channelName}\n風險等級：${displayLabel}\n\n${result.aiSummary.slice(0, 80)}...\n\nCareCub — 越「皮」的孩子，越要先 Peek 過`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CareCub', text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('已複製，可貼到 Line 或 FB 分享給其他家長')
      }
    } catch {}
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── adult_inappropriate 大字警示 banner ── */}
      {result.riskLevel === 'adult_inappropriate' && (
        <div style={{
          background: 'var(--adult-orange-hex)',
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          padding: 16,
          borderRadius: 12,
          marginBottom: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          lineHeight: 1.45,
        }}>
          <span>⚠️ 此頻道含成人露骨內容，不適合兒童觀看</span>
          <button
            onClick={handleBlacklist}
            disabled={isBlacklisted}
            style={{
              alignSelf: 'flex-start',
              background: isBlacklisted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.95)',
              color: isBlacklisted ? 'rgba(255,255,255,0.7)' : 'var(--adult-orange-hex)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: isBlacklisted ? 'default' : 'pointer',
              transition: 'background 0.2s, color 0.2s',
              fontFamily: 'inherit',
              minHeight: 44,
            }}
          >
            {isBlacklisted ? '✓ 已列入黑名單' : '⚑ 列入我的黑名單'}
          </button>
        </div>
      )}

      {/* Risk header — apple glass score card */}
      <div className="bee-card stagger-1" style={{
        padding: '28px',
        background: cfg.headerBg,
        borderRadius: 24,
      }}>
        <div style={{ marginBottom: '20px', animation: 'stagger-in 0.4s var(--ease-out) forwards 0.05s', opacity: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '11px',
            fontWeight: 900,
            padding: '5px 12px',
            borderRadius: 9999,
            background: 'var(--ink-hex)',
            color: cfg.scoreColor,
            marginBottom: '12px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            border: '2px solid var(--ink-hex)',
          }}>
            <RiskIcon name={cfg.icon} size={13} /> {displayLabel}
          </div>
          <p className="font-display" style={{ fontSize: 20, color: 'var(--ink-hex)', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
            {displayTagline}
          </p>
          {isOverstimulating && (
            <p style={{ fontSize: 12, color: 'var(--ink-hex)', opacity: 0.65, marginTop: 8, lineHeight: 1.55, fontWeight: 500, letterSpacing: '-0.01em' }}>
              快節奏 + 強聲光可能影響幼兒注意力，不建議長時間連續觀看
            </p>
          )}
        </div>

      </div>

      {/* Channel info */}
      <div className="bee-card stagger-2" style={{ padding: '20px 24px', borderRadius: 20 }}>
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
          className="glass-hover-lift glass-press"
          style={{
            width: '100%', padding: '14px 20px',
            background: 'rgba(255,255,255,0.58)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(43,24,16,0.10)',
            borderRadius: 20,
            color: 'var(--ink-hex)',
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 2px 12px rgba(43,24,16,0.06), inset 0 1px 0 rgba(255,255,255,0.90)',
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
        <div className="bee-card stagger-3" style={{ padding: '20px', borderRadius: 20 }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '14px', opacity: 0.75, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            家長警示留言
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.warningComments.map((comment, i) => (
              <div key={i} className="glass-subtle glass-hover-lift" style={{
                padding: '13px 15px',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.65)',
              }}>
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
        <div className="bee-card stagger-3" style={{ padding: '20px', borderRadius: 20 }}>
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
      <div className="bee-card-honey stagger-4" style={{ padding: '20px', borderRadius: 20 }}>
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
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
        {/* 分享 — 次按鈕（毛玻璃透明底） */}
        <button
          onClick={handleShare}
          className="glass-press"
          style={{
            flex: 1, fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em',
            padding: '13px 12px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: 'rgba(255,255,255,0.60)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid rgba(43,24,16,0.18)',
            borderRadius: 20,
            color: 'var(--ink-hex)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(43,24,16,0.06), inset 0 1px 0 rgba(255,255,255,0.80)',
            transition: 'background 0.18s',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          分享
        </button>
        {/* 傳裝置 — 次按鈕 */}
        <button
          onClick={() => setShowQR(true)}
          className="glass-press"
          style={{
            flex: 1, fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em',
            padding: '13px 12px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: 'rgba(255,255,255,0.60)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid rgba(43,24,16,0.18)',
            borderRadius: 20,
            color: 'var(--ink-hex)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(43,24,16,0.06), inset 0 1px 0 rgba(255,255,255,0.80)',
            transition: 'background 0.18s',
          }}
          title="用 QR code 傳給另一台裝置"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="14.01"/>
            <line x1="20" y1="14" x2="20" y2="14.01"/><line x1="17" y1="17" x2="17" y2="17.01"/>
          </svg>
          傳裝置
        </button>
        {/* 再掃一個 — 主按鈕（蜂蜜金底 + ink 邊框） */}
        <button
          onClick={onReset}
          className="glass-press"
          style={{
            flex: 2, fontSize: '14px', fontWeight: 900, letterSpacing: '-0.02em',
            padding: '14px 16px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'var(--honey-hex)',
            border: '2px solid var(--ink-hex)',
            borderRadius: 20,
            color: 'var(--ink-hex)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '3px 3px 0 var(--ink-hex)',
            transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
          }}
        >
          再掃一個
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>

      {showQR && <ShareQRModal result={result} onClose={() => setShowQR(false)} />}

      {/* ── 拿鐵媽媽 v1.0 低刺激評分卡 ── */}
      {result.channelScore && <LowStimCard score={result.channelScore} />}

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
