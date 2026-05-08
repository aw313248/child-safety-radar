export type RiskLevel = 'high' | 'medium' | 'low' | 'adult_inappropriate'

// ── 拿鐵媽媽 v1.0 低刺激評分 framework ─────────────────────────
// framework 啟發自 @happy.3clatte（授權確認後改「授權使用」）

export interface ScoreDimension {
  stars: 1 | 2 | 3 | 4 | 5
  rating: '優' | '良' | '普' | '不建議'
  reason: string
}

export interface ChannelScore {
  pacing: ScoreDimension      // 畫面節奏
  visual: ScoreDimension      // 視覺環境
  auditory: ScoreDimension    // 聲音與互動
  realism: ScoreDimension     // 敘事與真實性
  behavioral: ScoreDimension  // 觀後反應
  overallRating: '高度推薦' | '中度符合' | '不建議觀看'
  overallStimulation: '低刺激' | '中刺激' | '高刺激'
  ageRange: string            // 例 "18 個月-3 歲"
  guidelines: ('AAP' | 'WHO')[]
  recommendation: string
}

export interface WarningComment {
  text: string
  textZh?: string // 繁中翻譯（若原文非中文）
  author?: string
  likeCount?: number
  videoId?: string      // 來源影片 ID（讓家長可驗證）
  videoTitle?: string   // 來源影片標題
  commentId?: string    // 原留言 ID（用於 YouTube deep link）
  sourceUrl?: string    // 可點擊回到 YouTube 驗證的完整網址
}

export interface ScoreBreakdownItem {
  label: string
  points: number // 正數為加分，負數為減分
  category: 'ai' | 'comment' | 'combo' | 'blacklist' | 'adjustment'
}

export interface AnalysisResult {
  riskLevel: RiskLevel
  riskScore: number // 0-100
  channelScore?: ChannelScore  // 拿鐵媽媽 v1.0 低刺激 5 維度評分
  riskType?: string // 'elsagate' | 'child_magnet' | 'adult_only' | 'mixed'（AI 判定的類型，用於前端顯示特殊標籤）
  channelId?: string // UC… YouTube 頻道 ID，用於兒童模式播放器
  channelName: string
  channelThumbnail?: string
  videoCount?: number
  commentsDisabled: boolean
  warningComments: WarningComment[]
  suspiciousTags: string[]
  aiSummary: string
  recommendation: string
  checkedAt: string
  channelUrl: string
  scoreBreakdown: ScoreBreakdownItem[]
}
