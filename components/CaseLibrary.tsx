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
  return (
    <section style={{ marginTop: 48 }}>
      {/* Section header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--forest-mid)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          真實案例
        </p>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          marginBottom: 6,
        }}>
          這些頻道，真的發生過
        </h2>
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.5,
        }}>
          不是我們捏造的，每張卡片都附公開報導連結，你可以自己查
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CASES.map((c) => {
          return (
            <article
              key={c.name}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                padding: '14px 16px',
                boxShadow: 'var(--shadow-card)',
                transition: 'border-color 0.15s, transform 0.12s var(--ease-spring)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <h3 style={{
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}>
                  {c.name}
                </h3>
                <span className={STATUS_CLASS[c.status]} style={{ whiteSpace: 'nowrap' }}>
                  {c.statusLabel} · {c.year}
                </span>
              </div>

              <p style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                letterSpacing: '-0.01em',
                marginBottom: 6,
              }}>
                {c.meta}
              </p>

              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                letterSpacing: '-0.01em',
                lineHeight: 1.5,
                marginBottom: 10,
              }}>
                {c.desc}
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {c.sources.map((src) => (
                  <a
                    key={src.url}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11,
                      color: 'var(--forest-mid)',
                      textDecoration: 'none',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      borderBottom: '1px solid rgba(44,90,66,0.25)',
                      paddingBottom: 1,
                    }}
                  >
                    → {src.label}
                  </a>
                ))}
              </div>
            </article>
          )
        })}
      </div>

      {/* Aggregate stat */}
      <div style={{
        marginTop: 14,
        padding: '12px 14px',
        background: 'rgba(44,90,66,0.05)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(44,90,66,0.10)',
      }}>
        <p style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          光是 2017 年，YouTube 就下架 <strong style={{ color: 'var(--text-primary)' }}>15 萬支影片</strong>、終止 <strong style={{ color: 'var(--text-primary)' }}>270 個頻道</strong>
          <br />
          <a
            href="https://en.wikipedia.org/wiki/Elsagate"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            來源：Wikipedia: Elsagate →
          </a>
        </p>
      </div>
    </section>
  )
}
