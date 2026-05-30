import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  setSubscriptionRecord,
  type SubscriptionRecord,
} from '@/lib/lemonsqueezy'

/**
 * Lemonsqueezy Webhook Handler
 *
 * 驗 HMAC-SHA256 signature（X-Signature header）以 LEMONSQUEEZY_WEBHOOK_SECRET
 * 處理 events：
 *   - subscription_created  → 寫入 active
 *   - subscription_resumed  → 寫入 active
 *   - subscription_cancelled → 寫入 none（保留 expires_at 給期末停用）
 *   - subscription_expired  → 寫入 none
 *   - subscription_updated  → 同步 status / expires_at
 *
 * 文件：https://docs.lemonsqueezy.com/help/webhooks
 *
 * Oscar dashboard 親手 setup webhook URL：
 *   https://child-safety-radar.vercel.app/api/webhook/lemonsqueezy
 *   並設 secret 到 Vercel env var LEMONSQUEEZY_WEBHOOK_SECRET
 */

// Next.js 14：raw body 需要直接讀 Request.text()，不能用 req.json()
// 因為 HMAC 計算要對「原始 byte string」才能對得上 Lemonsqueezy 簽章
export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set')
    return NextResponse.json({ ok: false, error: 'webhook secret missing' }, { status: 500 })
  }

  const signature = req.headers.get('x-signature') || ''
  const rawBody = await req.text()

  // HMAC-SHA256 verify
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(rawBody).digest('hex')

  if (signature.length !== digest.length) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 })
  }

  // Parse payload
  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 })
  }

  const event = payload?.meta?.event_name
  if (!event) {
    return NextResponse.json({ ok: false, error: 'no event_name' }, { status: 400 })
  }

  // fingerprint 從 checkout 時帶進去的 custom field 撈回來
  const customRaw = payload?.meta?.custom_data
  const fingerprint =
    (typeof customRaw === 'object' && customRaw && 'fingerprint' in customRaw
      ? String((customRaw as { fingerprint?: unknown }).fingerprint || '')
      : '') || null

  const attrs = payload?.data?.attributes || {}
  const email = (typeof attrs.user_email === 'string' && attrs.user_email) || null
  const customerId = attrs.customer_id != null ? String(attrs.customer_id) : null
  const subscriptionId = payload?.data?.id ? String(payload.data.id) : null
  const variantId = attrs.variant_id != null ? String(attrs.variant_id) : null
  const expiresAt = (typeof attrs.ends_at === 'string' && attrs.ends_at) || null
  const renewsAt = (typeof attrs.renews_at === 'string' && attrs.renews_at) || null
  // Lemonsqueezy status: on_trial, active, paused, past_due, unpaid, cancelled, expired
  const lsStatus = (typeof attrs.status === 'string' && attrs.status) || ''

  let nextStatus: 'active' | 'none' = 'none'
  switch (event) {
    case 'subscription_created':
    case 'subscription_resumed':
    case 'subscription_unpaused':
      nextStatus = 'active'
      break
    case 'subscription_updated':
      // 同步 LS 端 status
      nextStatus = (lsStatus === 'active' || lsStatus === 'on_trial') ? 'active' : 'none'
      break
    case 'subscription_cancelled':
      // cancelled 但仍在週期內 → 視為 active 直到 ends_at；超過 → none
      if (expiresAt) {
        const exp = new Date(expiresAt).getTime()
        nextStatus = Number.isFinite(exp) && exp > Date.now() ? 'active' : 'none'
      } else {
        nextStatus = 'none'
      }
      break
    case 'subscription_expired':
    case 'subscription_paused':
      nextStatus = 'none'
      break
    default:
      // 其它 event（如 payment_success / refunded 等）不改 status，直接 ack
      return NextResponse.json({ ok: true, event, handled: false })
  }

  const record: SubscriptionRecord = {
    status: nextStatus,
    expires_at: expiresAt || renewsAt || null,
    customer_id: customerId,
    subscription_id: subscriptionId,
    variant_id: variantId,
    updated_at: new Date().toISOString(),
  }

  try {
    await setSubscriptionRecord(fingerprint, email, record)
  } catch (err) {
    console.error('subscription write failed:', err)
    return NextResponse.json({ ok: false, error: 'redis write failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, event, status: nextStatus })
}

// ── Lemonsqueezy webhook payload shape（只取需要欄位）──
interface WebhookPayload {
  meta?: {
    event_name?: string
    custom_data?: Record<string, unknown> | null
  }
  data?: {
    id?: string
    type?: string
    attributes?: {
      status?: string
      user_email?: string
      customer_id?: number | string
      variant_id?: number | string
      ends_at?: string | null
      renews_at?: string | null
    }
  }
}
