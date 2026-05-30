import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutLink } from '@/lib/lemonsqueezy'
import { getDeviceFingerprint } from '@/lib/rate-limit'

/**
 * POST /api/subscription/checkout
 * 建立 Lemonsqueezy checkout URL，用 device fingerprint 對應 webhook 回寫
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim() : undefined

    const fingerprint = getDeviceFingerprint(req)
    const url = await createCheckoutLink(fingerprint, email)

    if (!url) {
      return NextResponse.json(
        { error: '結帳連結建立失敗，再試一次' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url })
  } catch (err) {
    console.error('checkout route error:', err)
    return NextResponse.json(
      { error: '結帳連結建立失敗，再試一次' },
      { status: 500 }
    )
  }
}
