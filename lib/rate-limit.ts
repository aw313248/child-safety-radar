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
