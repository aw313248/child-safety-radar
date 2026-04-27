import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '分享掃描結果',
  description: '別人用 CareCub Kids 掃過的 YouTube 頻道分析結果',
  alternates: { canonical: '/share' },
  robots: { index: false, follow: false },
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
