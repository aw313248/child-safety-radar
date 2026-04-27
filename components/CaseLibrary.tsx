'use client'

import { useState } from 'react'

// 真實艾莎門案例庫 — 所有資料皆來自公開報導 / Wikipedia
// 這不是 AI 生成，是有據可查的歷史事件，每張卡都附來源連結

type CaseStatus = 'terminated' | 'warning'

interface CaseItem {
  name: string
  status: CaseStatus
  statusLabel: string
  year: string
  meta: string
  desc: string
  sources: { label: string; url: string }[]
}

const CASES: CaseItem[] = [
  {
    name: 'Toy Freaks',
    status: 'terminated',
    statusLabel: '已下架',
    year: '2017.11',
    meta: '曾有 854 萬訂閱，全球前 100',
    desc: '爸爸錄兩個女兒身處恐怖、受傷、嘔吐等不適當情境',
    sources: [
      { label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Toy_Freaks' },
      { label: 'Tubefilter 報導', url: 'https://www.tubefilter.com/2017/11/17/youtube-terminates-toy-freaks/' },
    ],
  },
  {
    name: 'Webs and Tiaras',
    status: 'terminated',
    statusLabel: '已下架',
    year: '2017',
    meta: '累計 37 億次觀看，加拿大團隊',
    desc: '真人扮艾莎、蜘蛛人、小丑做怪異或不適當行為',
    sources: [
      { label: 'Wikipedia: Elsagate', url: 'https://en.wikipedia.org/wiki/Elsagate' },
      { label: 'Tubefilter 調查', url: 'https://www.tubefilter.com/2017/11/20/youtube-purge-kids-videos-billions-views/' },
    ],
  },
  {
    name: '阿洪實驗（偽裝台灣）',
    status: 'warning',
    statusLabel: '媒體示警',
    year: '2022',
    meta: '335 萬訂閱，偽裝本土頻道',
    desc: '人體示範危險動作（口塞萬樂珠 + 灌可樂等），吸引孩童模仿',
    sources: [
      { label: 'DailyView 網路溫度計', url: 'https://dailyview.tw/popular/detail/11012' },
      { label: '香港 01 報導', url: 'https://www.hk01.com/%E8%A6%AA%E5%AD%90/648299/' },
    ],
  },
]

const STATUS_CLASS: Record<CaseStatus, string> = {
  terminated: 'chip chip-danger',
  warning:    'chip chip-warning',
}

export default function CaseLibrary() {
  const [open, setOpen] = useState(false)

  return (
    <section style={{ marginTop: 24 }}>
      {/* 折疊入口 — 預設收起，一行入口不佔版面 */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{
          width: '100%', padding: '13px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(43,24,16,0.12)',
          borderRadius: open ? '16px 16px 0 0' : 16,
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'border-radius 0.2s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-hex)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cc-red)', flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          這些頻道真的發生過，有報導為證
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)', flexShrink: 0, color: 'var(--ink-hex)', opacity: 0.5 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          border: '1px solid rgba(43,24,16,0.12)',
          borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          overflow: 'hidden',
        }}>
          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(43,24,16,0.06)' }}>
            {CASES.map((c) => (
              <article
                key={c.name}
                style={{
                  background: 'var(--card-hex)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink-hex)' }}>
                    {c.name}
                  </h3>
                  <span className={STATUS_CLASS[c.status]} style={{ whiteSpace: 'nowrap', fontSize: 10 }}>
                    {c.statusLabel} · {c.year}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.5)', letterSpacing: '-0.01em', marginBottom: 5 }}>
                  {c.meta}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.55, marginBottom: 8, fontWeight: 500, opacity: 0.75 }}>
                  {c.desc}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {c.sources.map((src) => (
                    <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: 'var(--cc-red-deep)', textDecoration: 'none', fontWeight: 600, letterSpacing: '-0.005em', opacity: 0.75 }}>
                      → {src.label}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Stat footer */}
          <div style={{ padding: '10px 16px', background: 'rgba(43,24,16,0.03)', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.5)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
              2017 年 YouTube 下架 <strong style={{ color: 'var(--ink-hex)', fontWeight: 700 }}>15 萬支影片</strong>、終止 <strong style={{ color: 'var(--ink-hex)', fontWeight: 700 }}>270 個頻道</strong>
              <a href="https://en.wikipedia.org/wiki/Elsagate" target="_blank" rel="noopener noreferrer"
                style={{ color: 'rgba(43,24,16,0.35)', textDecoration: 'none', marginLeft: 6 }}>
                來源 →
              </a>
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
