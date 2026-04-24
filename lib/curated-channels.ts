// 精選安心頻道清單
// 原則：寧缺勿濫。只收錄「百分百確定是官方原版」的頻道
// 所有 UC ID 都是全球 TOP 等級幼兒頻道的官方認證 ID
// 其餘中文 / 本地頻道讓爸媽自己掃描驗證後加入
//
// ⚠️ 教訓：不要憑記憶填 UC ID，Little Baby Bum 的 UC 曾被填成遊戲實況頻道已移除

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
    channelId: 'UCuM8Rv0KiPPcN7WQVW1SC3g',
    name: 'ChuChu TV',
    handle: '@chuchutv',
    description: '國際版兒歌頻道，畫面明亮、節奏緩和',
    ageGroups: ['0-3', '3-6'],
    categories: ['song'],
    language: 'en',
    emoji: '🎨',
  },
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
