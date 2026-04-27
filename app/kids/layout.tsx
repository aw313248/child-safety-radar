import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '熊熊守護模式 — 平板丟給小孩也安心',
  description: '只有爸媽驗證過的頻道，沒有推薦、沒有搜尋、沒有亂入廣告，6 歲內專用安心 YouTube 模式',
  alternates: { canonical: '/kids' },
  openGraph: {
    title: 'CareCub Kids · 熊熊守護模式',
    description: '人工驗證過的安心頻道，三層防護，6 歲內專用',
    url: '/kids',
  },
}

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
