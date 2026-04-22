import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getChannelInfo, getVideoComments, CommentThread } from '@/lib/youtube'
import { AnalysisResult, RiskLevel } from '@/types/analysis'

const PARENT_WARNING_KEYWORDS = [
  '嚇到', '嚇', '可怕', '恐怖', '不適合', '不應該', '不能看', '千萬別',
  '我小孩哭', '我孩子哭', '孩子看到', '孩子嚇', '給小孩看', '兒童不宜',
  '下架', '舉報', '檢舉', '色情', '暴力', '血腥', '噁心', '詭異',
  'disturbing', 'inappropriate', 'not for kids', 'scary', 'horrifying',
  'my child', 'my kid', 'children should not', 'report', 'flag this',
  'wtf', 'creepy', 'nightmare', 'traumatized', '惡夢', '有問題'
]

const SUSPICIOUS_TAGS = [
  'kids', 'children', 'baby', 'nursery rhyme', 'cartoon', 'learning',
  '兒童', '寶寶', '小朋友', '幼兒', '卡通', '學習', '教育',
  'finger family', 'johny johny', 'colors for kids', 'surprise eggs',
]

function detectWarningComments(comments: CommentThread[]) {
  return comments.filter(c => {
    const text = c.text.toLowerCase()
    return PARENT_WARNING_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))
  }).slice(0, 5)
}

function detectSuspiciousTags(allTags: string[], titles: string[]): string[] {
  const combined = [...allTags, ...titles].join(' ').toLowerCase()
  const found = SUSPICIOUS_TAGS.filter(tag => combined.includes(tag.toLowerCase()))

  // Extra pattern: multiple unrelated themes mixed (e.g. "Spiderman + Elsa + learning")
  const titleText = titles.join(' ').toLowerCase()
  if (/spiderman|batman|elsa|frozen/.test(titleText) && /learning|nursery|kids/.test(titleText)) {
    found.push('混用角色+兒童教育（Elsagate 常見手法）')
  }

  return Array.from(new Set(found)).slice(0, 8)
}

async function analyzeWithGemini(
  channelName: string,
  videoTitles: string[],
  warningComments: CommentThread[],
  suspiciousTags: string[],
  commentsDisabled: boolean
): Promise<{ summary: string; riskScore: number; recommendation: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `你是一個專門保護兒童的內容安全分析師。請分析以下 YouTube 頻道資訊，評估是否存在「Elsagate」類型風險（將危險、不適合兒童的內容偽裝成兒童影片）。

【頻道名稱】${channelName}

【最近影片標題（最多20部）】
${videoTitles.slice(0, 20).map((t, i) => `${i + 1}. ${t}`).join('\n')}

【留言區狀態】${commentsDisabled ? '已關閉（高風險訊號）' : '開啟中'}

【家長警示留言（若有）】
${warningComments.length > 0 ? warningComments.map(c => `- "${c.text}"`).join('\n') : '無明顯警示留言'}

【疑似危險標籤/關鍵字】
${suspiciousTags.length > 0 ? suspiciousTags.join('、') : '無'}

請用繁體中文回答，格式如下（只輸出 JSON，不要其他文字）：
{
  "riskScore": <0-100 整數，0最安全，100最危險>,
  "summary": "<2-3句話的分析摘要，說明判斷依據>",
  "recommendation": "<給家長的具體建議，1-2句>"
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  // Extract JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI 回應格式異常')

  return JSON.parse(jsonMatch[0])
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url) {
      return NextResponse.json({ error: '請提供 YouTube 網址' }, { status: 400 })
    }

    const ytApiKey = process.env.YOUTUBE_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!ytApiKey || !geminiApiKey) {
      return NextResponse.json({ error: '伺服器設定錯誤，請聯絡管理員' }, { status: 500 })
    }

    // 1. Get channel info + videos
    const channelInfo = await getChannelInfo(url, ytApiKey)

    // 2. Get comments from first 5 videos
    const commentPromises = channelInfo.videos.slice(0, 5).map(v =>
      getVideoComments(v.id, ytApiKey, 50)
    )
    const allCommentArrays = await Promise.allSettled(commentPromises)
    const allComments: CommentThread[] = allCommentArrays
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => (r as PromiseFulfilledResult<CommentThread[]>).value)

    // 3. Detect comments disabled
    const commentsDisabled = allComments.length === 0 && channelInfo.videos.length > 0

    // 4. Detect warning signals
    const warningComments = detectWarningComments(allComments)
    const allTags = channelInfo.videos.flatMap(v => v.tags)
    const videoTitles = channelInfo.videos.map(v => v.title)
    const suspiciousTags = detectSuspiciousTags(allTags, videoTitles)

    // 5. AI analysis
    const aiResult = await analyzeWithGemini(
      channelInfo.name,
      videoTitles,
      warningComments,
      suspiciousTags,
      commentsDisabled
    )

    // 6. Determine risk level
    let riskLevel: RiskLevel = 'low'
    if (aiResult.riskScore >= 60) riskLevel = 'high'
    else if (aiResult.riskScore >= 30) riskLevel = 'medium'

    // Boost score for comments disabled
    const finalScore = Math.min(100, commentsDisabled ? aiResult.riskScore + 15 : aiResult.riskScore)
    if (finalScore >= 60) riskLevel = 'high'
    else if (finalScore >= 30) riskLevel = 'medium'

    const result: AnalysisResult = {
      riskLevel,
      riskScore: finalScore,
      channelName: channelInfo.name,
      channelThumbnail: channelInfo.thumbnail,
      videoCount: channelInfo.videos.length,
      commentsDisabled,
      warningComments: warningComments.map(c => ({
        text: c.text.replace(/<[^>]+>/g, ''), // strip HTML
        author: c.author,
        likeCount: c.likeCount,
      })),
      suspiciousTags,
      aiSummary: aiResult.summary,
      recommendation: aiResult.recommendation,
      checkedAt: new Date().toISOString(),
      channelUrl: url,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('Analyze error:', err)
    const message = err instanceof Error ? err.message : '分析失敗'

    // User-friendly error messages
    if (message.includes('quotaExceeded') || message.includes('403')) {
      return NextResponse.json({ error: 'YouTube API 配額已達上限，請明天再試' }, { status: 429 })
    }
    if (message.includes('找不到') || message.includes('無法辨識')) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ error: `分析失敗：${message}` }, { status: 500 })
  }
}
