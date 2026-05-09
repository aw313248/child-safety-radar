import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getChannelInfo, getVideoComments, CommentThread } from '@/lib/youtube'
import { AnalysisResult, RiskLevel, ScoreBreakdownItem, ChannelScore, ScoreDimension } from '@/types/analysis'
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

  // Gemini safety filter 可能擋掉某些頻道（如 Bluey），捕捉 PROHIBITED_CONTENT
  let text: string
  try {
    text = result.response.text().trim()
  } catch (textErr) {
    const msg = textErr instanceof Error ? textErr.message : String(textErr)
    if (msg.includes('PROHIBITED_CONTENT') || msg.includes('blocked')) {
      throw new Error('AI 安全過濾器誤觸，此頻道暫時無法分析（已知問題，非有害內容）')
    }
    throw new Error(`AI 回應無法讀取：${msg}`)
  }

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

// ── 拿鐵媽媽 v1.0 低刺激評分 — server-side 自動降級規則 ─────────
// framework 啟發自 @happy.3clatte，Threads：https://www.threads.net/@happy.3clatte
// 授權確認後更新為「授權使用」
function applyAutoDowngrade(score: Omit<ChannelScore, 'overallRating'>): ChannelScore {
  const dims: ScoreDimension[] = [score.pacing, score.visual, score.auditory, score.realism, score.behavioral]
  const lowCount = dims.filter(d => d.stars < 3).length

  let overallRating: ChannelScore['overallRating']
  if (lowCount >= 2) {
    overallRating = '不建議觀看'
  } else if (lowCount === 1) {
    overallRating = '中度符合'
  } else if (dims.every(d => d.stars >= 4)) {
    overallRating = '高度推薦'
  } else {
    overallRating = '中度符合'
  }

  return { ...score, overallRating }
}

// ── 拿鐵媽媽 v1.0 低刺激 5 維度評分（AI） ───────────────────────
// 使用拿鐵媽媽 v1.0 原版 prompt（@happy.3clatte 授權內部使用）
// model: gemini-2.5-flash（production API key 只支援此版本）
async function analyzeLowStimulation(params: {
  channelName: string
  channelDescription: string
  subscriberCount: string
  videoTitles: string[]
  videoDescriptions: string[]
  madeForKidsRatio: number
  isLegitKidsChannel: boolean
}): Promise<ChannelScore | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0, topP: 0.1, topK: 1 },
    })

    const { channelName, channelDescription, subscriberCount, videoTitles, videoDescriptions, madeForKidsRatio } = params

    // ── 拿鐵媽媽 v1.0 原版 prompt + 5 few-shot examples ─────────
    const prompt = `你是學齡前低刺激影音篩選專家

五大篩選指南與標準

1. 畫面節奏 (Pacing)：單一鏡頭需維持 6 秒以上，避免頻繁切換或過度縮放。鏡頭應模擬真實觀看視角，嚴禁劇烈旋轉、俯衝或無意義震動，以減少大腦處理視覺資訊時的深度疲勞

2. 視覺環境 (Visual Environment)：追求視覺降噪，色調需柔和且背景簡潔，避免過多閃爍特效或雜亂裝飾

3. 聲音與互動 (Auditory & Interaction)：配樂應隨情境輕柔起伏，對話須清晰，且句間需保留 3-5 秒的「聽覺留白」。角色應展現平穩正向的情緒調節，不以尖叫或誇大恐懼來吸引注意

4. 敘事與真實性 (Realism & Logic)：角色移動與情節發展應符合物理規律（如正常行走、因果關係明確），避免瞬間移動或缺乏邏輯的視覺衝擊

5. 觀後反應 (Behavioral Response)：評估影片是否會引發多巴胺激增。理想影片應讓孩子在關閉後，能平靜地過渡到現實活動

任務目標
當提供「影片連結」或「頻道名稱」時，執行以下分析：

1. 詳細分析：針對上述五項指標逐一評分，格式為「★★★★★(優)」，括號內需含描述性字眼（如：優、良、普、不建議），並說明具體觀察原因

2. 綜合評等：分為「高度推薦(低刺激)」、「中度符合(建議家長陪同)」、「不建議觀看(高刺激)」。若前五項指標中有任何一項低於 ★★★(普)，則綜合評等最高不得超過「中度符合」

3. 具體建議：若影片有缺點，請指出適合的年齡層，且建議需嚴格遵循 AAP 與 WHO 育兒標準

4. 格式禁令（嚴格執行）：禁止輸出任何開場白、結語、任務說明或寒暄。直接由分析結果開始輸出，結尾亦不得包含任何總結性贅詞

以下是已評估的參考範例：

範例 1：Super Simple Songs - Five Spotted Dogs
- 畫面節奏 ★★★★★(優)：單一鏡頭多維持 6 秒以上，轉換節奏緩慢平穩
- 視覺環境 ★★★★★(優)：背景設計簡潔，色調柔和飽滿，無多餘閃爍特效
- 聲音與互動 ★★★★★(優)：配樂輕快柔和，數數與動作之間留有清晰留白
- 敘事與真實性 ★★★★★(優)：小狗移動方式（慢跑、拿骨頭）符合物理規律
- 觀後反應 ★★★★★(優)：氛圍寧靜祥和，無多巴胺激增風險
- 綜合：高度推薦（低刺激），18 個月-3 歲

範例 2：Bluey - Pizza Girls
- 畫面節奏 ★★★★★(優)：鏡頭切換頻率極低，多以中長鏡頭記錄角色互動
- 視覺環境 ★★★★★(優)：色調飽和但溫暖柔和，背景簡潔不雜亂
- 聲音與互動 ★★★★★(優)：對話咬字清晰，角色以溝通解決衝突而非尖叫
- 敘事與真實性 ★★★★★(優)：劇情圍繞兒童想像遊戲與真實生活經驗，因果邏輯強
- 觀後反應 ★★★★★(優)：氛圍平靜祥和，著重情感連結與日常教育
- 綜合：高度推薦（低刺激），2 歲以上

範例 3：Alphablocks - A-Z S1E1
- 畫面節奏 ★★★★★(優)：鏡頭轉換極慢且規律，無快速縮放或干擾性過場
- 視覺環境 ★★★★★(優)：背景柔和粉藍色調，設計簡潔，視覺降噪極佳
- 聲音與互動 ★★★★★(優)：每個字母發音後留有「聽覺留白」讓孩子模仿
- 敘事與真實性 ★★★★(良)：字母擬人化但移動與物體下墜遵循基本物理邏輯
- 觀後反應 ★★★★★(優)：風格平靜且教育意義，不含成癮性高度刺激元素
- 綜合：高度推薦（低刺激），2-6 歲

範例 4：Preschool Prep - Meet the Colors
- 畫面節奏 ★★★★★(優)：轉場極為緩慢，單一鏡頭停留通常超過 10 秒
- 視覺環境 ★★★★★(優)：背景純白或極簡風格，大幅減少視覺干擾
- 聲音與互動 ★★★★★(優)：對話極簡重複性高，單字之間「聽覺留白」充足
- 敘事與真實性 ★★★★(良)：擬人化顏色塊，移動互動邏輯簡單因果明確
- 觀後反應 ★★★★★(優)：氛圍極度平靜穩定，旨在教育非娛樂刺激
- 綜合：高度推薦（低刺激），9 個月-3 歲

範例 5：CoComelon - Once I Caught a Fish Alive
- 畫面節奏 ★★(不建議)：鏡頭切換過於頻繁，2-4 秒內即跳轉，無意義縮放
- 視覺環境 ★★(不建議)：色調極度鮮豔飽和，背景充滿閃爍泡泡與快速裝飾
- 聲音與互動 ★★★(普)：配樂節奏快，句間幾乎無 3-5 秒留白
- 敘事與真實性 ★★★(普)：基本因果但角色物理移動誇張略顯超現實
- 觀後反應 ★★(不建議)：高頻畫面切換 + 強烈感官刺激極易引發多巴胺激增
- 綜合：不建議觀看（高刺激），2 歲以下不建議

現在請分析以下頻道，依照完全相同的格式輸出（只輸出結果，不要開場白）：

頻道名稱：${channelName}
訂閱人數：${Number(subscriberCount).toLocaleString()}
Made for Kids 比率：${Math.round(madeForKidsRatio * 100)}%

頻道簡介：
${channelDescription ? channelDescription.slice(0, 300) : '（無）'}

最近影片標題（最多 15 部）：
${videoTitles.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join('\n')}

影片說明摘要：
${videoDescriptions.slice(0, 3).map((d, i) => `[影片${i + 1}] ${d.slice(0, 150)}`).join('\n') || '（無）'}

輸出格式（嚴格照以下順序，每行一個）：
- 畫面節奏 ★...（優/良/普/不建議）：分析原因
- 視覺環境 ★...（優/良/普/不建議）：分析原因
- 聲音與互動 ★...（優/良/普/不建議）：分析原因
- 敘事與真實性 ★...（優/良/普/不建議）：分析原因
- 觀後反應 ★...（優/良/普/不建議）：分析原因
- 綜合：X（Y刺激），Z歲
- 給家長的建議：一句話（不超過 30 字，不加句號）`

    const result = await model.generateContent(prompt)

    let text: string
    try {
      text = result.response.text().trim()
    } catch (textErr) {
      console.error('Low stimulation: Gemini response blocked or empty:', textErr)
      return null
    }

    // ── 拿鐵媽媽文字格式 parser ──────────────────────────────────
    // 規則：數「★」→ stars；(優)/(良)/(普)/(不建議) → rating；「：」後 → reason
    const parseDim = (label: string): ScoreDimension | null => {
      const lines = text.split('\n')
      const line = lines.find(l => l.includes(label))
      if (!line) return null

      // 數實心星星 ★ (U+2605)
      const starCount = (line.match(/★/g) || []).length
      const stars = Math.max(1, Math.min(5, starCount || 1)) as 1 | 2 | 3 | 4 | 5

      // 評等：支援全形（優）和半形(優)
      const ratingMatch = line.match(/[（(](優|良|普|不建議)[）)]/)
      const rating: ScoreDimension['rating'] = ratingMatch
        ? (ratingMatch[1] as ScoreDimension['rating'])
        : stars >= 5 ? '優' : stars >= 4 ? '良' : stars >= 3 ? '普' : '不建議'

      // 取最後一個冒號後的原因（支援全形「：」和半形 ":"）
      const colonIdx = Math.max(line.lastIndexOf('：'), line.lastIndexOf(':'))
      const reason = colonIdx > -1 ? line.slice(colonIdx + 1).trim() : ''

      return { stars, rating, reason }
    }

    const pacing     = parseDim('畫面節奏')
    const visual     = parseDim('視覺環境')
    const auditory   = parseDim('聲音與互動')
    const realism    = parseDim('敘事與真實性')
    const behavioral = parseDim('觀後反應')

    if (!pacing || !visual || !auditory || !realism || !behavioral) {
      console.error('Low stimulation: Failed to parse dimensions. Raw output:', text.slice(0, 500))
      return null
    }

    // 解析「綜合：」行 → overallStimulation + ageRange
    const allLines = text.split('\n')
    const summaryLine = allLines.find(l => /綜合[：:]/.test(l)) ?? ''
    let overallStimulation: ChannelScore['overallStimulation'] = '中刺激'
    if (summaryLine.includes('低刺激')) overallStimulation = '低刺激'
    else if (summaryLine.includes('高刺激')) overallStimulation = '高刺激'

    const ageMatch = summaryLine.match(/[\d一二三四五六七八九十]+\s*(?:個月|歲)[^，。\n,]*/)
    const ageRange = ageMatch ? ageMatch[0].trim() : '待確認'

    // 解析「給家長的建議：」行
    const recLine = allLines.find(l => l.includes('給家長的建議')) ?? ''
    const recColon = Math.max(recLine.lastIndexOf('：'), recLine.lastIndexOf(':'))
    const recommendation = recColon > -1
      ? recLine.slice(recColon + 1).trim()
      : '建議家長先觀看，確認內容適合後再與孩子共看'

    const partial: Omit<ChannelScore, 'overallRating'> = {
      pacing,
      visual,
      auditory,
      realism,
      behavioral,
      overallStimulation,
      ageRange,
      guidelines: ['AAP', 'WHO'],
      recommendation,
    }

    // 套用自動降級規則（鐵則：server-side 計算，不依賴 AI 的綜合評等）
    return applyAutoDowngrade(partial)
  } catch (err) {
    console.error('Low stimulation analysis error:', err instanceof Error ? err.message : err)
    return null
  }
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

    // 6b. AI analysis（主風險評估 + 低刺激 5 維度評分並行）
    const [aiResult, channelScore] = await Promise.all([
      analyzeWithGemini({
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
      }),
      analyzeLowStimulation({
        channelName: channelInfo.name,
        channelDescription: channelInfo.description,
        subscriberCount: channelInfo.subscriberCount,
        videoTitles,
        videoDescriptions,
        madeForKidsRatio,
        isLegitKidsChannel,
      }),
    ])

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
      channelScore: channelScore ?? undefined,
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
