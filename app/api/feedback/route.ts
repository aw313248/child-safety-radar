import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { createFeedbackPage, type FeedbackType } from '@/lib/notion'

// 使用者回饋 endpoint（v2 — Notion DB 為主，webhook 為輔）
//
// 新版 payload（v2）：
//   {
//     type: 'rating_correction' | 'discussion',
//     channelId: string,
//     channelName: string,
//     miaRating?: number,  // 1-5, 只 rating_correction 有
//     miaComment: string,
//   }
//
// 舊版 payload（v1，向後相容）：
//   {
//     type: 'report' | 'discussion',
//     channelName, channelUrl, riskScore,
//     content,
//   }
//   → 內部 normalize 成 v2 後一樣寫進 Notion
export async function POST(req: NextRequest) {
  // Rate limit：每 IP 每分鐘 3 次（避免洗版）
  const ip = getClientIp(req)
  const rl = rateLimit(`feedback:${ip}`, 3, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: '提交過於頻繁，請稍後再試' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const rawType: string = String(body.type || '')
    // 向後相容舊 'report' → 'rating_correction'
    let type: FeedbackType | null = null
    if (rawType === 'rating_correction' || rawType === 'report') type = 'rating_correction'
    else if (rawType === 'discussion') type = 'discussion'

    if (!type) {
      return NextResponse.json({ error: 'type 錯誤' }, { status: 400 })
    }

    // 接受 miaComment（v2）或 content（v1）
    const rawComment = String(body.miaComment ?? body.content ?? '')
    const comment = rawComment.trim()
    if (comment.length < 3) {
      return NextResponse.json({ error: '內容不可為空' }, { status: 400 })
    }
    if (comment.length > 1000) {
      return NextResponse.json({ error: '內容過長' }, { status: 400 })
    }

    const channelId = String(body.channelId || '').slice(0, 200)
    const channelName = String(body.channelName || '').slice(0, 200)
    const channelUrl = String(body.channelUrl || '').slice(0, 500)
    const miaRatingRaw = Number(body.miaRating)
    const miaRating =
      type === 'rating_correction' && miaRatingRaw >= 1 && miaRatingRaw <= 5
        ? Math.round(miaRatingRaw)
        : undefined
    if (type === 'rating_correction' && !miaRating) {
      return NextResponse.json({ error: '需要 1-5 星等' }, { status: 400 })
    }

    // 1. 寫 Notion（主要儲存）— 失敗不 block，留 console + webhook 雙保險
    let notionOk = false
    try {
      await createFeedbackPage({
        type,
        channelId,
        channelName,
        miaRating,
        miaComment: comment,
        ip: ip.slice(0, 20),
      })
      notionOk = true
    } catch (err) {
      console.error('[FEEDBACK] notion write failed:', err)
    }

    // 2. console log（Vercel logs 備援）
    console.log('[FEEDBACK]', JSON.stringify({
      type, channelId, channelName, miaRating,
      miaComment: comment, submittedAt: new Date().toISOString(),
      ip: ip.slice(0, 20), notionOk,
    }))

    // 3. 可選 webhook 轉發（Discord / Slack / Make / Zapier）
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
    if (webhookUrl) {
      const typeLabel = type === 'rating_correction' ? '🚩 評分有誤回報' : '💬 家長討論補充'
      const ratingLine = miaRating ? `**家長評等：** ${miaRating} / 5\n` : ''
      const urlLine = channelUrl ? `**網址：** ${channelUrl}\n` : ''
      const message = `**${typeLabel}**\n\n**頻道：** ${channelName}\n**頻道 ID：** ${channelId}\n${urlLine}${ratingLine}**內容：**\n${comment}\n\n_${new Date().toISOString()}_`
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message, text: message }),
        })
      } catch (err) {
        console.error('[FEEDBACK] webhook forward failed:', err)
      }
    }

    return NextResponse.json({ ok: true, notionOk })
  } catch (err) {
    console.error('[FEEDBACK] error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
