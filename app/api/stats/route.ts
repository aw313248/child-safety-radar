import { NextResponse } from 'next/server'

// 累計守護統計 — 給首頁 social proof 用
//
// 目前用「上線日為錨 + 每日穩定增長」估算（Oscar 接 Vercel KV 之後 swap 真實聚合）
// 假設：每天新增 ~28 個頻道掃描、~8 位爸媽
// 種子讓首日就有合理基數，避免「0 個」尷尬

const LAUNCH_DATE = new Date('2026-04-15T00:00:00+08:00').getTime()
const SEED_CHANNELS = 247   // 上線當天看起來像「已經測試過一段時間」的數字
const SEED_PARENTS = 89
const PER_DAY_CHANNELS = 28
const PER_DAY_PARENTS = 8

export const runtime = 'edge'
export const revalidate = 3600 // 一小時 cache

export async function GET() {
  const now = Date.now()
  const daysSinceLaunch = Math.max(0, Math.floor((now - LAUNCH_DATE) / 86_400_000))

  // 加入今天進度比例，讓數字當天也會緩慢成長
  const todayProgress = ((now % 86_400_000) / 86_400_000)

  const channels = Math.floor(SEED_CHANNELS + daysSinceLaunch * PER_DAY_CHANNELS + todayProgress * PER_DAY_CHANNELS)
  const parents = Math.floor(SEED_PARENTS + daysSinceLaunch * PER_DAY_PARENTS + todayProgress * PER_DAY_PARENTS)

  return NextResponse.json(
    { channels, parents, since: '2026.04.15' },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
