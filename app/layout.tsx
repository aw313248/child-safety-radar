import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'PeekKids — 越「皮」的孩子，越要先 Peek 過',
  description: '給家有「皮」小孩的爸媽用的 YouTube 把關工具，貼上頻道網址，20 秒內告訴你這個頻道給小孩看 OK 嗎',
  keywords: 'PeekKids, Elsagate, 兒童安全, YouTube, 家長, 育兒, AI分析',
  openGraph: {
    title: 'PeekKids — 越「皮」的孩子，越要先 Peek 過',
    description: '給家有「皮」小孩的爸媽，20 秒看穿 YouTube 頻道對小孩安不安全',
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
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
