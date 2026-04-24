import { ImageResponse } from 'next/og'

// OG 分享圖 — 貼在 Threads / Line / FB 會顯示的預覽卡
// 尺寸 1200x630 是各大社群的標準
export const runtime = 'edge'
export const alt = 'CareCub Kids — 給家有「皮」小孩的爸媽用'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // 嘗試載入繁中字體（若失敗就 fallback 英文為主）
  let fontData: ArrayBuffer | null = null
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tc@5.0.5/files/noto-sans-tc-chinese-traditional-700-normal.woff'
    )
    if (res.ok) fontData = await res.arrayBuffer()
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #F2F2F7 0%, #E5F0E3 100%)',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* 裝飾圓點 */}
        <div style={{ position: 'absolute', top: 60, left: 80, width: 12, height: 12, borderRadius: '50%', background: '#34C759' }} />
        <div style={{ position: 'absolute', top: 60, right: 80, fontSize: 20, color: '#6C6C70', letterSpacing: '-0.01em' }}>peekkids.tw</div>

        {/* 貓頭鷹 */}
        <div style={{ fontSize: 88, marginBottom: 24, display: 'flex' }}>🦉</div>

        {/* 問題陳述：主文案（最大） */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#1C1C1E',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            display: 'flex',
            textAlign: 'center',
          }}
        >
          可愛卡通下可能藏著「艾莎門」
        </div>

        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            marginTop: 18,
            color: '#6C6C70',
            letterSpacing: '-0.02em',
            display: 'flex',
          }}
        >
          暴力、恐怖、成人梗偽裝成兒童影片
        </div>

        {/* 分隔線 */}
        <div style={{
          width: 120,
          height: 2,
          background: '#2D5F3F',
          marginTop: 40,
          marginBottom: 28,
          display: 'flex',
        }} />

        {/* 解法：品牌 + 功能 */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: '#1C1C1E',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>Peek<span style={{ color: '#2D5F3F' }}>Kids</span></span>
          <span style={{ color: '#6C6C70', fontWeight: 500, fontSize: 32 }}>·</span>
          <span style={{ fontWeight: 500, fontSize: 32 }}>20 秒 AI 看穿 YouTube 頻道</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'NotoSansTC', data: fontData, style: 'normal', weight: 700 }]
        : undefined,
    }
  )
}
