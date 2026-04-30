import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getChannelInfo, getVideoComments, CommentThread } from '@/lib/youtube'
import { AnalysisResult, RiskLevel, ScoreBreakdownItem } from '@/types/analysis'
import { authenticate, corsHeaders } from '@/lib/api-auth'
import { rateLimit, getClientIp, getDeviceFingerprint } from '@/lib/rate-limit'
import { getScanCount, incrementScanCount, decrementScanCount } from '@/lib/redis'

const FREE_SCANS = 2
const UNLOCK_COOKIE = 'cc_unlocked'

// Cloudflare Turnstile server-side 驗證
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // env 未設定 → 跳過（本地開發）
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const data = await res.json() as { success: boolean }
    return data.success === true
  } catch {
    return true // Cloudflare 掛了 → 放行，不卡正常使用者
  }
}

// Manual blacklist (頻道 ID，逗號分隔，從環境變數讀)
const BLACKLIST = (process.env.CHANNEL_BLACKLIST || '').split(',').map(s => s.trim()).filter(Boolean)

// ── Warning signals in comments / descriptions ─────────────────────────────
const PARENT_WARNING_KEYWORDS = [
  // 恐嚇反應
  '嚇到', '嚇', '可怕', '恐怖', '不適合', '不應該', '不能看', '千萬別',
  // 孩子受害
  '我小孩哭', '我孩子哭', '孩子看到', '孩子嚇', '給小孩看', '兒童不宜',
  '我孩子', '我小孩', '小孩會', '孩子看了', '小朋友會', '孩子跟著學',
  // 模仿危險
  '模仿', '危險動作', '不良示範', '孩子學', '誤導兒童',
  // 舉報
  '下架', '舉報', '檢舉', '家長注意', '請家長',
  // 內容問題
  '色情', '暴力', '血腥', '噁心', '詭異', '重口', '低俗', '不雅', '粗俗', '限制級',
  // 英文
  'disturbing', 'inappropriate', 'not for kids', 'scary', 'horrifying',
  'my child', 'my kid', 'children should not', 'report', 'flag this',
  'wtf', 'creepy', 'nightmare', 'traumatized', 'copy', 'imitate', 'dangerous',
  'bad influence', 'not suitable',
  // 其他警示
  '惡夢', '有問題', '這個頻道', '騙小孩', '誘騙',
]

// ── Tags / keywords that suggest child-targeting ───────────────────────────
const CHILD_TARGETING_SIGNALS = [
  // 明確兒童關鍵字
  'kids', 'children', 'baby', 'nursery rhyme', 'cartoon', 'learning',
  '兒童', '寶寶', '小朋友', '幼兒', '卡通', '學習', '教育',
  // Elsagate 經典模式
  'finger family', 'johny johny', 'colors for kids', 'surprise eggs',
  // 挑戰/食物類（高兒童吸引力）
  'challenge', 'mukbang', '吃播', '挑戰', '零食', '糖果', 'candy', 'food',
  // 卡通角色
  'spiderman', 'batman', 'elsa', 'frozen', 'peppa', 'cocomelon',
]

// ── Detect child-appealing visual aesthetics from channel/title metadata ───
function detectChildAppeal(
  channelName: string,
  channelDesc: string,
  titles: string[]
): { score: number; signals: string[] } {
  const signals: string[] = []
  let score = 0
  const combined = [channelName, channelDesc, ...titles].join(' ').toLowerCase()

  // 挑戰/食物類頻道 + 高頻率
  if (/challenge|挑戰/.test(combined)) { signals.push('挑戰類內容'); score += 15 }
  if (/candy|糖果|零食|mukbang|吃播/.test(combined)) { signals.push('食物/吃播內容'); score += 10 }
  if (/cartoon|卡通|animation|動畫/.test(combined)) { signals.push('卡通動畫風格'); score += 15 }
  if (/baby|寶寶|幼兒|小朋友|兒童|kids/.test(combined)) { signals.push('明確兒童關鍵字'); score += 25 }

  // 大量 emoji 在標題 = 吸引幼兒設計
  const emojiCount = titles.join('').split('').filter(c => c.codePointAt(0)! > 0x1F000).length
  if (emojiCount > titles.length * 2) { signals.push('標題大量使用 emoji'); score += 10 }

  // 全大寫標題 = 視覺衝擊設計
  const upperTitles = titles.filter(t => t === t.toUpperCase() && t.length > 3).length
  if (upperTitles > 3) { signals.push('標題全大寫設計'); score += 8 }

  return { score: Math.min(score, 50), signals }
}

function detectWarningComments(comments: CommentThread[]) {
  return comments.filter(c => {
    const text = c.text.toLowerCase()
    return PARENT_WARNING_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))
  }).slice(0, 6)
}

function detectChildTargetingSignals(allTags: string[], titles: string[], channelDesc: string): string[] {
  const combined = [...allTags, ...titles, channelDesc].join(' ').toLowerCase()
  const found = CHILD_TARGETING_SIGNALS.filter(tag => combined.includes(tag.toLowerCase()))

  const titleText = titles.join(' ').toLowerCase()
  if (/spiderman|batman|elsa|frozen/.test(titleText) && /learning|nursery|kids/.test(titleText)) {
    found.push('混用角色+兒童教育（Elsagate 常見手法）')
  }

  return Array.from(new Set(found)).slice(0, 8)
}

// ── 批次翻譯家長警示留言（英文 → 繁中）─────────────────────────
async function translateWarningComments(
  comments: CommentThread[],
  apiKey: string
): Promise<string[]> {
  if (comments.length === 0) return []
  // 如果全部已經是中文，直接回傳空翻譯（前端會 fallback 不顯示）
  const needsTranslation = comments.map(c => {
    const chineseChars = c.text.match(/[\u4e00-\u9fa5]/g)
    const ratio = chineseChars ? chineseChars.length / c.text.length : 0
    return ratio < 0.3 // 中文字比例 < 30% 視為需要翻譯
  })
  if (!needsTranslation.some(Boolean)) return comments.map(() => '')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0, topP: 0.1, topK: 1 },
    })
    const prompt = `請把下列 YouTube 留言翻譯成繁體中文（台灣用語），每則留言獨立一行，只輸出翻譯結果、不要加編號或解釋。保留原文的語氣（可疑、讚美、警告都要翻出來）。如果原文已是中文，就原文照貼回來。

${comments.map((c, i) => `${i + 1}. ${c.text.replace(/\n/g, ' ').slice(0, 250)}`).join('\n')}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    // 移除每行開頭可能的編號 "1. " / "2. "
    const lines = text.split('\n').map(l => l.replace(/^\s*\d+[.、)]\s*/, '').trim()).filter(Boolean)
    // 對齊數量（不夠就補空字串、超過就截斷）
    if (lines.length >= comments.length) return lines.slice(0, comments.length)
    return [...lines, ...Array(comments.length - lines.length).fill('')]
  } catch (err) {
    console.error('Translation error:', err)
    return comments.map(() => '')
  }
}

async function analyzeWithGemini(params: {
  channelName: string
  channelDescription: string
  subscriberCount: string
  videoCount: number
  videoTitles: string[]
  videoDescriptions: string[]
  warningComments: CommentThread[]
  childTargetingSignals: string[]
  childAppealSignals: string[]
  commentsDisabled: boolean
  commentsDisabledRatio: number
  madeForKidsRatio: number
  isLegitKidsChannel: boolean
}): Promise<{ summary: string; riskScore: number; recommendation: string; riskType?: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  // 鎖死 temperature = 0，同頻道必給同分數（方針 2）
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0, topP: 0.1, topK: 1 },
  })

  const {
    channelName, channelDescription, subscriberCount, videoCount,
    videoTitles, videoDescriptions, warningComments,
    childTargetingSignals, childAppealSignals,
    commentsDisabled, commentsDisabledRatio,
    madeForKidsRatio, isLegitKidsChannel,
  } = params

  const prompt = `你是一位專門評估 YouTube 內容是否適合 6 歲以下幼兒的安全分析師。

【最重要的前置判斷 — 必須先讀】
本頻道有 ${Math.round(madeForKidsRatio * 100)}% 的影片被 YouTube 官方標註為「Made for Kids（兒童內容）」。
${isLegitKidsChannel
    ? '⚠️ 此為「YouTube 官方認證的合規兒童頻道」。依照 COPPA 法規，兒童頻道的留言區必須關閉（13 歲以下不得留言），這是法律要求、不是刻意迴避家長。請不要把「留言關閉」列為警戒訊號。除非內容本身明顯不當（暴力、恐怖、色情、成人梗），否則 riskScore 應落在 0–25，riskType 應為 "child_magnet" 或 "mixed"、絕不該是 "elsagate"。'
    : madeForKidsRatio >= 0.5
      ? '本頻道部分標註為兒童內容，但未達「合規幼兒頻道」標準（可能是小頻道或內容定位模糊），留言關閉可能是 COPPA 要求，判斷時請納入考量。'
      : '本頻道未標註為兒童內容，若出現大量兒童吸引元素 + 留言關閉 = 高警戒訊號（可能為刻意迴避家長監督）。'}

【評估框架：五種風險類型】

▌類型 A — Elsagate（分數 65–100）
頻道表面使用兒童元素（卡通、玩具、兒歌），實際含暴力、性暗示、恐怖元素。

▌類型 B — 兒童磁鐵內容（分數 35–65）
頻道本身不定位為兒童頻道，但滿足以下條件：
• 視覺設計（卡通人物、糖果、鮮豔色彩）對幼兒極具吸引力
• 內容類型（挑戰、吃播、搞笑惡搞）6 歲以下會主動點入
• 行為有不良示範（危險模仿、不雅語言、暴力衝突）
• 留言區關閉 + 兒童吸引力 = 高警戒訊號

▌類型 C — 純成人非兒童內容（分數 0–25）
新聞、科技教學、政治評論、財經 — 6 歲幼兒不會主動或誤觸，內容也無露骨。

▌類型 D — 成人露骨內容（分數 50–75）⚠️ 絕不可給低分
頻道含明確成人露骨關鍵字（性愛、裸露、色情、賭博、暴力血腥、毒品等），
即使幼兒不會主動找，但萬一被 YouTube 演算法推薦或誤觸，內容絕對不適合。
標題含「打炮、口交、約跑、性癖、做愛、AV、成人、裸體、色情」等任一字眼即屬此類。
riskType 必須輸出 "adult_only"，分數最低 50。

▌類型 E — 過度刺激內容（分數 35–55）⚠️ 新增
頻道內容明確面向兒童（兒歌、卡通、教育），但呈現方式有以下特徵：
• 剪輯極快（每 1–2 秒換鏡頭 / 畫面切換）
• 強烈聲光效果（高彩度、過曝飽和、響亮配樂）
• 可能讓幼兒大腦過度刺激，影響注意力發展
• 看完孩子可能變 cranky、難哄、對真實活動失去興趣

判定強訊號（任一即可能屬類型 E）：
• 訂閱數 ≥ 100 萬 + 影片頻率高（每週 5+ 部）+ 標題模式高度重複 = 工業化兒歌頻道
  （CoComelon、Pinkfong、ChuChu TV、LooLoo Kids 屬此類）
• 大量 emoji + 全大寫標題 + 明確兒童關鍵字 = 強訊號
• 影片時長極短（< 3 分鐘）+ 兒童導向 + 大量更新

⚠️ 即使是 YouTube 官方 Made for Kids 認證的合規頻道，若符合過度刺激特徵，仍應給 35–55 分。
COPPA 合規 ≠ 適合幼兒長時間觀看。riskType 必須輸出 "overstimulating"，分數嚴格 35–55。

【核心判斷問題】
1. 一個 6 歲的孩子看到頻道縮圖、名稱、影片標題，會不會有興趣點進去？
2. 內容是否有幼兒可能模仿的危險行為、不適當語言、驚嚇元素？
3. 留言區關閉比率高 + 兒童吸引視覺 = 刻意迴避家長監督的訊號，需加重評分。
4. 頻道是否屬於「工業化兒歌量產」風格（高訂閱 + 高頻率 + 重複模式 + 快剪輯聲光）？
   若是 → riskType 應為 "overstimulating"，分數 35–55

【頻道資料】
頻道名稱：${channelName}
訂閱人數：${Number(subscriberCount).toLocaleString()} 人
影片總數（此次分析）：${videoCount} 部
Made for Kids 比率（YouTube 官方合規標記）：${Math.round(madeForKidsRatio * 100)}%
留言區關閉比率：${Math.round(commentsDisabledRatio * 100)}%

【頻道簡介】
${channelDescription ? channelDescription.slice(0, 400) : '（無簡介）'}

【最近影片標題（最多20部）】
${videoTitles.slice(0, 20).map((t, i) => `${i + 1}. ${t}`).join('\n')}

【影片說明摘要（替代留言分析，當留言關閉時）】
${videoDescriptions.length > 0
    ? videoDescriptions.slice(0, 5).map((d, i) => `[影片${i + 1}說明] ${d}`).join('\n')
    : '（無說明文字）'}

【兒童吸引力訊號（系統偵測）】
${childAppealSignals.length > 0 ? childAppealSignals.join('、') : '未偵測到'}

【兒童關鍵字/標籤】
${childTargetingSignals.length > 0 ? childTargetingSignals.join('、') : '無'}

【家長警示留言（若有）】
${warningComments.length > 0
    ? warningComments.map(c => `- "${c.text}"`).join('\n')
    : commentsDisabled
      ? '留言區已關閉，無法取得家長反饋（此為警示訊號，結合其他指標判斷）'
      : '無特殊留言'}

⚠️ 特別注意：類型 D「成人露骨內容」絕不可給低於 50 分。
即使 6 歲幼兒不會主動點擊，內容本身完全不適合家長環境。

請用繁體中文回答，只輸出以下 JSON 格式（不要其他文字）：
{
  "riskScore": <0–100 整數>,
  "riskType": <"elsagate" | "child_magnet" | "adult_only" | "overstimulating" | "mixed">,
  "summary": "<2–3句：1)頻道定位與內容性質 2)對6歲以下的吸引力評估 3)風險判斷依據>",
  "recommendation": "<給家長的具體建議，1–2句>"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 回應格式異常')

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('AI 回應 JSON 解析失敗')
  }

  // 容錯：AI 偶爾會把分數回傳成字串 "70" 而不是數字 70，直接 Math.min 會得到 NaN
  // 把分數強制轉數字並夾在 0-100，無效就丟錯避免下游汙染
  const rawScore = parsed.riskScore
  const riskScore = typeof rawScore === 'number'
    ? rawScore
    : typeof rawScore === 'string' ? Number(rawScore) : NaN
  if (!Number.isFinite(riskScore)) {
    throw new Error('AI 風險分數格式異常')
  }
  const clampedScore = Math.max(0, Math.min(100, Math.round(riskScore)))

  const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
    ? parsed.summary
    : '（AI 未提供摘要）'
  const recommendation = typeof parsed.recommendation === 'string' && parsed.recommendation.trim()
    ? parsed.recommendation
    : '建議由家長陪同觀看'
  const riskType = typeof parsed.riskType === 'string' ? parsed.riskType : undefined

  return { riskScore: clampedScore, summary, recommendation, riskType }
}

// CORS preflight — 擴充套件會先發 OPTIONS 才發 POST
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  })
}

export async function POST(req: NextRequest) {
  // ── 1. 驗證來源（官網免 key，擴充套件／第三方需 x-api-key）──
  const auth = authenticate(req)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason === 'missing-key' ? '需要 API Key（請在 x-api-key header 帶入）' : 'API Key 無效' },
      { status: 401, headers: corsHeaders(req) }
    )
  }

  // ── 2. Rate limit：官網 by device fingerprint（IP + UA hash）
  //    同 wifi 多人不會誤判，5/分鐘 per device + 50/分鐘 per IP（家庭多裝置） ──
  const fp = getDeviceFingerprint(req)
  const rlKey = auth.via === 'api-key' ? `key:${auth.keyOrIp}` : `fp:${fp}`
  const rlLimit = auth.via === 'api-key' ? 30 : 5
  const rl = rateLimit(rlKey, rlLimit, 60_000)
  const ipRl = auth.via === 'api-key' ? null : rateLimit(`ip:${getClientIp(req)}`, 50, 60_000)
  const rlHeaders: HeadersInit = {
    ...corsHeaders(req, auth),
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
  }
  if (!rl.ok || (ipRl && !ipRl.ok)) {
    return NextResponse.json(
      { error: `請求太頻繁，等一下再試（每分鐘上限 ${rl.limit} 次）` },
      { status: 429, headers: rlHeaders }
    )
  }

  // ── 2b. Unlock 狀態仍從 httpOnly cookie 讀（Lemon Squeezy 付費後設置）──
  // 用 indexOf 找第一個 '=' 切分，避免 value 內含 '=' 時被誤切（base64/JSON cookie 常見）
  const cookieHeader = req.headers.get('cookie') || ''
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(';')) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) {
      cookies[trimmed] = ''
    } else {
      cookies[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
    }
  }
  const unlocked = cookies[UNLOCK_COOKIE] === '1'

  // ── 2c. 掃描次數從 Upstash Redis 讀寫（按裝置 fingerprint）──
  // 優勢：清 cookie、換瀏覽器、清 localStorage 全部無效；只有換 IP + UA 才能繞
  // 防 race condition：先 INCR 拿到原子化的新計數，超過就拒絕並回滾
  // 若直接「讀 → 判斷 → 寫」，並行請求會同時讀到 0 全部放行
  const fingerprint = getDeviceFingerprint(req)
  let scanCounted = false
  if (!unlocked) {
    const newCount = await incrementScanCount(fingerprint)
    if (newCount > FREE_SCANS) {
      await decrementScanCount(fingerprint)
      return NextResponse.json(
        { error: '免費次數已用完，請解鎖無限掃描' },
        { status: 402, headers: rlHeaders }
      )
    }
    // newCount === 0 表示 Redis 掛了 → fallback 用舊讀法（向下相容）
    if (newCount === 0) {
      const fallback = await getScanCount(fingerprint)
      if (fallback >= FREE_SCANS) {
        return NextResponse.json(
          { error: '免費次數已用完，請解鎖無限掃描' },
          { status: 402, headers: rlHeaders }
        )
      }
    } else {
      scanCounted = true
    }
  }

  try {
    const body = await req.json().catch(() => null)
    const url = body?.url
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '請提供 YouTube 網址' }, { status: 400, headers: rlHeaders })
    }
    // Server-side URL 格式驗證（防止注入或濫用 API quota）
    const trimmedUrl = url.trim()
    if (trimmedUrl.length > 500) {
      return NextResponse.json({ error: '網址太長，確認一下是不是貼錯了' }, { status: 400, headers: rlHeaders })
    }
    const YOUTUBE_RE = /youtube\.com|youtu\.be|^@[\w.-]+$|^UC[\w-]{22}$/i
    if (!YOUTUBE_RE.test(trimmedUrl)) {
      return NextResponse.json({ error: '請提供有效的 YouTube 頻道網址' }, { status: 400, headers: rlHeaders })
    }

    // ── Turnstile 人機驗證（TURNSTILE_SECRET_KEY 設定後自動啟用）──
    const turnstileToken = body?.turnstileToken
    if (turnstileToken) {
      const clientIp = getClientIp(req)
      const ok = await verifyTurnstile(turnstileToken, clientIp)
      if (!ok) {
        return NextResponse.json({ error: '人機驗證失敗，重新整理後再試' }, { status: 403, headers: rlHeaders })
      }
    }

    const ytApiKey = process.env.YOUTUBE_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!ytApiKey || !geminiApiKey) {
      return NextResponse.json({ error: '伺服器設定錯誤，請聯絡管理員' }, { status: 500, headers: rlHeaders })
    }

    // 1. Channel info
    const channelInfo = await getChannelInfo(trimmedUrl, ytApiKey)

    // 2. Comments from up to 10 videos (not just 5)
    // 注意：傳入 video.title 讓留言能被追溯到來源影片
    const commentPromises = channelInfo.videos.slice(0, 10).map(v =>
      getVideoComments(v.id, ytApiKey, 50, v.title)
    )
    const allCommentArrays = await Promise.allSettled(commentPromises)
    const allComments: CommentThread[] = allCommentArrays
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<CommentThread[]>).value)

    // 3. Measure comment availability
    const videosChecked = Math.min(channelInfo.videos.length, 10)
    const videosWithComments = allCommentArrays.filter(
      r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<CommentThread[]>).value.length > 0
    ).length
    const commentsDisabledRatio = videosChecked > 0 ? 1 - (videosWithComments / videosChecked) : 0
    const commentsDisabled = commentsDisabledRatio >= 0.7

    // 3b. Made for Kids 比率（方針 1：YouTube 官方 COPPA 標記）
    const madeForKidsCount = channelInfo.videos.filter(v => v.madeForKids).length
    const madeForKidsRatio = channelInfo.videos.length > 0
      ? madeForKidsCount / channelInfo.videos.length
      : 0
    // 合規幼兒頻道判定：70% 以上影片 madeForKids + 訂閱 ≥ 10,000
    const subCountForLegit = Number(channelInfo.subscriberCount)
    const isLegitKidsChannel = madeForKidsRatio >= 0.7 && subCountForLegit >= 10000

    // 4. Video descriptions as fallback text analysis (critical when comments are off)
    const videoDescriptions = channelInfo.videos
      .map(v => v.description)
      .filter(d => d.length > 20)

    // 5. Detect signals
    const warningComments = detectWarningComments(allComments)
    const allTags = channelInfo.videos.flatMap(v => v.tags)
    const videoTitles = channelInfo.videos.map(v => v.title)
    const childTargetingSignals = detectChildTargetingSignals(allTags, videoTitles, channelInfo.description)
    const { score: childAppealScore, signals: childAppealSignals } = detectChildAppeal(
      channelInfo.name,
      channelInfo.description,
      videoTitles
    )

    // 6a. 翻譯警示留言（與 AI 分析並行跑，節省時間）
    const translationsPromise = translateWarningComments(warningComments, geminiApiKey)

    // 6b. AI analysis
    const aiResult = await analyzeWithGemini({
      channelName: channelInfo.name,
      channelDescription: channelInfo.description,
      subscriberCount: channelInfo.subscriberCount,
      videoCount: channelInfo.videos.length,
      videoTitles,
      videoDescriptions,
      warningComments,
      childTargetingSignals,
      childAppealSignals,
      commentsDisabled,
      commentsDisabledRatio,
      madeForKidsRatio,
      isLegitKidsChannel,
    })

    // ── 成人關鍵字 server-side 偵測（防 AI 漏判）────────────────
    // 中文：substring match（無 word boundary 概念）
    const ADULT_KEYWORDS_ZH = [
      // A. 性器官 / 性行為
      '打炮', '口交', '做愛', '愛愛', '裸體', '陰道', '陰莖',
      '保險套', '春藥', '高潮', '自慰', '肛交', '口愛',
      '肉棒', '肉穴', '性奴',
      // B. 約炮 / PUA
      '約跑', '性癖', '約炮', '砲友', '一夜情',
      '撩妹', '撩漢', '把妹', '把妹技巧', '勾引',
      // C. 成人內容類型
      '色情', '成人片', '情色', '激情', '挑逗', '誘惑', '小三',
      '限制級', '十八禁', '18+', 'AV女優', 'A片', '無碼',
      // D. 偷拍 / 黑暗
      '偷拍', '走光', '外流影片', '暗黑', '援交',
      // F. 賭博 / 毒品
      '賭博', '大麻',
      // PUA 縮寫（中英混用保留中文段）
      'PUA',
    ]
    // 英文：word boundary regex（避免 'SM' 在 'Smile'、'AV' 在 'avocado' 等誤觸）
    const ADULT_KEYWORDS_EN = [
      'porn', 'nude', 'naked', 'erotic', 'masturbate', 'orgasm',
      'fetish', 'escort', 'sexy', 'sexual', 'hentai', 'ecchi',
      'casino', 'weed', 'adult only', 'xxx',
    ]

    const allTextForAdult = [
      channelInfo.name,
      channelInfo.description,
      ...channelInfo.videos.map(v => v.title),
      ...channelInfo.videos.map(v => v.description),
    ].join(' ')

    // 中文：直接 includes（保留原始大小寫）
    const detectedZh = ADULT_KEYWORDS_ZH.filter(kw => allTextForAdult.includes(kw))
    // 英文：word boundary regex（escape 特殊符號如 '+' 在 'xxx'）
    const detectedEn = ADULT_KEYWORDS_EN.filter(kw => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(allTextForAdult)
    })
    const detectedAdultKeywords = [...detectedZh, ...detectedEn]
    const adultKeywordCount = detectedAdultKeywords.length

    // 三段加權：關鍵字越多 → 分數下限越高
    let adultScoreFloor = 0
    let adultScorePoints = 0
    if (adultKeywordCount >= 3) {
      adultScoreFloor = 85
      adultScorePoints = 45
    } else if (adultKeywordCount >= 2) {
      adultScoreFloor = 70
      adultScorePoints = 35
    } else if (adultKeywordCount >= 1) {
      adultScoreFloor = 50
      adultScorePoints = 25
    }

    // 偵測到成人關鍵字 → 強制覆寫 AI 結果
    if (adultKeywordCount >= 1) {
      aiResult.riskType = 'adult_only'
      aiResult.riskScore = Math.max(adultScoreFloor, aiResult.riskScore)
    }

    // 7. 評分機制 v2：AI 基底 + 組合訊號 + 黑名單
    // ───────────────────────────────────────────────────────────
    // 核心原則：
    // • AI 分數為主（0-70 範圍內），規則修正為輔（±30）
    // • 組合訊號優於單一訊號（避免誤判合法兒童頻道）
    // • 每個加減分都記錄在 breakdown，給使用者看
    const breakdown: ScoreBreakdownItem[] = []

    // AI 基底分（上限 70，避免 AI 單獨給到 100）
    const aiBase = Math.min(70, aiResult.riskScore)
    breakdown.push({
      label: `AI 內容分析（${aiResult.summary.slice(0, 30)}…）`,
      points: aiBase,
      category: 'ai',
    })

    // 家長警示留言：3+ 筆才算強訊號
    if (warningComments.length >= 3) {
      breakdown.push({ label: `家長警示留言 ${warningComments.length} 筆`, points: 15, category: 'comment' })
    } else if (warningComments.length >= 1) {
      breakdown.push({ label: `家長警示留言 ${warningComments.length} 筆`, points: 5, category: 'comment' })
    }

    // 組合訊號：留言關閉 + 兒童磁鐵 = 警戒
    // 例外：合規幼兒頻道的留言關閉是 COPPA 法規要求，不扣分（方針 2）
    // 合規兒童頻道減分，但過度刺激類型不適用（COPPA 合規 ≠ 適合長時間觀看）
    if (isLegitKidsChannel && aiResult.riskType !== 'overstimulating') {
      breakdown.push({
        label: `YouTube 官方認證兒童頻道（${Math.round(madeForKidsRatio * 100)}% 影片 Made for Kids）`,
        points: -15,
        category: 'adjustment',
      })
    } else if (commentsDisabledRatio >= 0.7 && childAppealScore >= 40) {
      breakdown.push({
        label: `留言區關閉 ${Math.round(commentsDisabledRatio * 100)}% + 高兒童吸引力訊號`,
        points: 15,
        category: 'combo',
      })
    } else if (commentsDisabledRatio >= 0.7 && childAppealScore >= 25 && madeForKidsRatio < 0.5) {
      breakdown.push({
        label: `留言區關閉 ${Math.round(commentsDisabledRatio * 100)}%（無法驗證家長反饋）`,
        points: 8,
        category: 'combo',
      })
    }

    // 組合訊號：挑戰/吃播內容 + 兒童關鍵字
    const hasChallengeContent = childAppealSignals.some(s => /挑戰|食物|吃播/.test(s))
    const hasChildKeywords = childTargetingSignals.length >= 2
    if (hasChallengeContent && hasChildKeywords) {
      breakdown.push({
        label: '挑戰/吃播內容 + 多個兒童關鍵字（磁鐵效應）',
        points: 10,
        category: 'combo',
      })
    }

    // 手動黑名單（權重降低避免過度懲罰）
    if (BLACKLIST.includes(channelInfo.id)) {
      breakdown.push({ label: '已列入家長回報黑名單', points: 25, category: 'blacklist' })
    }

    // 減分因子：訂閱數 < 1000（影響力極小）
    const subCount = Number(channelInfo.subscriberCount)
    if (subCount > 0 && subCount < 1000) {
      breakdown.push({ label: '訂閱數少於 1000（影響力小）', points: -10, category: 'adjustment' })
    }

    // adult_only：依關鍵字數量決定加分幅度
    if (aiResult.riskType === 'adult_only') {
      if (adultKeywordCount >= 1) {
        // 露骨成人內容：依關鍵字數量三段加分
        breakdown.push({
          label: `偵測到 ${adultKeywordCount} 個成人露骨關鍵字（${detectedAdultKeywords.slice(0, 3).join('、')}${adultKeywordCount > 3 ? '...' : ''}）`,
          points: adultScorePoints,
          category: 'adjustment',
        })
      } else {
        // 純非兒童（新聞、科技）：減分
        breakdown.push({
          label: 'AI 判定為非兒童向內容（新聞/科技類）',
          points: -15,
          category: 'adjustment',
        })
      }
    }

    // overstimulating：AI 基底已落 35-55，記錄標籤、不另加減分
    if (aiResult.riskType === 'overstimulating') {
      breakdown.push({
        label: 'AI 判定為過度刺激內容（快剪輯 / 強聲光，可能影響幼兒注意力發展）',
        points: 0,
        category: 'adjustment',
      })
    }

    // 加總並封頂
    const rawScore = breakdown.reduce((sum, item) => sum + item.points, 0)
    const finalScore = Math.max(0, Math.min(100, rawScore))

    // 8. Risk level（adult_inappropriate 優先，不走分數三段）
    let riskLevel: RiskLevel = 'low'
    if (aiResult.riskType === 'adult_only' && adultKeywordCount >= 1) {
      riskLevel = 'adult_inappropriate'
    } else if (finalScore >= 65) riskLevel = 'high'
    else if (finalScore >= 35) riskLevel = 'medium'

    const result: AnalysisResult = {
      riskLevel,
      riskScore: finalScore,
      riskType: aiResult.riskType,
      channelId: channelInfo.id,
      channelName: channelInfo.name,
      channelThumbnail: channelInfo.thumbnail,
      videoCount: channelInfo.videos.length,
      commentsDisabled,
      warningComments: await (async () => {
        const translations = await translationsPromise
        return warningComments.map((c, i) => {
          const cleanText = c.text.replace(/<[^>]+>/g, '')
          const translated = translations[i]?.trim()
          // YouTube 留言深度連結（點開會跳到該影片並捲到留言位置）
          const sourceUrl = c.videoId
            ? `https://www.youtube.com/watch?v=${c.videoId}${c.commentId ? `&lc=${c.commentId}` : ''}`
            : undefined
          return {
            text: cleanText,
            textZh: translated && translated !== cleanText.trim() ? translated : undefined,
            author: c.author,
            likeCount: c.likeCount,
            videoId: c.videoId,
            videoTitle: c.videoTitle,
            commentId: c.commentId,
            sourceUrl,
          }
        })
      })(),
      suspiciousTags: [...childTargetingSignals, ...childAppealSignals].slice(0, 8),
      aiSummary: aiResult.summary,
      recommendation: aiResult.recommendation,
      checkedAt: new Date().toISOString(),
      channelUrl: trimmedUrl,
      scoreBreakdown: breakdown,
    }

    // 計數已在進入 try 前原子化遞增完成，這裡直接回傳結果
    return NextResponse.json(result, { headers: rlHeaders })
  } catch (err: unknown) {
    // 掃描失敗：回滾剛才扣掉的那一次免費次數，避免使用者被白扣
    if (scanCounted) {
      decrementScanCount(fingerprint).catch(() => {})
    }
    console.error('Analyze error:', err)
    const message = err instanceof Error ? err.message : '分析失敗'
    if (message.includes('quotaExceeded') || message.includes('403')) {
      return NextResponse.json({ error: 'YouTube API 配額已達上限，請明天再試' }, { status: 429, headers: rlHeaders })
    }
    if (message.includes('找不到') || message.includes('無法辨識')) {
      return NextResponse.json({ error: message }, { status: 400, headers: rlHeaders })
    }
    return NextResponse.json({ error: `分析失敗：${message}` }, { status: 500, headers: rlHeaders })
  }
}
