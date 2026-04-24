export type RiskLevel = 'high' | 'medium' | 'low'

export interface WarningComment {
  text: string
  textZh?: string // 繁中翻譯（若原文非中文）
  author?: string
  likeCount?: number
}

export interface ScoreBreakdownItem {
  label: string
  points: number // 正數為加分，負數為減分
  category: 'ai' | 'comment' | 'combo' | 'blacklist' | 'adjustment'
}

export interface AnalysisResult {
  riskLevel: RiskLevel
  riskScore: number // 0-100
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
