import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getChannelInfo, getVideoComments, CommentThread } from '@/lib/youtube'
import { AnalysisResult, RiskLevel, ScoreBreakdownItem } from '@/types/analysis'

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
}): Promise<{ summary: string; riskScore: number; recommendation: string; riskType?: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const {
    channelName, channelDescription, subscriberCount, videoCount,
    videoTitles, videoDescriptions, warningComments,
    childTargetingSignals, childAppealSignals,
    commentsDisabled, commentsDisabledRatio,
  } = params

  const prompt = `你是一位專門評估 YouTube 內容是否適合 6 歲以下幼兒的安全分析師。

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

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: '請提供 YouTube 網址' }, { status: 400 })

    const ytApiKey = process.env.YOUTUBE_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!ytApiKey || !geminiApiKey) {
      return NextResponse.json({ error: '伺服器設定錯誤，請聯絡管理員' }, { status: 500 })
    }

    // 1. Channel info
    const channelInfo = await getChannelInfo(url, ytApiKey)

    // 2. Comments from up to 10 videos (not just 5)
    const commentPromises = channelInfo.videos.slice(0, 10).map(v =>
      getVideoComments(v.id, ytApiKey, 50)
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

    // 6. AI analysis
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
    if (commentsDisabledRatio >= 0.7 && childAppealScore >= 30) {
      breakdown.push({
        label: `留言區關閉 ${Math.round(commentsDisabledRatio * 100)}% + 兒童吸引力訊號`,
        points: 15,
        category: 'combo',
      })
    } else if (commentsDisabledRatio >= 0.7 && childAppealScore >= 15) {
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
      warningComments: warningComments.map(c => ({
        text: c.text.replace(/<[^>]+>/g, ''),
        author: c.author,
        likeCount: c.likeCount,
      })),
      suspiciousTags: [...childTargetingSignals, ...childAppealSignals].slice(0, 8),
      aiSummary: aiResult.summary,
      recommendation: aiResult.recommendation,
      checkedAt: new Date().toISOString(),
      channelUrl: url,
      scoreBreakdown: breakdown,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Analyze error:', err)
    const message = err instanceof Error ? err.message : '分析失敗'
    if (message.includes('quotaExceeded') || message.includes('403')) {
      return NextResponse.json({ error: 'YouTube API 配額已達上限，請明天再試' }, { status: 429 })
    }
    if (message.includes('找不到') || message.includes('無法辨識')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: `分析失敗：${message}` }, { status: 500 })
  }
}
