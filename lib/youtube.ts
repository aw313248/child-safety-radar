const YT_API = 'https://www.googleapis.com/youtube/v3'

export interface VideoInfo {
  id: string
  title: string
  tags: string[]
  commentsDisabled: boolean
}

export interface ChannelInfo {
  id: string
  name: string
  thumbnail: string
  videos: VideoInfo[]
}

export interface CommentThread {
  text: string
  author: string
  likeCount: number
}

function extractChannelId(url: string): { type: 'channel' | 'video' | 'handle'; value: string } | null {
  const patterns = [
    // Handle: @username
    { re: /youtube\.com\/@([\w.-]+)/, type: 'handle' as const, group: 1 },
    // Channel ID
    { re: /youtube\.com\/channel\/(UC[\w-]+)/, type: 'channel' as const, group: 1 },
    // Custom URL
    { re: /youtube\.com\/c\/([\w-]+)/, type: 'handle' as const, group: 1 },
    // User
    { re: /youtube\.com\/user\/([\w-]+)/, type: 'handle' as const, group: 1 },
    // Video
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
    // Get channel from video
    const data = await fetchJson(
      `${YT_API}/videos?part=snippet&id=${parsed.value}&key=${apiKey}`
    )
    if (!data.items?.length) throw new Error('找不到這部影片')
    channelId = data.items[0].snippet.channelId
  } else if (parsed.type === 'handle') {
    // Search for channel by handle/custom name
    const data = await fetchJson(
      `${YT_API}/search?part=snippet&type=channel&q=${encodeURIComponent(parsed.value)}&maxResults=1&key=${apiKey}`
    )
    if (!data.items?.length) throw new Error('找不到這個頻道')
    channelId = data.items[0].snippet.channelId
  } else {
    channelId = parsed.value
  }

  // Get channel details
  const channelData = await fetchJson(
    `${YT_API}/channels?part=snippet,contentDetails&id=${channelId}&key=${apiKey}`
  )
  if (!channelData.items?.length) throw new Error('無法取得頻道資料')

  const channel = channelData.items[0]
  const playlistId = channel.contentDetails?.relatedPlaylists?.uploads

  // Get latest 20 videos
  let videos: VideoInfo[] = []
  if (playlistId) {
    const playlistData = await fetchJson(
      `${YT_API}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=20&key=${apiKey}`
    )
    const videoIds = playlistData.items?.map((i: { contentDetails: { videoId: string } }) => i.contentDetails.videoId).join(',') || ''

    if (videoIds) {
      const videosData = await fetchJson(
        `${YT_API}/videos?part=snippet,status&id=${videoIds}&key=${apiKey}`
      )
      videos = videosData.items?.map((v: { id: string; snippet: { title: string; tags?: string[] }; status: { madeForKids?: boolean } }) => ({
        id: v.id,
        title: v.snippet.title || '',
        tags: v.snippet.tags || [],
        commentsDisabled: v.status?.madeForKids === true || false,
      })) || []
    }
  }

  return {
    id: channelId,
    name: channel.snippet.title,
    thumbnail: channel.snippet.thumbnails?.default?.url || '',
    videos,
  }
}

export async function getVideoComments(
  videoId: string,
  apiKey: string,
  maxResults = 50
): Promise<CommentThread[]> {
  try {
    const data = await fetchJson(
      `${YT_API}/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${apiKey}`
    )
    return (data.items || []).map((item: { snippet: { topLevelComment: { snippet: { textDisplay: string; authorDisplayName: string; likeCount: number } } } }) => ({
      text: item.snippet.topLevelComment.snippet.textDisplay || '',
      author: item.snippet.topLevelComment.snippet.authorDisplayName || '',
      likeCount: item.snippet.topLevelComment.snippet.likeCount || 0,
    }))
  } catch {
    // Comments disabled or unavailable
    return []
  }
}
