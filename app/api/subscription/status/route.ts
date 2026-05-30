import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionStatus } from '@/lib/lemonsqueezy'
import { getScanCount } from '@/lib/redis'
import { getDeviceFingerprint } from '@/lib/rate-limit'

const FREE_SCANS = 2

/**
 * GET /api/subscription/status
 * 回傳：當前 device 的訂閱狀態 + 剩餘免費次數
 *   { active: boolean, remainingFree: number }
 */
export async function GET(req: NextRequest) {
  try {
    const fingerprint = getDeviceFingerprint(req)
    const [status, used] = await Promise.all([
      getSubscriptionStatus(fingerprint),
      getScanCount(fingerprint),
    ])
    return NextResponse.json({
      active: status === 'active',
      remainingFree: Math.max(FREE_SCANS - used, 0),
    })
  } catch {
    // 失敗保守回 active=false + 預設剩餘次數，前端 fallback 友善
    return NextResponse.json({ active: false, remainingFree: FREE_SCANS })
  }
}
