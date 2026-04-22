import { NextRequest, NextResponse } from 'next/server'

// 有效存取碼列表，在 Vercel 環境變數設定 ACCESS_CODES（逗號分隔）
// 例如：ACCESS_CODES=RADAR-A1B2,RADAR-C3D4,RADAR-E5F6
function getValidCodes(): Set<string> {
  const raw = process.env.ACCESS_CODES || ''
  const codes = raw.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
  return new Set(codes)
}

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false }, { status: 400 })
  }

  const validCodes = getValidCodes()
  const isValid = validCodes.has(code.trim().toUpperCase())

  return NextResponse.json({ valid: isValid })
}
