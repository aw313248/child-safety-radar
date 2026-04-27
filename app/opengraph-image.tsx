import { ImageResponse } from 'next/og'

// OG 分享圖 — 貼在 Threads / Line / FB / iMessage 會顯示的預覽卡
// 1200×630 標準尺寸，CareCub Hearth 暖色家族
export const runtime = 'edge'
export const alt = 'CareCub Kids — 這個卡通安全嗎？20 秒掃給你看'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // 載入 Noto Sans TC 兩個字重（標題 900 / 副標 500）
  const [bold, regular] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tc@5.0.5/files/noto-sans-tc-chinese-traditional-900-normal.woff')
      .then(r => r.ok ? r.arrayBuffer() : null).catch(() => null),
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tc@5.0.5/files/noto-sans-tc-chinese-traditional-500-normal.woff')
      .then(r => r.ok ? r.arrayBuffer() : null).catch(() => null),
  ])

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 500 | 900; style: 'normal' }> = []
  if (bold) fonts.push({ name: 'NotoSansTC', data: bold, weight: 900, style: 'normal' })
  if (regular) fonts.push({ name: 'NotoSansTC', data: regular, weight: 500, style: 'normal' })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          padding: '64px 72px',
          // 暖奶油底 + 蜂蜜金 / 披風紅光暈（跟首頁背景一致）
          background:
            'radial-gradient(ellipse 60% 50% at 12% 8%, #FFE8B0 0%, transparent 55%),' +
            ' radial-gradient(ellipse 55% 45% at 92% 92%, #FFCDC8 0%, transparent 55%),' +
            ' radial-gradient(ellipse 50% 40% at 88% 12%, #C2413B33 0%, transparent 60%),' +
            ' #FBF7EA',
          position: 'relative',
        }}
      >
        {/* 頂部 nav 區 — CC 圓徽章 + 品牌名 + 右上 URL */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 48,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#F2B84B',
              border: '2.5px solid #2B1810',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: '#2B1810',
              letterSpacing: '-0.02em',
              boxShadow: '4px 4px 0 #2B1810',
            }}>CC</div>
            <span style={{
              fontSize: 28, fontWeight: 900, color: '#2B1810',
              letterSpacing: '-0.025em',
            }}>CareCub Kids</span>
          </div>
          <div style={{
            fontSize: 18, fontWeight: 500,
            color: '#2B181099',
            letterSpacing: '0.04em',
            display: 'flex',
          }}>
            child-safety-radar.vercel.app
          </div>
        </div>

        {/* 主標 — 跟首頁同款疑問句 */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          flex: 1, justifyContent: 'center',
          marginTop: -20,
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '6px 14px',
            background: '#2B1810',
            color: '#F2B84B',
            borderRadius: 9999,
            fontSize: 18, fontWeight: 900,
            letterSpacing: '0.16em',
            alignSelf: 'flex-start',
            marginBottom: 24,
          }}>
            ★ 小析守護中
          </div>

          <div style={{
            display: 'flex',
            fontSize: 132,
            fontWeight: 900,
            color: '#2B1810',
            letterSpacing: '-0.05em',
            lineHeight: 0.95,
          }}>
            這個<span style={{ color: '#8E2A24' }}>卡通</span>安全嗎？
          </div>

          <div style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 900,
            color: '#2B1810CC',
            letterSpacing: '-0.04em',
            marginTop: 16,
          }}>
            20 秒掃給你看
          </div>

          <div style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 500,
            color: '#2B181099',
            letterSpacing: '-0.01em',
            marginTop: 20,
          }}>
            貼網址、按掃描，AI 看完影片跟留言，告訴你能不能給小孩看
          </div>
        </div>

        {/* 三色燈 + 行動提示 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 32,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {[
              { c: '#7AB87E', t: '可以看' },
              { c: '#F2B84B', t: '留意' },
              { c: '#C2413B', t: '別給看' },
            ].map((d) => (
              <div key={d.t} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px',
                background: '#FBF7EA',
                border: '2px solid #2B1810',
                borderRadius: 9999,
                fontSize: 18, fontWeight: 900,
                color: '#2B1810',
                letterSpacing: '-0.01em',
                boxShadow: '2px 2px 0 #2B1810',
              }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: d.c,
                  border: '1.5px solid #2B1810',
                }} />
                {d.t}
              </div>
            ))}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #C2413B 0%, #8E2A24 100%)',
            color: '#FFF6E6',
            border: '2.5px solid #2B1810',
            borderRadius: 9999,
            fontSize: 22, fontWeight: 900,
            letterSpacing: '-0.01em',
            boxShadow: '4px 4px 0 #2B1810',
          }}>
            免費掃 →
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
