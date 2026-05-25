import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// ══════════════════════════════════════════════════
// OG 分享圖 — 對外社群預覽（Threads / FB / Line / iMessage / portfolio embed）
// 1200×630 標準尺寸，CareCub Hearth 暖色家族（Apple 乾淨 + Muji 留白 + Lululemon 文案）
//
// 重要修正（2026-05-26）：
// - 既有版本使用 display: 'inline-flex' → Satori 不支援，導致 production 回傳 0 bytes（空白圖）
// - Satori 僅允許 display: flex | block | none | -webkit-box
// - 改用 Node runtime + 本地字型（避免 edge 抓 CDN 不穩）
// ══════════════════════════════════════════════════

// 改用 Node runtime（讓 fs 讀本地 /public/fonts/Huninn.woff2，比 edge fetch 穩）
export const runtime = 'nodejs'
export const alt = 'CareCub · 小析守護 — 不監控，幫媽媽查證'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// 機構徽章 — 對齊 PR #21 CircularTestimonials 教育引用 strategy
const BADGES = [
  { label: 'WHO',          color: '#0093D5' },
  { label: 'AAP',          color: '#005CAB' },
  { label: 'Common Sense', color: '#1AB4DF' },
  { label: '拿鐵媽媽',     color: '#C88830' },
]

async function loadHuninn(): Promise<ArrayBuffer | null> {
  // Satori 不支援 woff2，要用 TTF / OTF / WOFF1
  // Huninn.ttf 是 2.1 版（justfont/open-huninn-font），跟 globals.css 的 Huninn.woff2 同源
  try {
    const filePath = path.join(process.cwd(), 'public', 'fonts', 'Huninn.ttf')
    const buf = await readFile(filePath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } catch {
    return null
  }
}

async function loadNunito(weight: 800 | 500): Promise<ArrayBuffer | null> {
  // 從 jsdelivr 拉 Nunito（latin 子集小，安全）
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.0.5/files/nunito-latin-${weight}-normal.woff`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return await r.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const [huninn, nunito800, nunito500] = await Promise.all([
    loadHuninn(),
    loadNunito(800),
    loadNunito(500),
  ])

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 500 | 800 | 900; style: 'normal' }> = []
  if (huninn)    fonts.push({ name: 'Huninn',  data: huninn,    weight: 900, style: 'normal' })
  if (nunito800) fonts.push({ name: 'Nunito',  data: nunito800, weight: 800, style: 'normal' })
  if (nunito500) fonts.push({ name: 'Nunito',  data: nunito500, weight: 500, style: 'normal' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px 64px',
          // 暖奶油底 + 蜂蜜金 radial（對齊 globals.css body bg）
          backgroundColor: '#F3EEDD',
          backgroundImage:
            'radial-gradient(ellipse 70% 60% at 8% 0%, #FFE8B0 0%, transparent 55%),' +
            ' radial-gradient(ellipse 60% 50% at 95% 100%, #FFCDC8 0%, transparent 55%),' +
            ' radial-gradient(ellipse 45% 40% at 88% 8%, rgba(194, 65, 59, 0.18) 0%, transparent 60%)',
          fontFamily: 'Nunito, Huninn, sans-serif',
          position: 'relative',
        }}
      >
        {/* ─── 頂部 nav：CC 圓徽章 + 品牌名 + URL ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 9999,
              background: '#FFB703',
              border: '3px solid #2B1810',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: '#2B1810',
              letterSpacing: '-0.02em',
              boxShadow: '5px 5px 0 #2B1810',
              fontFamily: 'Nunito, sans-serif',
            }}>CC</div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <div style={{
                display: 'flex',
                fontSize: 36,
                fontWeight: 900,
                color: '#2B1810',
                letterSpacing: '-0.025em',
                lineHeight: 1,
                fontFamily: 'Huninn, sans-serif',
              }}>CareCub · 小析守護</div>
              <div style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 500,
                color: 'rgba(43, 24, 16, 0.55)',
                letterSpacing: '0.02em',
                fontFamily: 'Nunito, sans-serif',
              }}>child-safety-radar.vercel.app</div>
            </div>
          </div>

          {/* 守護中 pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: '#2B1810',
            color: '#FFB703',
            borderRadius: 9999,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.14em',
            fontFamily: 'Nunito, sans-serif',
          }}>
            <span style={{
              display: 'flex',
              width: 10, height: 10, borderRadius: 9999,
              background: '#FFB703',
            }} />
            小析守護中
          </div>
        </div>

        {/* ─── 主視覺區 ─── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}>
          {/* punch line 大字 — Lululemon 口語 */}
          <div style={{
            display: 'flex',
            fontSize: 124,
            fontWeight: 900,
            color: '#2B1810',
            letterSpacing: '-0.045em',
            lineHeight: 0.96,
            fontFamily: 'Huninn, sans-serif',
          }}>
            不<span style={{ color: '#8E2A24' }}>監控</span>，幫媽媽查證
          </div>

          {/* 副 line */}
          <div style={{
            display: 'flex',
            fontSize: 30,
            fontWeight: 500,
            color: 'rgba(43, 24, 16, 0.72)',
            letterSpacing: '-0.005em',
            marginTop: 8,
            fontFamily: 'Huninn, sans-serif',
          }}>
            YouTube 給孩子？先讓 CareCub 看一遍
          </div>

          {/* trust 副副 line */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
          }}>
            <span style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 800,
              color: '#2B1810',
              padding: '6px 14px',
              background: 'rgba(255, 183, 3, 0.35)',
              border: '2px solid #2B1810',
              borderRadius: 9999,
              fontFamily: 'Nunito, sans-serif',
            }}>免費 2 次</span>
            <span style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 800,
              color: '#2B1810',
              padding: '6px 14px',
              background: 'rgba(255, 183, 3, 0.35)',
              border: '2px solid #2B1810',
              borderRadius: 9999,
              fontFamily: 'Nunito, sans-serif',
            }}>不用註冊</span>
            <span style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 800,
              color: '#2B1810',
              padding: '6px 14px',
              background: 'rgba(255, 183, 3, 0.35)',
              border: '2px solid #2B1810',
              borderRadius: 9999,
              fontFamily: 'Nunito, sans-serif',
            }}>拿鐵媽媽 framework</span>
          </div>
        </div>

        {/* ─── 底部：機構徽章 + CTA ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          {/* 左：4 個機構徽章 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              display: 'flex',
              fontSize: 15,
              fontWeight: 800,
              color: 'rgba(43, 24, 16, 0.45)',
              letterSpacing: '0.18em',
              fontFamily: 'Nunito, sans-serif',
            }}>BACKED BY</div>
            <div style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
            }}>
              {BADGES.map((b) => (
                <div key={b.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  background: '#FBF7EA',
                  border: '2px solid #2B1810',
                  borderRadius: 9999,
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#2B1810',
                  letterSpacing: '-0.005em',
                  boxShadow: '2px 2px 0 #2B1810',
                  fontFamily: 'Nunito, Huninn, sans-serif',
                }}>
                  <span style={{
                    display: 'flex',
                    width: 12, height: 12, borderRadius: 9999,
                    background: b.color,
                    border: '1.5px solid #2B1810',
                  }} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* 右：CTA + 三色燈 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 14,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              {[
                { c: '#4A8A5C', t: '可以看' },
                { c: '#C88830', t: '留意' },
                { c: '#C2413B', t: '別給看' },
              ].map((d) => (
                <div key={d.t} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#FBF7EA',
                  border: '2px solid #2B1810',
                  borderRadius: 9999,
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#2B1810',
                  fontFamily: 'Nunito, Huninn, sans-serif',
                }}>
                  <span style={{
                    display: 'flex',
                    width: 10, height: 10, borderRadius: 9999,
                    background: d.c,
                    border: '1.5px solid #2B1810',
                  }} />
                  {d.t}
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 26px',
              background: 'linear-gradient(135deg, #C2413B 0%, #8E2A24 100%)',
              color: '#FFF6E6',
              border: '3px solid #2B1810',
              borderRadius: 9999,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: '-0.01em',
              boxShadow: '6px 6px 0 #2B1810',
              fontFamily: 'Huninn, Nunito, sans-serif',
            }}>
              免費掃一遍 →
            </div>
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
