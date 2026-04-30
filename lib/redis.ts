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

// 原子遞增：INCR + EXPIRE 用 pipeline 一次送出，避免兩步驟之間出錯造成 key 永久殘留
// 回傳遞增後的新計數，供呼叫端做即時判斷（避免 race condition）
export async function incrementScanCount(fingerprint: string): Promise<number> {
  try {
    const redis = getRedis()
    const key = `scan:${fingerprint}`
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, TTL_SECONDS)
    const results = await pipeline.exec<[number, number]>()
    return results[0] ?? 0
  } catch {
    return 0
  }
}

// 回滾計數（掃描失敗時呼叫，避免使用者被多扣一次）
export async function decrementScanCount(fingerprint: string): Promise<void> {
  try {
    await getRedis().decr(`scan:${fingerprint}`)
  } catch {
    // 回滾失敗不影響主流程
  }
}
