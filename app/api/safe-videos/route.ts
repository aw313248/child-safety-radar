import { NextRequest, NextResponse } from 'next/server'
import { shouldBlockVideoTitle } from '@/lib/curated-channels'

const YT_API = 'https://www.googleapis.com/youtube/v3'

// 回傳：單一頻道經過過濾後的影片清單
// 過濾規則：
//   1. 標題關鍵字黑名單（shouldBlockVideoTitle）
//   2. 僅公開影片
//   3. ⭐ 排除 Shorts（duration ≤ 60 秒）— 防止小孩滑短影音的第一道防線
//   4. 優先 madeForKids = true 的
//   5. 最多 30 部

// 把 ISO 8601 duration (PT1M30S) 轉秒數
function parseDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2] || '0', 10)
  const s = parseInt(m[3] || '0', 10)
  return h * 3600 + min * 60 + s
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const channelId = searchParams.get('channelId')
  if (!channelId) {
    return NextResponse.json({ error: '缺少 channelId' }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 })
  }

  try {
    // 1. 取得上傳清單 ID（UC… → UU…）
    const uploadsPlaylist = 'UU' + channelId.slice(2)

    // 2. 抓最新 50 部
    const plRes = await fetch(
      `${YT_API}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=50&key=${apiKey}`,
      { next: { revalidate: 3600 } } // 伺服器快取 1 小時
    )
    if (!plRes.ok) {
      return NextResponse.json({ error: '頻道讀取失敗' }, { status: 502 })
    }
    const plData = await plRes.json()
    const videoIds = (plData.items || [])
      .map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId)
      .join(',')
    if (!videoIds) return NextResponse.json({ videos: [] })

    // 3. 取得影片資訊（含 madeForKids）
    const vRes = await fetch(
      `${YT_API}/videos?part=snippet,status,contentDetails&id=${videoIds}&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    if (!vRes.ok) {
      return NextResponse.json({ error: '影片資料讀取失敗' }, { status: 502 })
    }
    const vData = await vRes.json()

    type VideoItem = {
      id: string
      snippet: {
        title: string
        thumbnails?: { high?: { url: string }; medium?: { url: string } }
        publishedAt: string
      }
      status: { madeForKids?: boolean; privacyStatus?: string }
      contentDetails: { duration: string }
    }

    const videos = (vData.items || [])
      // 1. 僅公開
      .filter((v: VideoItem) => v.status.privacyStatus === 'public')
      // 2. 標題黑名單
      .filter((v: VideoItem) => !shouldBlockVideoTitle(v.snippet.title))
      // 3. ⭐ 排除 Shorts：duration ≤ 60 秒砍掉（短影音是注意力殺手）
      .filter((v: VideoItem) => parseDurationSeconds(v.contentDetails.duration) > 60)
      .map((v: VideoItem) => ({
        id: v.id,
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || '',
        publishedAt: v.snippet.publishedAt,
        madeForKids: v.status.madeForKids === true,
        duration: v.contentDetails.duration,
      }))
      // 優先排 madeForKids，但不強制
      .sort((a: { madeForKids: boolean }, b: { madeForKids: boolean }) =>
        a.madeForKids === b.madeForKids ? 0 : a.madeForKids ? -1 : 1
      )
      .slice(0, 30)

    return NextResponse.json({ videos })
  } catch (err) {
    console.error('safe-videos error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
