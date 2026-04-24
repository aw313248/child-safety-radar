// 公開 API 驗證：讓未來的 Chrome 擴充套件可以呼叫 /api/analyze
// 同網域網頁（PeekKids 官網）免 key，跨網域（擴充套件）需 key

// 允許的 API Key（從環境變數讀，逗號分隔）
// 產生新 key：openssl rand -hex 24
const VALID_KEYS = new Set(
  (process.env.API_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
)

// 官網本身的 origin（避免被誤攔）
const OWN_ORIGINS = new Set([
  'https://peekkids.tw',
  'https://www.peekkids.tw',
  'https://peekkids.vercel.app',
  // Vercel preview 環境會是動態網址，見 isVercelPreview()
])

export type AuthResult =
  | { ok: true; via: 'same-origin'; keyOrIp: string }
  | { ok: true; via: 'api-key'; keyOrIp: string }
  | { ok: false; reason: 'missing-key' | 'invalid-key' }

/**
 * 判斷請求是否來自同網域官網（免 key）或帶有有效 API key（擴充套件）
 */
export function authenticate(req: Request): AuthResult {
  const origin = req.headers.get('origin') || ''
  const host = req.headers.get('host') || ''

  // 同網域（網頁直接呼叫自己 API，沒 Origin header 或 Origin 與 host 一致）
  const sameOrigin =
    !origin ||
    origin.endsWith(host) ||
    OWN_ORIGINS.has(origin) ||
    isVercelPreview(origin)

  if (sameOrigin) {
    return { ok: true, via: 'same-origin', keyOrIp: 'web' }
  }

  // 跨網域（擴充套件、第三方）必須帶 API key
  const key = req.headers.get('x-api-key') || ''
  if (!key) return { ok: false, reason: 'missing-key' }
  if (VALID_KEYS.size === 0 || !VALID_KEYS.has(key)) {
    return { ok: false, reason: 'invalid-key' }
  }
  return { ok: true, via: 'api-key', keyOrIp: key }
}

function isVercelPreview(origin: string): boolean {
  // 形如 https://peekkids-git-branch-user.vercel.app
  return /^https:\/\/[\w-]+\.vercel\.app$/.test(origin)
}

/**
 * 回傳適合的 CORS headers
 * - 同網域 / Vercel preview：精確 echo origin
 * - 有效 API key：允許任何 origin（讓擴充套件在 chrome-extension:// 也能用）
 */
export function corsHeaders(req: Request, auth?: AuthResult): HeadersInit {
  const origin = req.headers.get('origin') || ''
  const isApiKey = auth && auth.ok && auth.via === 'api-key'
  const allowOrigin = isApiKey ? '*' : (origin || '*')

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
  }
}
