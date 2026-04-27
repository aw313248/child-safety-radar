import { Redis } from '@upstash/redis'

// Upstash Redis client — 掃描次數持久化存放（不在 cookie，清瀏覽器沒用）
// 環境變數設定：Vercel Dashboard → Settings → Environment Variables
//   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=AXxx...

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) throw new Error('Upstash Redis env vars not set')
    _redis = new Redis({ url, token })
  }
  return _redis
}

// Redis key 設計
const TTL_SECONDS = 30 * 24 * 60 * 60 // 30 天後重置

export async function getScanCount(fingerprint: string): Promise<number> {
  try {
    const n = await getRedis().get<number>(`scan:${fingerprint}`)
    return n ?? 0
  } catch {
    return 0 // Redis 掛了 → fallback 放行，不影響正常使用者
  }
}

export async function incrementScanCount(fingerprint: string): Promise<void> {
  try {
    const redis = getRedis()
    await redis.incr(`scan:${fingerprint}`)
    await redis.expire(`scan:${fingerprint}`, TTL_SECONDS)
  } catch {
    // Redis 掛了就算了，不中斷掃描結果回傳
  }
}
