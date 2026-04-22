export type RiskLevel = 'high' | 'medium' | 'low'

export interface WarningComment {
  text: string
  author?: string
  likeCount?: number
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
}
