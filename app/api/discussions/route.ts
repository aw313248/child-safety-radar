import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { listDiscussions } from '@/lib/notion'

// GET /api/discussions?channelId=xxx&cursor=<notion_cursor>&limit=10
//
// 拉某個 channel 的「補充討論」留言列表（從 Notion DB，按時間 DESC）
// 回 { discussions: [...], nextCursor: string | null, hasMore: boolean }
export async function GET(req: NextRequest) {
  // 防 Notion API 被洗：每 IP 每分鐘 30 次（讀比寫寬鬆）
  const ip = getClientIp(req)
  const rl = rateLimit(`discussions:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return NextResponse.json({ error: '查詢過於頻繁' }, { status: 429 })
  }

  const url = new URL(req.url)
  const channelId = url.searchParams.get('channelId')?.trim() || ''
  const cursor = url.searchParams.get('cursor') || undefined
  const limitRaw = Number(url.searchParams.get('limit')) || 10
  const limit = Math.min(50, Math.max(1, limitRaw))

  if (!channelId) {
    return NextResponse.json({ error: 'channelId 必填' }, { status: 400 })
  }

  try {
    const result = await listDiscussions(channelId, cursor, limit)
    return NextResponse.json(result, {
      headers: {
        // 同個 channelId 短期內常被打，cache 60 秒減壓
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error('[DISCUSSIONS] error:', err)
    // Notion 沒接好不 break 前端 — 回空陣列
    return NextResponse.json({ discussions: [], hasMore: false })
  }
}
