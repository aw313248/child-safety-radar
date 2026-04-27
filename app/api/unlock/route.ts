import { NextRequest, NextResponse } from 'next/server'

// Lemon Squeezy License Key 驗證
// 付款後 Lemon Squeezy 自動寄授權碼到用戶信箱
// 文件：https://docs.lemonsqueezy.com/api/license-keys#validate-a-license-key

async function validateLemonSqueezyLicense(licenseKey: string): Promise<boolean> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) {
    console.error('LEMONSQUEEZY_API_KEY not set')
    return false
  }

  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ license_key: licenseKey }),
    })

    if (!res.ok) return false

    const data = await res.json()
    // valid = true 且 status = 'active'（訂閱中）
    return data.valid === true && data.license_key?.status === 'active'
  } catch {
    return false
  }
}

// 所有有效碼從環境變數讀，不在原始碼 hardcode
// Vercel Dashboard → Settings → Environment Variables：
//   ACCESS_CODES=SOLD-CODE-A,SOLD-CODE-B   （正式販售碼）
//   DEV_UNLOCK_CODES=MY-DEV-CODE           （開發者自用，只放 .env.local，不 commit）
function getAllValidCodes(): Set<string> {
  const raw = [process.env.ACCESS_CODES || '', process.env.DEV_UNLOCK_CODES || ''].join(',')
  const codes = raw.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  return new Set(codes)
}

function setUnlockCookie(res: NextResponse) {
  res.cookies.set('cc_unlocked', '1', {
    maxAge: 60 * 60 * 24 * 365, // 1 年
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    path: '/',
  })
  // 同時把 scan count cookie 清掉（解鎖後不再需要計數）
  res.cookies.set('cc_scan_count', '0', {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    path: '/',
  })
  return res
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const code = body?.code

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const trimmed = code.trim()
  if (trimmed.length > 200) {
    return NextResponse.json({ valid: false }, { status: 400 })
  }
  const upper = trimmed.toUpperCase()

  // 查環境變數碼
  const validCodes = getAllValidCodes()
  if (validCodes.size > 0 && validCodes.has(upper)) {
    return setUnlockCookie(NextResponse.json({ valid: true }))
  }

  // 驗 Lemon Squeezy 授權碼
  const lsValid = await validateLemonSqueezyLicense(trimmed)
  if (lsValid) return setUnlockCookie(NextResponse.json({ valid: true }))
  return NextResponse.json({ valid: false })
}
