// Notion client + helpers — 把 feedback / discussion 寫進 Oscar 的 Notion DB
//
// 預期 Notion database schema（properties）：
//   - 頻道名（Title）— database 的主標題欄位
//   - 時間（Date）
//   - 類型（Select）— 選項：rating_correction / discussion
//   - 頻道 ID（Rich text）
//   - Mia 星等（Number）— 1-5，只 rating_correction 有
//   - Mia 留言（Rich text）
//   - IP（Rich text）
//
// 如果 Oscar 用了不同的 property 名，調整 PROP_* 常數即可

import { Client } from '@notionhq/client'

export const PROP = {
  TITLE: '頻道名',
  DATE: '時間',
  TYPE: '類型',
  CHANNEL_ID: '頻道 ID',
  MIA_RATING: 'Mia 星等',
  MIA_COMMENT: 'Mia 留言',
  IP: 'IP',
} as const

export type FeedbackType = 'rating_correction' | 'discussion'

export interface FeedbackPayload {
  type: FeedbackType
  channelId: string
  channelName: string
  miaRating?: number
  miaComment: string
  ip: string
}

let cachedClient: Client | null = null
let cachedDataSourceId: string | null = null

export function getNotionClient(): Client | null {
  const key = process.env.NOTION_API_KEY
  if (!key) return null
  if (!cachedClient) cachedClient = new Client({ auth: key })
  return cachedClient
}

export function getNotionDatabaseId(): string | null {
  return process.env.NOTION_DATABASE_ID || null
}

/**
 * Notion SDK v5 把 query 從 databases 移到 dataSources。
 * 每個 database 預設有一個 data_source；這裡 lazy 取 + 程序生命週期內 cache。
 */
async function getDataSourceId(): Promise<string | null> {
  if (cachedDataSourceId) return cachedDataSourceId
  const notion = getNotionClient()
  const dbId = getNotionDatabaseId()
  if (!notion || !dbId) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await notion.databases.retrieve({ database_id: dbId }) as any
    const ds = db.data_sources?.[0]?.id
    if (ds) {
      cachedDataSourceId = ds
      return ds
    }
  } catch (err) {
    console.error('[notion] retrieve database failed:', err)
  }
  // fallback：v5 仍部分支援把 databaseId 當 data_source_id 用（舊 DB）
  cachedDataSourceId = dbId
  return dbId
}

/**
 * 寫一筆 feedback / discussion 到 Notion database
 * 回 true = 成功；false = 失敗（會 throw 給 caller 處理）
 */
export async function createFeedbackPage(payload: FeedbackPayload): Promise<void> {
  const notion = getNotionClient()
  const databaseId = getNotionDatabaseId()
  if (!notion || !databaseId) {
    throw new Error('Notion env vars not configured')
  }

  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      [PROP.TITLE]: {
        title: [{ text: { content: payload.channelName.slice(0, 200) || '未知頻道' } }],
      },
      [PROP.DATE]: {
        date: { start: new Date().toISOString() },
      },
      [PROP.TYPE]: {
        select: { name: payload.type },
      },
      [PROP.CHANNEL_ID]: {
        rich_text: [{ text: { content: payload.channelId.slice(0, 200) } }],
      },
      ...(typeof payload.miaRating === 'number' && payload.miaRating > 0
        ? { [PROP.MIA_RATING]: { number: payload.miaRating } }
        : {}),
      [PROP.MIA_COMMENT]: {
        rich_text: [{ text: { content: payload.miaComment.slice(0, 1900) } }],
      },
      [PROP.IP]: {
        rich_text: [{ text: { content: payload.ip.slice(0, 64) } }],
      },
    },
  })
}

export interface DiscussionItem {
  id: string
  content: string
  miaRating?: number
  submittedAt: string
}

/**
 * 拉某個 channel 的「補充討論」（按時間 DESC）
 * Notion 用 cursor 分頁，這裡為了讓前端用「page=N」分頁，做簡單翻頁累加
 */
export async function listDiscussions(
  channelId: string,
  page: number,
  limit: number
): Promise<{ discussions: DiscussionItem[]; hasMore: boolean }> {
  const notion = getNotionClient()
  const dataSourceId = await getDataSourceId()
  if (!notion || !dataSourceId) {
    return { discussions: [], hasMore: false }
  }

  let cursor: string | undefined = undefined
  let collected: unknown[] = []
  let hasMore = false
  const target = page * limit

  while (collected.length < target) {
    const remaining = target - collected.length
    const pageSize = Math.min(100, Math.max(10, remaining))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await (notion as any).dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        and: [
          { property: PROP.TYPE, select: { equals: 'discussion' } },
          { property: PROP.CHANNEL_ID, rich_text: { equals: channelId } },
        ],
      },
      sorts: [{ property: PROP.DATE, direction: 'descending' }],
      page_size: pageSize,
      start_cursor: cursor,
    })
    collected = collected.concat(res.results || [])
    hasMore = Boolean(res.has_more)
    if (!res.has_more) break
    cursor = res.next_cursor || undefined
  }

  // 取第 page 頁的 limit 筆
  const start = (page - 1) * limit
  const slice = collected.slice(start, start + limit)

  const discussions: DiscussionItem[] = slice.map((r): DiscussionItem => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = r as any
    const props = item.properties ?? {}
    const comment = props[PROP.MIA_COMMENT]?.rich_text?.[0]?.plain_text ?? ''
    const rating = props[PROP.MIA_RATING]?.number ?? undefined
    const submittedAt = props[PROP.DATE]?.date?.start ?? new Date().toISOString()
    return {
      id: item.id,
      content: comment,
      miaRating: rating,
      submittedAt,
    }
  })

  // hasMore：要嘛 Notion 還有 more，要嘛這頁之後 collected 還有剩
  const localHasMore = collected.length > start + limit
  return {
    discussions,
    hasMore: hasMore || localHasMore,
  }
}
