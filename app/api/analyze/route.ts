import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getChannelInfo, getVideoComments, CommentThread } from '@/lib/youtube'
import { AnalysisResult, RiskLevel, ScoreBreakdownItem } from '@/types/analysis'
import { authenticate, corsHeaders } from '@/lib/api-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

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

【評估框架：三種風險類型】

▌類型 A — Elsagate（分數 65–100）
頻道表面使用兒童元素（卡通、玩具、兒歌），實際含暴力、性暗示、恐怖元素。

▌類型 B — 兒童磁鐵內容（分數 35–65）
頻道本身不定位為兒童頻道，但滿足以下條件：
• 視覺設計（卡通人物、糖果、鮮豔色彩）對幼兒極具吸引力
• 內容類型（挑戰、吃播、搞笑惡搞）6 歲以下會主動點入
• 行為有不良示範（危險模仿、不雅語言、暴力衝突）
• 留言區關閉 + 兒童吸引力 = 高警戒訊號

▌類型 C — 非兒童受眾（分數 0–30）
新聞、科技教學、政治評論、成人娛樂 — 6 歲幼兒不會主動或誤觸。

【核心判斷問題】
1. 一個 6 歲的孩子看到頻道縮圖、名稱、影片標題，會不會有興趣點進去？
2. 內容是否有幼兒可能模仿的危險行為、不適當語言、驚嚇元素？
3. 留言區關閉比率高 + 兒童吸引視覺 = 刻意迴避家長監督的訊號，需加重評分。

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

請用繁體中文回答，只輸出以下 JSON 格式（不要其他文字）：
{
  "riskScore": <0–100 整數>,
  "riskType": <"elsagate" | "child_magnet" | "adult_only" | "mixed">,
  "summary": "<2–3句：1)頻道定位與內容性質 2)對6歲以下的吸引力評估 3)風險判斷依據>",
  "recommendation": "<給家長的具體建議，1–2句>"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 回應格式異常')
  return JSON.parse(jsonMatch[0])
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

  // ── 2. Rate limit：官網 5/分鐘 per IP，API key 30/分鐘 per key ──
  const rlKey = auth.via === 'api-key' ? `key:${auth.keyOrIp}` : `ip:${getClientIp(req)}`
  const rlLimit = auth.via === 'api-key' ? 30 : 5
  const rl = rateLimit(rlKey, rlLimit, 60_000)
  const rlHeaders: HeadersInit = {
    ...corsHeaders(req, auth),
    'X-RateLimit-Limit': String(rl.limit),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
  }
  if (!rl.ok) {
    return NextResponse.json(
      { error: `請求過於頻繁，請稍後再試（每分鐘上限 ${rl.limit} 次）` },
      { status: 429, headers: rlHeaders }
    )
  }

  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: '請提供 YouTube 網址' }, { status: 400, headers: rlHeaders })

    const ytApiKey = process.env.YOUTUBE_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!ytApiKey || !geminiApiKey) {
      return NextResponse.json({ error: '伺服器設定錯誤，請聯絡管理員' }, { status: 500, headers: rlHeaders })
    }

    // 1. Channel info
    const channelInfo = await getChannelInfo(url, ytApiKey)

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
    if (isLegitKidsChannel) {
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

    // 減分因子：AI 判定為成人非兒童內容
    if (aiResult.riskType === 'adult_only') {
      breakdown.push({ label: 'AI 判定為成人非兒童向內容', points: -15, category: 'adjustment' })
    }

    // 加總並封頂
    const rawScore = breakdown.reduce((sum, item) => sum + item.points, 0)
    const finalScore = Math.max(0, Math.min(100, rawScore))

    // 8. Risk level
    let riskLevel: RiskLevel = 'low'
    if (finalScore >= 65) riskLevel = 'high'
    else if (finalScore >= 35) riskLevel = 'medium'

    const result: AnalysisResult = {
      riskLevel,
      riskScore: finalScore,
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
      channelUrl: url,
      scoreBreakdown: breakdown,
    }

    return NextResponse.json(result, { headers: rlHeaders })
  } catch (err: unknown) {
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
