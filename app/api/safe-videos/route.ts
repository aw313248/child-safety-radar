import { NextRequest, NextResponse } from 'next/server'
import { shouldBlockVideoTitle } from '@/lib/curated-channels'

const YT_API = 'https://www.googleapis.com/youtube/v3'

// 回傳：單一頻道經過「第三層過濾」後的影片清單
// 過濾規則：
//   1. 標題關鍵字黑名單（shouldBlockVideoTitle）
//   2. 僅公開影片
//   3. 優先 madeForKids = true 的
//   4. 最多 30 部

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
      // 2. 標題黑名單（第三層防護）
      .filter((v: VideoItem) => !shouldBlockVideoTitle(v.snippet.title))
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
