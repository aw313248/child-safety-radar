// 精選安心頻道清單
//
// ═══════════════════════════════════════════════════════════════════
// ⛔ 硬規定 1：入庫前必須用 curl 驗證 UC ID ⛔
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
//
// ═══════════════════════════════════════════════════════════════════
// ⛔ 硬規定 2：每個入庫頻道必須先用 CareCub 自掃驗證 ⛔（2026-05-12 Oscar 鎖定）
// ═══════════════════════════════════════════════════════════════════
// Oscar 鐵則：「精選頻道要先透過我們自己的判定方法，先確定每個內容都適合
// 上架後再上架」
// 流程：
//   1. UC ID curl 驗證 ✓（硬規定 1）
//   2. 用 CareCub /api/analyze 自掃該頻道 → 取得 riskScore
//   3. score < 70（低 / 中風險才符合） + 5 維度任一不能 < 3★（拿鐵媽媽自動降級鐵則）
//   4. Oscar 親手 review 結果 + 推薦語 → 點頭才入庫
//   5. 入庫後加 lastVerifiedAt comment 標記驗證日期
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
  // CoComelon 移除（2026-05-12 Oscar 鎖定）— 評價兩極（媽媽圈長期爭議「高刺激」），
  // 拿鐵媽媽 framework 自動降級不符合精選標準，待後續釐清前不放官方精選
  {
    channelId: 'UCAOtE1V7Ots4DjM8JLlrYgg', // 驗證：Peppa Pig - Official Channel
    name: 'Peppa Pig',
    handle: '@PeppaPigOfficial',
    description: '英國原版 Peppa Pig 官方頻道，台灣媽媽熟悉的英式童趣，節奏溫和',
    ageGroups: ['0-3', '3-6'],
    categories: ['cartoon', 'learn'],
    language: 'en',
    emoji: '🐷',
  },
  // TODO（2026-05-12 Oscar 提）：再加台灣兒童 YouTuber 中文頻道
  // 候選：萬能阿曼（中文版）/ 其他台灣熱門兒童中文頻道
  // 需 Oscar 提供確切 channel handle，curl 驗證 UC + CareCub 自掃通過後入庫
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
  // ── 台灣 0-6 歲精選 ──
  {
    channelId: 'UCnjadOj5qlKXsTAXPSwc67A', // 驗證：巧虎TV（台灣巧連智官方頻道）
    name: '巧虎 巧連智',
    handle: '@BenesseTaiwan',
    description: '台灣 Benesse 官方頻道，巧虎 0-6 歲生活教育，台灣爸媽最熟悉的幼兒品牌',
    ageGroups: ['0-3', '3-6'],
    categories: ['learn', 'cartoon'],
    language: 'zh',
    emoji: '🐯',
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
