// 精選安心頻道清單
//
// ═══════════════════════════════════════════════════════════════════
// ⛔ 硬規定：入庫前必須用 curl 驗證 UC ID ⛔
// ═══════════════════════════════════════════════════════════════════
// 曾犯的錯：
//   1. Little Baby Bum 填成遊戲實況頻道 UC（出現血腥內容）
//   2. ChuChu TV 填錯 UC（整個頻道沒影片）
// 驗證流程（缺一不可）：
//   curl -sL "https://www.youtube.com/@HANDLE" -A "Mozilla/5.0" \
//     | grep -oE '"browseId":"UC[a-zA-Z0-9_-]{22}"' | head -1
//   curl -sL "https://www.youtube.com/@HANDLE" -A "Mozilla/5.0" \
//     | grep -oE '<meta property="og:title" content="[^"]+"'
//   → UC ID 回傳的頻道名必須完全對得上才能入庫
// ═══════════════════════════════════════════════════════════════════

export type AgeGroup = '0-3' | '3-6'
export type Category = 'song' | 'story' | 'learn' | 'cartoon'

export interface CuratedChannel {
  channelId: string
  name: string
  handle?: string
  description: string
  ageGroups: AgeGroup[]
  categories: Category[]
  language: 'zh' | 'en' | 'both'
  emoji: string
}

export const CURATED_CHANNELS: CuratedChannel[] = [
  {
    channelId: 'UCbCmjCuTUZos6Inko4u57UQ',
    name: 'CoComelon',
    handle: '@CoComelon',
    description: 'JJ 一家人的日常歌曲，全世界訂閱最多的幼兒頻道',
    ageGroups: ['0-3', '3-6'],
    categories: ['song', 'cartoon'],
    language: 'en',
    emoji: '🍉',
  },
  {
    channelId: 'UCcdwLMPsaU2ezNSJU1nFoBQ',
    name: 'Pinkfong 碰碰狐',
    handle: '@pinkfong',
    description: 'Baby Shark 原版頻道，全球爸媽都認識',
    ageGroups: ['0-3', '3-6'],
    categories: ['song'],
    language: 'both',
    emoji: '🦈',
  },
  {
    channelId: 'UCLsooMJoIpl_7ux2jvdPB-Q',
    name: 'Super Simple Songs',
    handle: '@SuperSimpleSongs',
    description: '英文兒歌經典，節奏溫和、畫面乾淨',
    ageGroups: ['0-3', '3-6'],
    categories: ['song', 'learn'],
    language: 'en',
    emoji: '🎵',
  },
  {
    channelId: 'UCepXGfvoX1evyA6lB553Y7Q',
    name: 'Play BIG 小啼大作',
    handle: '@playbigmusic',
    description: '台灣原創兒童音樂與動畫，中文兒歌首選',
    ageGroups: ['0-3', '3-6'],
    categories: ['song', 'cartoon'],
    language: 'zh',
    emoji: '🎤',
  },
  {
    channelId: 'UCBnZ16ahKA2DZ_T5W0FPUXg',
    name: 'ChuChu TV',
    handle: '@chuchutv',
    description: '國際版兒歌頻道，畫面明亮、節奏緩和',
    ageGroups: ['0-3', '3-6'],
    categories: ['song'],
    language: 'en',
    emoji: '🎨',
  },
  // ── 0-6 歲全球熱門卡通 ──
  {
    channelId: 'UCVzLLZkDuFGAE2BGdBuBNBg', // 驗證：Bluey - Official Channel
    name: 'Bluey',
    handle: '@BlueyOfficialChannel',
    description: '澳洲官方 Bluey，目前全球 0-6 歲最紅卡通，家庭互動主題',
    ageGroups: ['0-3', '3-6'],
    categories: ['cartoon'],
    language: 'en',
    emoji: '🐕',
  },
  // ── 待驗證：台灣爸媽常用頻道（需要 Oscar 手動查 channel ID 後填入） ──
  // 巧虎 Benesse TW：進 youtube.com/@shimajiro 找到 "browseId" 那串 UC ID
  // YOYO TV 東森：進 youtube.com 搜「YOYO TV 東森」官方頻道，點進去看網址
  // Pororo 中文：進 youtube.com 搜「Pororo 小企鵝 中文」官方頻道
]

// ═══ 影片級關鍵字黑名單 ═══════════════════════════════════════
// 第三層防護：即使頻道 OK，標題含這些字就不顯示
export const VIDEO_TITLE_BLOCKLIST = [
  // ── 中文高風險 ──
  '挑戰', '恐怖', '驚悚', '血', '殺', '鬼', '嚇', '整人', '惡作劇',
  '死亡', '自殘', '自殺', '打架', '吵架', '偷', '騙', '壞人',
  '怪', '妖', '黑暗', '噁心', '嘔吐', '便便', '大便', '尿尿',
  '武器', '刀', '槍', '爆炸', '炸', '火災', '救命',
  '成人', '限制級', '18+', '情色', '接吻', '親親', '愛愛',
  // ── 英文高風險 ──
  'challenge', 'prank', 'scary', 'horror', 'creepy', 'nightmare',
  'fight', 'kill', 'die', 'death', 'dead', 'blood', 'bloody',
  'weapon', 'gun', 'knife', 'sword', 'bomb', 'explode',
  'zombie', 'ghost', 'monster', 'demon', 'devil', 'hell',
  'vomit', 'poop', 'pee', 'butt',
  'sexy', 'sex', 'adult', 'nude', 'naked',
  // ── 遊戲實況 / 成人遊戲關鍵字（Little Baby Bum 事件教訓） ──
  'walkthrough', 'gameplay', 'resident evil', 'crimson desert',
  'pragmata', 'samson', 'god of war', 'boss', 'final boss',
  // ── Elsagate 典型 ──
  'inject', 'injection', 'syringe', 'pregnant', 'kiss', 'marry',
  'giving birth', 'baby born', 'poison', 'hospital',
  // ── 可疑模式 ──
  'finger family', 'elsa spiderman', 'spiderman elsa',
  'buried alive', 'trapped',
]

export function shouldBlockVideoTitle(title: string): boolean {
  const t = title.toLowerCase()
  return VIDEO_TITLE_BLOCKLIST.some(kw => t.includes(kw.toLowerCase()))
}

export function filterChannelsByAge(age: AgeGroup | 'all'): CuratedChannel[] {
  if (age === 'all') return CURATED_CHANNELS
  return CURATED_CHANNELS.filter(c => c.ageGroups.includes(age))
}
