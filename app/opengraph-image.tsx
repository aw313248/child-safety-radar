import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// ══════════════════════════════════════════════════
// OG 分享圖 — 方向 B Muji 紙質包裝風（極簡 + 紙質陰影 + 大留白）
// 1200×630
//
// 設計三柱：Apple 乾淨 / Muji 留白 / Lululemon 文案
// 上版（PR #23）feedback：黃 chip + 紅 CTA + 三色燈號 + multi-color 大字 → 過度設計
// 本版拒做：chip / CTA button / 燈號 / multi-color / mascot 大版 / Visual noise
//
// Runtime: Node（讓 fs 讀本地 Huninn.ttf）
// Satori 注意：display 僅允許 flex | block | none | -webkit-box
// ══════════════════════════════════════════════════

export const runtime = 'nodejs'
export const alt = 'CareCub · 小析守護 — 不監控，幫媽媽查證'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── 色票 ──────────────────────────────────────────
const INK = '#2B1810'          // 主墨色（單色 hero 字 + icon stroke）
const PAPER = '#F3EEDD'        // 外層暖米白
const CARD = '#FFFFFF'         // 卡片底（純白，跟外層輕微對比 + 紙感）

async function loadHuninn(): Promise<ArrayBuffer | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'fonts', 'Huninn.ttf')
    const buf = await readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } catch {
    return null
  }
}

async function loadNotoSansTC(weight: 400 | 500 | 700): Promise<ArrayBuffer | null> {
  // jsdelivr @fontsource/noto-sans-tc — Satori 不支援 woff2，所以用 woff
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tc@5.0.5/files/noto-sans-tc-chinese-traditional-${weight}-normal.woff`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const [huninn, noto500, noto400] = await Promise.all([
    loadHuninn(),
    loadNotoSansTC(500),
    loadNotoSansTC(400),
  ])

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 500 | 900; style: 'normal' }> = []
  if (huninn) fonts.push({ name: 'Huninn', data: huninn, weight: 900, style: 'normal' })
  if (noto500) fonts.push({ name: 'NotoSansTC', data: noto500, weight: 500, style: 'normal' })
  if (noto400) fonts.push({ name: 'NotoSansTC', data: noto400, weight: 400, style: 'normal' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // 外層：暖米白 + 極弱 honey radial（左上 alpha 0.15 不能搶）
          backgroundColor: PAPER,
          backgroundImage:
            'radial-gradient(ellipse 55% 50% at 12% 6%, rgba(255, 199, 95, 0.15) 0%, transparent 60%)',
          fontFamily: 'NotoSansTC, Huninn, sans-serif',
          position: 'relative',
        }}
      >
        {/* ─── 中央卡片 ~860×460 紙質陰影 ─── */}
        <div
          style={{
            width: 860,
            // 卡片高度交給內容撐，但設 minHeight 確保 460
            minHeight: 460,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: CARD,
            borderRadius: 24,
            border: '1.5px solid rgba(43, 24, 16, 0.15)',
            // 紙質 multi-layer shadow（高光 inset + 雙層 drop）
            boxShadow:
              '0 1px 0 rgba(255, 255, 255, 0.7) inset,' +
              ' 0 14px 36px -16px rgba(43, 24, 16, 0.18),' +
              ' 0 22px 40px -28px rgba(43, 24, 16, 0.22)',
            padding: '56px 72px',
          }}
        >
          {/* 1. 上方 mini logo 一行 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 36,
            }}
          >
            {/* CC mascot mini icon — 32px circle + CC */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9999,
                background: INK,
                color: '#FFF6E6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: '-0.02em',
                fontFamily: 'Huninn, sans-serif',
              }}
            >
              CC
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 900,
                color: INK,
                letterSpacing: '0.01em',
                fontFamily: 'Huninn, NotoSansTC, sans-serif',
              }}
            >
              CareCub · 小析守護
            </div>
          </div>

          {/* 2. 大字 hero 主標題 — 單色 ink，絕不 multi-color，單行 */}
          <div
            style={{
              display: 'flex',
              fontSize: 68,
              fontWeight: 900,
              color: INK,
              letterSpacing: '-0.045em',
              lineHeight: 1.02,
              fontFamily: 'Huninn, sans-serif',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            不監控，幫媽媽查證
          </div>

          {/* 3. 副 line 小字（主標下 24px） */}
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 400,
              color: 'rgba(43, 24, 16, 0.55)',
              letterSpacing: '0.005em',
              marginTop: 24,
              fontFamily: 'NotoSansTC, sans-serif',
              textAlign: 'center',
            }}
          >
            YouTube 給孩子？先讓 CareCub 看一遍
          </div>

          {/* 4. minimal 盾牌 + 勾勾 SVG（副 line 下 32px） */}
          <div
            style={{
              display: 'flex',
              marginTop: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width={60}
              height={60}
              viewBox="0 0 24 24"
              fill="none"
              stroke={INK}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Lucide shield-check — 盾牌 + 勾勾 */}
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>

        {/* 5. 底部 minimal authority line（卡片下方，畫面底 padding） */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 14,
              fontWeight: 400,
              color: 'rgba(43, 24, 16, 0.45)',
              letterSpacing: '0.04em',
              fontFamily: 'NotoSansTC, sans-serif',
            }}
          >
            by WHO · AAP · Common Sense · 拿鐵媽媽 framework
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length ? fonts : undefined,
    }
  )
}
