const YT_API = 'https://www.googleapis.com/youtube/v3'

export interface VideoInfo {
  id: string
  title: string
  description: string
  tags: string[]
  viewCount: string
  commentsDisabled: boolean
}

export interface ChannelInfo {
  id: string
  name: string
  description: string
  thumbnail: string
  subscriberCount: string
  videos: VideoInfo[]
}

export interface CommentThread {
  text: string
  author: string
  likeCount: number
  videoId: string
  videoTitle?: string
  commentId: string
}

function extractChannelId(url: string): { type: 'channel' | 'video' | 'handle'; value: string } | null {
  const patterns = [
    { re: /youtube\.com\/@([\w.-]+)/, type: 'handle' as const, group: 1 },
    { re: /youtube\.com\/channel\/(UC[\w-]+)/, type: 'channel' as const, group: 1 },
    { re: /youtube\.com\/c\/([\w-]+)/, type: 'handle' as const, group: 1 },
    { re: /youtube\.com\/user\/([\w-]+)/, type: 'handle' as const, group: 1 },
    { re: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/, type: 'video' as const, group: 1 },
  ]
  for (const p of patterns) {
    const m = url.match(p.re)
    if (m) return { type: p.type, value: m[p.group] }
  }
  return null
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `YouTube API error ${res.status}`)
  }
  return res.json()
}

export async function getChannelInfo(url: string, apiKey: string): Promise<ChannelInfo> {
  const parsed = extractChannelId(url)
  if (!parsed) throw new Error('無法辨識 YouTube 網址，請確認格式是否正確')

  let channelId: string

  if (parsed.type === 'video') {
    const data = await fetchJson(
      `${YT_API}/videos?part=snippet&id=${parsed.value}&key=${apiKey}`
    )
    if (!data.items?.length) throw new Error('找不到這部影片')
    channelId = data.items[0].snippet.channelId
  } else if (parsed.type === 'handle') {
    // Try channels endpoint with forHandle first (more accurate than search)
    try {
      const data = await fetchJson(
        `${YT_API}/channels?part=snippet,contentDetails,statistics&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`
      )
      if (data.items?.length) {
        const channel = data.items[0]
        channelId = channel.id
        return buildChannelInfo(channelId, channel, apiKey)
      }
    } catch {}
    // Fallback: search
    const data = await fetchJson(
      `${YT_API}/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=1&key=${apiKey}`
    )
    if (!data.items?.length) throw new Error('找不到這個頻道')
    channelId = data.items[0].snippet.channelId
  } else {
    channelId = parsed.value
  }

  const channelData = await fetchJson(
    `${YT_API}/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${apiKey}`
  )
  if (!channelData.items?.length) throw new Error('無法取得頻道資料')
  return buildChannelInfo(channelId, channelData.items[0], apiKey)
}

async function buildChannelInfo(
  channelId: string,
  channel: {
    snippet: { title: string; description: string; thumbnails?: { default?: { url: string } } }
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
    statistics?: { subscriberCount?: string }
  },
  apiKey: string
): Promise<ChannelInfo> {
  const playlistId = channel.contentDetails?.relatedPlaylists?.uploads
  let videos: VideoInfo[] = []

  if (playlistId) {
    const playlistData = await fetchJson(
      `${YT_API}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=20&key=${apiKey}`
    )
    const videoIds = playlistData.items
      ?.map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId)
      .join(',') || ''

    if (videoIds) {
      const videosData = await fetchJson(
        `${YT_API}/videos?part=snippet,status,statistics&id=${videoIds}&key=${apiKey}`
      )
      videos = videosData.items?.map((v: {
        id: string
        snippet: { title: string; description?: string; tags?: string[] }
        status: { madeForKids?: boolean; privacyStatus?: string }
        statistics?: { commentCount?: string; viewCount?: string }
      }) => ({
        id: v.id,
        title: v.snippet.title || '',
        description: (v.snippet.description || '').slice(0, 300),
        tags: v.snippet.tags || [],
        viewCount: v.statistics?.viewCount || '0',
        commentsDisabled:
          v.status?.madeForKids === true ||
          (v.statistics?.commentCount === '0' && v.status?.privacyStatus === 'public'),
      })) || []
    }
  }

  return {
    id: channelId,
    name: channel.snippet.title,
    description: channel.snippet.description || '',
    thumbnail: channel.snippet.thumbnails?.default?.url || '',
    subscriberCount: channel.statistics?.subscriberCount || '0',
    videos,
  }
}

export async function getVideoComments(
  videoId: string,
  apiKey: string,
  maxResults = 50,
  videoTitle?: string
): Promise<CommentThread[]> {
  try {
    const data = await fetchJson(
      `${YT_API}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${apiKey}`
    )
    return (data.items || []).map((item: {
      id: string
      snippet: { topLevelComment: { id: string; snippet: { textDisplay: string; authorDisplayName: string; likeCount: number } } }
    }) => ({
      text: item.snippet.topLevelComment.snippet.textDisplay || '',
      author: item.snippet.topLevelComment.snippet.authorDisplayName || '',
      likeCount: item.snippet.topLevelComment.snippet.likeCount || 0,
      videoId,
      videoTitle,
      commentId: item.snippet.topLevelComment.id || item.id,
    }))
  } catch {
    return []
  }
}
