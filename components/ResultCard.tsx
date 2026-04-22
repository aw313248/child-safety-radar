'use client'

import Image from 'next/image'
import { AnalysisResult } from '@/types/analysis'

interface Props {
  result: AnalysisResult
  onReset: () => void
}

const RISK_CONFIG = {
  high: {
    emoji: '🔴',
    label: '高風險',
    tagline: '不建議讓孩子觀看',
    className: 'risk-high',
    textColor: 'text-red-400',
    badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40',
    barColor: 'bg-red-500',
  },
  medium: {
    emoji: '🟡',
    label: '注意觀察',
    tagline: '建議家長全程陪同',
    className: 'risk-medium',
    textColor: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    barColor: 'bg-yellow-500',
  },
  low: {
    emoji: '🟢',
    label: '目前安全',
    tagline: '相對安全，仍建議偶爾確認',
    className: 'risk-low',
    textColor: 'text-green-400',
    badgeBg: 'bg-green-500/20 text-green-400 border-green-500/40',
    barColor: 'bg-green-500',
  },
}

export default function ResultCard({ result, onReset }: Props) {
  const cfg = RISK_CONFIG[result.riskLevel]

  const handleShare = async () => {
    const shareText = `【童安雷達掃描結果】\n${result.channelName}\n風險等級：${cfg.emoji} ${cfg.label}\n\n${cfg.tagline}\n\n${result.aiSummary.slice(0, 80)}...\n\n用童安雷達保護你的孩子 👶`
    try {
      if (navigator.share) {
        await navigator.share({ title: '童安雷達', text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('已複製到剪貼板，可以貼到 Line 或 FB 分享給其他家長')
      }
    } catch {}
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Risk Badge */}
      <div className={`glass rounded-2xl p-6 border ${cfg.className}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{cfg.emoji}</span>
              <h2 className={`text-2xl font-black ${cfg.textColor}`}>{cfg.label}</h2>
            </div>
            <p className="text-white/60 text-sm">{cfg.tagline}</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${cfg.textColor}`}>{result.riskScore}</div>
            <div className="text-white/30 text-xs">風險分數 /100</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="bg-white/5 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${cfg.barColor} rounded-full transition-all duration-1000`}
            style={{ width: `${result.riskScore}%` }}
          />
        </div>
      </div>

      {/* Channel Info */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          {result.channelThumbnail && (
            <Image
              src={result.channelThumbnail}
              alt={result.channelName}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          )}
          <div>
            <p className="font-semibold text-white/90">{result.channelName}</p>
            <p className="text-xs text-white/40">
              {result.commentsDisabled ? '⚠️ 留言區已關閉（高風險訊號）' : '留言區開啟'}
              {result.videoCount ? ` · 分析 ${result.videoCount} 部影片` : ''}
            </p>
          </div>
        </div>

        {/* AI Summary */}
        <p className="text-sm text-white/70 leading-relaxed">{result.aiSummary}</p>
      </div>

      {/* Warning Comments */}
      {result.warningComments.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">
            家長警示留言 · 真實引用
          </h3>
          <div className="space-y-3">
            {result.warningComments.map((comment, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-sm text-white/80 leading-relaxed">「{comment.text}」</p>
                {(comment.author || comment.likeCount) && (
                  <div className="flex items-center gap-3 mt-2">
                    {comment.author && (
                      <span className="text-xs text-white/30">— {comment.author}</span>
                    )}
                    {comment.likeCount && comment.likeCount > 0 && (
                      <span className="text-xs text-white/25">👍 {comment.likeCount}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspicious Tags */}
      {result.suspiciousTags.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-3">
            異常標籤或關鍵字
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.suspiciousTags.map((tag, i) => (
              <span
                key={i}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${cfg.badgeBg}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-2">建議</h3>
        <p className="text-sm text-white/80 leading-relaxed">{result.recommendation}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-medium py-3 rounded-xl transition-all text-sm"
        >
          📤 分享給其他家長
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-medium py-3 rounded-xl transition-all text-sm"
        >
          🔍 分析另一個頻道
        </button>
      </div>

      <p className="text-center text-white/20 text-xs">
        分析時間 {new Date(result.checkedAt).toLocaleString('zh-TW')} · AI 輔助分析，僅供參考
      </p>
    </div>
  )
}
