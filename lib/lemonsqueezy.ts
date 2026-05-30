// Lemon Squeezy 訂閱整合
// 月費 NT$199 — Mia persona sweet spot（NT$99-299）
// MVP 訂閱：免費 2 次掃描超用 → paywall → checkout → webhook 寫入 subscription store
//
// 環境變數（Vercel Dashboard → Settings → Environment Variables）
//   LEMONSQUEEZY_API_KEY        — 已設置（既有）
//   LEMONSQUEEZY_STORE_ID       — Lemonsqueezy dashboard 取
//   LEMONSQUEEZY_VARIANT_ID     — Lemonsqueezy dashboard 取（CareCub Pro monthly variant）
//   LEMONSQUEEZY_WEBHOOK_SECRET — Oscar dashboard 設 webhook 時親手 setup

import {
  lemonSqueezySetup,
  createCheckout,
} from '@lemonsqueezy/lemonsqueezy.js'
import { getRedis } from '@/lib/redis'

let _initialized = false

function ensureInit() {
  if (_initialized) return
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY not set')
  lemonSqueezySetup({ apiKey })
  _initialized = true
}

export type SubscriptionStatus = 'active' | 'none'

export interface SubscriptionRecord {
  status: SubscriptionStatus
  expires_at?: string | null   // ISO string
  customer_id?: string | null
  subscription_id?: string | null
  variant_id?: string | null
  updated_at: string           // ISO string
}

// Redis key 設計：subscription:{fingerprint} 或 subscription:email:{email}
// fingerprint 走 IP+UA hash，跟現有 quota counter 一致
const SUB_TTL_SECONDS = 60 * 60 * 24 * 60 // 60 天 — 比月費週期長，避免活躍訂閱被誤清

function subKey(fingerprint: string) {
  return `subscription:${fingerprint}`
}

function subEmailKey(email: string) {
  return `subscription:email:${email.toLowerCase().trim()}`
}

/**
 * 建立 Lemonsqueezy checkout URL
 * @param fingerprint device fingerprint（webhook 回來時可對應寫入）
 * @param email 選填，預填購買者 email
 */
export async function createCheckoutLink(
  fingerprint: string,
  email?: string
): Promise<string | null> {
  ensureInit()
  const storeId = process.env.LEMONSQUEEZY_STORE_ID
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID
  if (!storeId || !variantId) {
    console.error('LEMONSQUEEZY_STORE_ID / VARIANT_ID not set')
    return null
  }

  try {
    const successBase = process.env.NEXT_PUBLIC_SITE_URL
      || 'https://child-safety-radar.vercel.app'

    const res = await createCheckout(storeId, variantId, {
      checkoutData: {
        email: email || undefined,
        custom: {
          // webhook 回來能對到 fingerprint，正確寫入訂閱狀態
          fingerprint,
        },
      },
      checkoutOptions: {
        embed: false,
        media: false,
        logo: true,
      },
      productOptions: {
        redirectUrl: `${successBase}/?subscription_pending=1`,
        receiptButtonText: '回 CareCub',
        receiptThankYouNote: '訂閱成功 — 現在開始無限掃',
      },
    })

    const url = res.data?.data?.attributes?.url
    return url ?? null
  } catch (err) {
    console.error('Lemonsqueezy createCheckout failed:', err)
    return null
  }
}

/**
 * 查詢 fingerprint 對應的訂閱狀態
 */
export async function getSubscriptionStatus(
  fingerprint: string
): Promise<SubscriptionStatus> {
  try {
    const record = await getRedis().get<SubscriptionRecord>(subKey(fingerprint))
    if (!record) return 'none'
    if (record.status !== 'active') return 'none'
    // 有 expires_at 且過期 → none
    if (record.expires_at) {
      const exp = new Date(record.expires_at).getTime()
      if (Number.isFinite(exp) && exp < Date.now()) return 'none'
    }
    return 'active'
  } catch {
    return 'none' // Redis 掛了 → 視為未訂閱（不誤開）
  }
}

/**
 * 寫入訂閱狀態（webhook 用）
 */
export async function setSubscriptionRecord(
  fingerprint: string | null,
  email: string | null,
  record: SubscriptionRecord
): Promise<void> {
  const redis = getRedis()
  const tasks: Promise<unknown>[] = []
  if (fingerprint) {
    tasks.push(redis.set(subKey(fingerprint), record, { ex: SUB_TTL_SECONDS }))
  }
  if (email) {
    tasks.push(redis.set(subEmailKey(email), record, { ex: SUB_TTL_SECONDS }))
  }
  await Promise.all(tasks)
}

/**
 * 依 email 查訂閱（webhook 沒帶 fingerprint custom field 時 fallback）
 */
export async function getSubscriptionByEmail(
  email: string
): Promise<SubscriptionRecord | null> {
  try {
    return await getRedis().get<SubscriptionRecord>(subEmailKey(email))
  } catch {
    return null
  }
}
