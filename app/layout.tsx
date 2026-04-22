import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '童安雷達 — AI 兒童內容安全掃描',
  description: '輸入 YouTube 頻道或影片網址，AI 自動分析是否含有偽裝成兒童內容的危險訊號，保護你的孩子',
  keywords: 'Elsagate, 兒童安全, YouTube, 家長, 育兒, AI分析',
  openGraph: {
    title: '童安雷達 — 保護孩子的 AI 掃描工具',
    description: '輸入 YouTube 網址，30秒內知道這個頻道對孩子安不安全',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  )
}
