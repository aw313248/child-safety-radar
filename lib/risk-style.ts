import type { RiskLevel } from '@/types/analysis'

// 共用：riskLevel → 標籤文字 + 顏色 CSS token
// 使用：app/history/page.tsx、app/history/[id]/page.tsx
export const RISK_STYLE: Record<RiskLevel, { label: string; color: string }> = {
  high:                { label: '高風險',        color: 'var(--risk-red)' },
  medium:              { label: '注意觀察',      color: 'var(--risk-orange)' },
  low:                 { label: '目前安全',      color: 'var(--risk-green)' },
  adult_inappropriate: { label: '成人露骨內容',  color: '#E07B00' },
}
