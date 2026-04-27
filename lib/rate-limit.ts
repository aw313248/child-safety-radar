// 簡易記憶體 rate limiter（serverless 冷啟動會 reset，足夠 MVP）
// 上線量大時改用 Upstash Redis 或 Vercel KV

const buckets = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  resetAt: number
  limit: number
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()

  // 懶惰清理（避免 Map 無限長大）
  if (buckets.size > 1000) {
    buckets.forEach((v, k) => { if (v.resetAt < now) buckets.delete(k) })
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: limit - 1, resetAt, limit }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt, limit }
  }
  return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt, limit }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * 產生 device fingerprint：IP + User-Agent
 * 同 wifi 多人不會誤判（不同 UA），同人多 tab 仍同 fingerprint
 * Edge Runtime 不能用 node:crypto，用簡單 djb2 hash 即可
 */
export function getDeviceFingerprint(req: Request): string {
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') || 'unknown'
  return djb2(`${ip}::${ua}`)
}

function djb2(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & 0xFFFFFFFF
  }
  return Math.abs(hash).toString(36)
}
