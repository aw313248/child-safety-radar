import { NextRequest, NextResponse } from 'next/server'

// 一次性 batch fetch 多個 YouTube channel 頭像
// /api/channel-thumbnails?ids=ID1,ID2,ID3
// 回 { [channelId]: thumbnailUrl }
//
// YouTube channels.list 一次可吃多個 ID（comma-separated），5 個頻道只要 1 個 API call
// 加 24hr edge cache + stale-while-revalidate（頭像幾乎不變）

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json({ error: 'missing ids param' }, { status: 400 })
  }

  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 50)
  if (ids.length === 0) {
    return NextResponse.json({}, { status: 200 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'server not configured' }, { status: 500 })
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids.join(',')}&key=${apiKey}`
    const res = await fetch(url, { next: { revalidate: 86_400 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'youtube api failed' }, { status: 502 })
    }
    const data = await res.json() as {
      items?: Array<{ id: string; snippet?: { thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } } } }>
    }
    const map: Record<string, string> = {}
    for (const it of data.items || []) {
      const t = it.snippet?.thumbnails
      const url = t?.high?.url || t?.medium?.url || t?.default?.url
      if (url) map[it.id] = url
    }
    return NextResponse.json(map, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
