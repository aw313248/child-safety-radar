export type RiskLevel = 'high' | 'medium' | 'low'

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
