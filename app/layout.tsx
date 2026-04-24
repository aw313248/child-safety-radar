import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css'

// 黑體 display — 中文必須用超黑 (900) 才有 Busy Bee Honey 那種主視覺衝擊力
const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-heihei',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F3EEDD',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'PeekKids — 20 秒看穿 YouTube 頻道藏沒藏「艾莎門」',
  description: '偽裝成兒童卡通的「艾莎門」影片越來越多，PeekKids 用 AI 20 秒掃描 YouTube 頻道，看穿是否藏有暴力、恐怖、成人梗等危險內容，給家有「皮」小孩的爸媽用',
  keywords: 'PeekKids, Elsagate, 艾莎門, 兒童安全, YouTube, 家長, 育兒, AI分析',
  openGraph: {
    title: 'PeekKids — 可愛卡通下可能藏著「艾莎門」',
    description: '暴力、恐怖、成人梗偽裝成兒童影片，20 秒 AI 看穿 YouTube 頻道安不安全',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className={notoSansTC.variable}>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
