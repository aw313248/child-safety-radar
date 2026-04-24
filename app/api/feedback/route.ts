import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// 使用者回饋 endpoint
// 支援兩種類型：
//   - report：評分有誤回報
//   - discussion：補充家長討論連結
//
// 實作策略（零 DB 成本）：
//   1. 記錄到 console（Vercel logs 可查）
//   2. 若有設 FEEDBACK_WEBHOOK_URL（Discord / Slack / Make / Zapier 皆可），轉發
//   3. Oscar 可之後接 Notion DB 或 Google Sheet
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
    const { type, channelName, channelUrl, riskScore, content } = body

    // 基本驗證
    if (!type || !['report', 'discussion'].includes(type)) {
      return NextResponse.json({ error: 'type 錯誤' }, { status: 400 })
    }
    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      return NextResponse.json({ error: '內容不可為空' }, { status: 400 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: '內容過長' }, { status: 400 })
    }

    const payload = {
      type,
      channelName: String(channelName || '').slice(0, 200),
      channelUrl: String(channelUrl || '').slice(0, 500),
      riskScore: Number(riskScore) || 0,
      content: content.trim(),
      submittedAt: new Date().toISOString(),
      ip: ip.slice(0, 20),
    }

    // 1. Log to Vercel
    console.log('[FEEDBACK]', JSON.stringify(payload))

    // 2. 轉發到 webhook（Discord / Slack / Make / Zapier 格式通用）
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL
    if (webhookUrl) {
      const typeLabel = type === 'report' ? '🚩 評分有誤回報' : '💬 家長討論補充'
      const message = `**${typeLabel}**\n\n**頻道：** ${payload.channelName}\n**網址：** ${payload.channelUrl}\n**當前評分：** ${payload.riskScore}/100\n**內容：**\n${payload.content}\n\n_${payload.submittedAt}_`

      // Discord 格式（Slack 也相容 content 欄位需換成 text）
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: message, text: message }),
        })
      } catch (err) {
        console.error('[FEEDBACK] webhook forward failed:', err)
        // webhook 失敗不影響使用者，回傳 ok
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[FEEDBACK] error:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
