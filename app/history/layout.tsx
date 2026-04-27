import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '歷史紀錄 — 你掃過的頻道',
  description: '查看你之前用 CareCub Kids 掃過的 YouTube 頻道分析結果',
  alternates: { canonical: '/history' },
  robots: { index: false, follow: true },
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
