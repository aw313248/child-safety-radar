// 精選安心頻道清單
// 人工挑選 + 定期審核，確保適合台灣家庭
// UC ID 以官方頻道為準，想新增請掃描驗證後再加入

export type AgeGroup = '0-3' | '3-6' | '6-10'
export type Category = 'song' | 'story' | 'learn' | 'cartoon'

export interface CuratedChannel {
  channelId: string      // UC… 開頭的 YouTube 頻道 ID
  name: string           // 顯示名稱（繁中）
  handle?: string        // YouTube handle，用於連回原頻道
  description: string    // 一句話描述
  ageGroups: AgeGroup[]  // 適合年齡
  categories: Category[] // 內容類別
  language: 'zh' | 'en' | 'both'
  emoji: string          // 封面 emoji（還沒抓到縮圖時用）
}

export const CURATED_CHANNELS: CuratedChannel[] = [
  // ── 0–3 歲幼兒 · 中文兒歌類 ───────────────────────────
  {
    channelId: 'UCcdwLMPsaU2ezNSJU1nFoBQ',
    name: 'Pinkfong 碰碰狐',
    handle: '@pinkfong',
    description: '鯊魚寶寶、動物兒歌，全世界最紅的幼兒音樂頻道',
    ageGroups: ['0-3', '3-6'],
    categories: ['song'],
    language: 'both',
    emoji: '🦈',
  },
  {
    channelId: 'UCLsooMJoIpl_7ux2jvdPB-Q',
    name: 'Super Simple Songs',
    handle: '@SuperSimpleSongs',
    description: '英文兒歌經典，節奏溫和、動畫可愛',
    ageGroups: ['0-3', '3-6'],
    categories: ['song', 'learn'],
    language: 'en',
    emoji: '🎵',
  },
  {
    channelId: 'UCpqXJOEqGS-TCnazcHCo0rA',
    name: 'Little Baby Bum',
    handle: '@LittleBabyBum',
    description: '英文童謠動畫，專為幼兒設計',
    ageGroups: ['0-3', '3-6'],
    categories: ['song'],
    language: 'en',
    emoji: '🐑',
  },
  {
    channelId: 'UCuM8Rv0KiPPcN7WQVW1SC3g',
    name: 'ChuChu TV',
    handle: '@chuchutv',
    description: '國際版幼兒歌曲，畫面明亮',
    ageGroups: ['0-3', '3-6'],
    categories: ['song'],
    language: 'en',
    emoji: '🎨',
  },

  // ── 3–6 歲 · 故事 & 卡通 ──────────────────────────────
  {
    channelId: 'UCbCmjCuTUZos6Inko4u57UQ',
    name: 'CoComelon',
    handle: '@CoComelon',
    description: 'JJ 一家人的日常歌曲，幼兒認識生活用語',
    ageGroups: ['0-3', '3-6'],
    categories: ['song', 'cartoon'],
    language: 'en',
    emoji: '🍉',
  },
  {
    channelId: 'UCAOtE1V7Ots4DjM8JLlrYgg',
    name: 'Peppa Pig 官方',
    handle: '@PeppaPigOfficial',
    description: '粉紅豬小妹英文原版卡通',
    ageGroups: ['3-6'],
    categories: ['cartoon', 'story'],
    language: 'en',
    emoji: '🐷',
  },
  {
    channelId: 'UC9Iz5TXbU5tQxdrf-ojqcAw',
    name: 'Peppa Pig 中文版',
    handle: '@PeppaPigChinese',
    description: '粉紅豬小妹繁體中文配音',
    ageGroups: ['3-6'],
    categories: ['cartoon', 'story'],
    language: 'zh',
    emoji: '🐽',
  },
  {
    channelId: 'UCJxDp8_zPqW2S5f4UMwKKjA',
    name: 'Mister Rogers Neighborhood',
    handle: '@misterrogers',
    description: '溫和經典兒童節目',
    ageGroups: ['3-6'],
    categories: ['story'],
    language: 'en',
    emoji: '🏘️',
  },

  // ── 3–6 歲 · 中文學習 ─────────────────────────────────
  {
    channelId: 'UCCoCvQSYcZHEjRwJXKFQn3w',
    name: '巧虎 Qiaohu',
    handle: '@qiaohu',
    description: '巧虎生活學習，台灣爸媽最熟的品牌',
    ageGroups: ['0-3', '3-6'],
    categories: ['learn', 'song'],
    language: 'zh',
    emoji: '🐯',
  },
  {
    channelId: 'UCdkAWLfL6C2omfeZHNwu-kg',
    name: '寶寶巴士 BabyBus',
    handle: '@BabyBusChinese',
    description: '奇奇妙妙的生活常識動畫',
    ageGroups: ['0-3', '3-6'],
    categories: ['song', 'learn'],
    language: 'zh',
    emoji: '🐼',
  },

  // ── 6–10 歲 · 知識與探索 ──────────────────────────────
  {
    channelId: 'UC7DdEm33SyaTDtWYGO2CwdA',
    name: 'SciShow Kids',
    handle: '@scishowkids',
    description: '給小朋友的自然科學問答',
    ageGroups: ['6-10'],
    categories: ['learn'],
    language: 'en',
    emoji: '🔬',
  },
  {
    channelId: 'UC-WICcSW1AVFSL9XPAbTETg',
    name: 'Free School',
    handle: '@FreeSchool',
    description: '藝術、歷史、科學的兒童版教材',
    ageGroups: ['6-10'],
    categories: ['learn'],
    language: 'en',
    emoji: '📚',
  },
  {
    channelId: 'UCpVm7bg6pXKo1Pr6k5kxG9A',
    name: 'National Geographic Kids',
    handle: '@natgeokids',
    description: '國家地理兒童版，動物與自然',
    ageGroups: ['6-10'],
    categories: ['learn'],
    language: 'en',
    emoji: '🦁',
  },
  {
    channelId: 'UCELSe4q8EwbCd2GTO94kGJQ',
    name: 'Homeschool Pop',
    handle: '@HomeschoolPop',
    description: '自學兒童的學科入門',
    ageGroups: ['6-10'],
    categories: ['learn'],
    language: 'en',
    emoji: '✏️',
  },
]

// 影片級關鍵字黑名單（標題出現這些字就不顯示）
// 第三層防護：YouTube Kids 做不到的部分
export const VIDEO_TITLE_BLOCKLIST = [
  // 中文高風險
  '挑戰', '恐怖', '驚悚', '血', '殺', '鬼', '嚇', '整人', '惡作劇',
  '死亡', '自殘', '自殺', '打架', '吵架', '偷', '騙', '壞人',
  // 英文高風險
  'challenge', 'prank', 'scary', 'horror', 'creepy', 'nightmare',
  'fight', 'kill', 'die', 'death', 'blood', 'weapon', 'gun', 'knife',
  'zombie', 'ghost', 'monster',
  // Elsagate 典型
  'inject', 'injection', 'syringe', 'pregnant', 'kiss', 'marry',
]

export function shouldBlockVideoTitle(title: string): boolean {
  const t = title.toLowerCase()
  return VIDEO_TITLE_BLOCKLIST.some(kw => t.includes(kw.toLowerCase()))
}

// 依年齡篩頻道
export function filterChannelsByAge(age: AgeGroup | 'all'): CuratedChannel[] {
  if (age === 'all') return CURATED_CHANNELS
  return CURATED_CHANNELS.filter(c => c.ageGroups.includes(age))
}
