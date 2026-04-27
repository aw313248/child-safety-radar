'use client'

import { useEffect, useState } from 'react'

/**
 * 載入時的真實震撼數據輪播
 *
 * 設計原則：
 * - 不放首頁常駐（保乾淨單純）
 * - 利用 20-40 秒的 loading 等待，把無聊變教育
 * - 讓爸媽「不經意看到」事情嚴重性 → 強化掃描的價值
 * - 全部含可查證的權威來源（Wikipedia / 媒體調查 / 官方公告）
 */

interface Fact {
  headline: React.ReactNode
  source: string
  sourceUrl?: string
}

const FACTS: Fact[] = [
  {
    headline: <>2017 年 YouTube 一口氣下架 <strong>15 萬支</strong>不當童片、終止 <strong>270 個</strong>頻道</>,
    source: 'Wikipedia · Elsagate',
    sourceUrl: 'https://en.wikipedia.org/wiki/Elsagate',
  },
  {
    headline: <>Toy Freaks 巔峰 <strong>854 萬</strong>訂閱、全球前 100，因虐童內容被永久下架</>,
    source: 'Wikipedia · Toy Freaks',
    sourceUrl: 'https://en.wikipedia.org/wiki/Toy_Freaks',
  },
  {
    headline: <>Webs and Tiaras 累計 <strong>37 億</strong>次觀看，因偽裝迪士尼角色拍怪片被終止</>,
    source: 'Tubefilter 調查',
    sourceUrl: 'https://www.tubefilter.com/2017/11/20/youtube-purge-kids-videos-billions-views/',
  },
  {
    headline: <>BBC 調查：YouTube Kids 內仍有<strong>不當內容滲透</strong>，演算法防不住</>,
    source: 'BBC News',
    sourceUrl: 'https://www.bbc.com/news/technology-39381889',
  },
  {
    headline: <>2022 阿洪實驗事件：<strong>335 萬</strong>訂閱頻道偽裝台灣本土，誘導孩童危險模仿</>,
    source: 'DailyView 網路溫度計',
    sourceUrl: 'https://dailyview.tw/popular/detail/11012',
  },
  {
    headline: <>美國兒科學會建議：6 歲以下單次螢幕時間 <strong>≤ 20 分鐘</strong></>,
    source: 'American Academy of Pediatrics',
  },
]

export default function LoadingFacts() {
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % FACTS.length)
        setShow(true)
      }, 200)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const fact = FACTS[idx]
  const FactBody = fact.sourceUrl ? 'a' : 'div'

  return (
    <div
      role="region"
      aria-label="掃描期間的真實案例數據"
      style={{
        position: 'relative',
        marginTop: 14,
        padding: '14px 18px',
        background: 'rgba(255, 246, 230, 0.55)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(43,24,16,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Header label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 8,
        fontSize: 10, fontWeight: 700,
        color: 'rgba(43,24,16,0.55)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}>
        <span aria-hidden style={{ fontSize: 12 }}>📊</span>
        你知道嗎
      </div>

      {/* Fact body — fade transition */}
      <FactBody
        href={fact.sourceUrl}
        target={fact.sourceUrl ? '_blank' : undefined}
        rel={fact.sourceUrl ? 'noopener noreferrer' : undefined}
        style={{
          display: 'block',
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.3s cubic-bezier(0.22,1,0.36,1), transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <p style={{
          fontSize: 13.5, fontWeight: 600,
          color: 'var(--ink-hex)',
          letterSpacing: '-0.01em', lineHeight: 1.5,
          marginBottom: 4,
        }}>
          {fact.headline}
        </p>
        <p style={{
          fontSize: 10, fontWeight: 600,
          color: 'rgba(43,24,16,0.5)',
          letterSpacing: '-0.005em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          來源：{fact.source}
          {fact.sourceUrl && <span aria-hidden>↗</span>}
        </p>
      </FactBody>

      {/* Pagination dots — 告訴使用者還有多少條 */}
      <div style={{
        position: 'absolute', right: 14, top: 14,
        display: 'flex', gap: 4,
      }} aria-hidden>
        {FACTS.map((_, i) => (
          <span key={i} style={{
            width: i === idx ? 14 : 5,
            height: 5,
            borderRadius: 99,
            background: i === idx ? 'var(--cc-gold-deep)' : 'rgba(43,24,16,0.18)',
            transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s',
          }} />
        ))}
      </div>
    </div>
  )
}
