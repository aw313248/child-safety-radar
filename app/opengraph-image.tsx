import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// ══════════════════════════════════════════════════
// OG 分享圖 V3 — 直接複製首頁視覺，極簡到只剩 logo + 副 line
// 1200×630
//
// 設計鐵則：
// - 配色 100% 等同 app/page.tsx + globals.css 首頁
// - 字型 100% 等同首頁（Huninn 大標 + Noto Sans TC 副 line）
// - 只有兩行東西：「CareCub」 + 「不監控，幫媽媽查證」
// - 留白 70%+
//
// 拒做 list：卡片 / shadow / border / 圖示 / chip / pill / button
// 燈號 / multi-color 字 / emoji / mini logo / CTA / authority line
//
// Satori 注意：display 僅允許 flex | block | none | -webkit-box
// Satori 對 radial-gradient 支援有限 → fallback 用兩層絕對定位 div 模擬 honey glow
// ══════════════════════════════════════════════════

export const runtime = 'nodejs'
export const alt = 'CareCub — 不監控，幫媽媽查證'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// ── 色票（100% 對應 globals.css :root） ─────────────
const INK = '#2B1810'          // 主墨色（暖咖啡，--ink-hex）
const PAPER = '#F3EEDD'        // 紙面奶油米（--paper-hex）

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
  const [huninn, noto700] = await Promise.all([
    loadHuninn(),
    loadNotoSansTC(700),
  ])

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 700 | 900; style: 'normal' }> = []
  if (huninn) fonts.push({ name: 'Huninn', data: huninn, weight: 900, style: 'normal' })
  if (noto700) fonts.push({ name: 'NotoSansTC', data: noto700, weight: 700, style: 'normal' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: PAPER,
          // 首頁 body 用 radial-gradient — Satori 對 radial 支援有限，
          // 改用兩層絕對定位 div 模擬 honey glow（左上 + 右下）
          position: 'relative',
          fontFamily: 'NotoSansTC, Huninn, sans-serif',
        }}
      >
        {/* ─── 模擬首頁 radial gradient：左上 honey glow ─── */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 900,
            height: 700,
            display: 'flex',
            background:
              'radial-gradient(ellipse at center, rgba(255, 183, 3, 0.42) 0%, rgba(255, 183, 3, 0.18) 35%, transparent 65%)',
          }}
        />

        {/* ─── 模擬首頁 radial gradient：右下 stone（豆沙綠）glow ─── */}
        <div
          style={{
            position: 'absolute',
            bottom: -200,
            right: -200,
            width: 850,
            height: 650,
            display: 'flex',
            background:
              'radial-gradient(ellipse at center, rgba(210, 221, 194, 0.55) 0%, rgba(210, 221, 194, 0.25) 35%, transparent 65%)',
          }}
        />

        {/* ─── 模擬首頁 radial gradient：右上 terra 微紅 ─── */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -150,
            width: 700,
            height: 550,
            display: 'flex',
            background:
              'radial-gradient(ellipse at center, rgba(194, 65, 59, 0.14) 0%, rgba(194, 65, 59, 0.06) 35%, transparent 65%)',
          }}
        />

        {/* ─── 模擬首頁 radial gradient：左下次 honey 補光 ─── */}
        <div
          style={{
            position: 'absolute',
            bottom: -150,
            left: -120,
            width: 650,
            height: 520,
            display: 'flex',
            background:
              'radial-gradient(ellipse at center, rgba(255, 183, 3, 0.22) 0%, rgba(255, 183, 3, 0.10) 35%, transparent 65%)',
          }}
        />

        {/* ─── 主視覺：兩行字，垂直置中 ─── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* 1. CareCub 大字 — Huninn 900 / ink */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'Huninn, sans-serif',
              fontWeight: 900,
              fontSize: 200,
              color: INK,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              textAlign: 'center',
            }}
          >
            CareCub
          </div>

          {/* 2. 副 line — Noto Sans TC 700 / ink alpha 0.72 */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'NotoSansTC, sans-serif',
              fontWeight: 700,
              fontSize: 42,
              color: 'rgba(43, 24, 16, 0.72)',
              letterSpacing: '-0.01em',
              marginTop: 48,
              textAlign: 'center',
            }}
          >
            不監控，幫媽媽查證
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
