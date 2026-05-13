import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Nunito } from 'next/font/google'
import localFont from 'next/font/local'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

// 圓潤英文 — Nunito（next/font/google 內建支援），Mia P1 字型升級
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})

// 圓潤中文 — Huninn（justfont 粉圓開源版）self-host via next/font/local
// 好處：zero layout shift、自動 preload、Vercel Edge CDN cache、不依賴 Google DNS
const huninn = localFont({
  src: '../public/fonts/Huninn.woff2',
  variable: '--font-huninn',
  display: 'swap',
  weight: '400',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F3EEDD',
  viewportFit: 'cover',
}

const SITE_URL = 'https://child-safety-radar.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CareCub · 小析守護 — 用 AI 幫你判斷 YouTube 頻道適不適合孩子',
    template: '%s · CareCub',
  },
  description: '偽裝成兒童卡通的「艾莎門」影片越來越多，CareCub 用 AI 20 秒掃描 YouTube 頻道，看穿是否藏有暴力、恐怖、成人梗等危險內容，給家有「皮」小孩的爸媽用',
  keywords: ['CareCub', 'Elsagate', '艾莎門', '兒童安全', 'YouTube', '家長', '育兒', 'AI 分析', 'YouTube Kids', '兒童 YouTube', '影片過濾', '卡通安全'],
  authors: [{ name: 'Oscar / minehoooo' }],
  creator: 'CareCub',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'CareCub — 這個卡通安全嗎？20 秒掃給你看',
    description: '貼上 YouTube 網址，AI 看完影片跟留言，紅橘綠燈告訴你能不能給小孩看',
    type: 'website',
    locale: 'zh_TW',
    url: SITE_URL,
    siteName: 'CareCub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CareCub — 20 秒看穿卡通藏什麼',
    description: '貼上 YouTube 網址，AI 看完影片跟留言，告訴你能不能給小孩看',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// JSON-LD structured data — 給 Google rich result 用
const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CareCub',
    url: SITE_URL,
    description: '用 AI 20 秒掃描 YouTube 頻道，看穿是否藏有暴力、恐怖、成人梗等不適合小孩的內容',
    applicationCategory: 'ParentingApplication',
    operatingSystem: 'Web',
    inLanguage: 'zh-TW',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TWD',
      description: '免費 2 次掃描，無限掃描方案 NT$99/月',
    },
    creator: {
      '@type': 'Person',
      name: 'Oscar / minehoooo',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CareCub',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    sameAs: [
      'https://www.threads.net/@minehoooo',
      'https://www.instagram.com/minehoooo',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '什麼是「艾莎門」（Elsagate）？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '偽裝成兒童卡通但藏有暴力、恐怖、成人梗的 YouTube 影片，曾經 Toy Freaks、Webs and Tiaras 等大頻道都被 YouTube 強制下架',
        },
      },
      {
        '@type': 'Question',
        name: 'CareCub 怎麼掃描頻道？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '貼上 YouTube 頻道網址，AI 會抓最近影片的標題、縮圖、留言警訊，綜合判斷是否安全，回傳紅橘綠燈號跟摘要建議',
        },
      },
      {
        '@type': 'Question',
        name: '掃描需要多久？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '約 20 至 40 秒',
        },
      },
      {
        '@type': 'Question',
        name: '熊熊守護模式是什麼？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '人工驗證過的安心頻道清單，6 歲內專用，三層防護：官方頻道 × YouTube 兒童認證 × 標題黑名單，爸爸媽媽陪同更放心',
        },
      },
    ],
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" className={`${nunito.variable} ${huninn.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
