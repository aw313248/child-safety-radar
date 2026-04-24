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

// 備用：手動存取碼（Vercel 環境變數 ACCESS_CODES，逗號分隔）
function getManualCodes(): Set<string> {
  const raw = process.env.ACCESS_CODES || ''
  const codes = raw.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  return new Set(codes)
}

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const trimmed = code.trim()

  // 先查手動碼（以 RADAR- 開頭）
  const manualCodes = getManualCodes()
  if (manualCodes.has(trimmed.toUpperCase())) {
    return NextResponse.json({ valid: true })
  }

  // 再驗 Lemon Squeezy 授權碼
  const lsValid = await validateLemonSqueezyLicense(trimmed)
  return NextResponse.json({ valid: lsValid })
}
