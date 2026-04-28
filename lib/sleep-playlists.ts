export interface SleepPlaylist {
  id: string
  playlistId: string
  name: string
  description: string
  emoji: string
}

// 人工驗證：curl 確認 200 + 標題符合睡眠/催眠音樂內容
// Baby Einstein (農場教育) 已排除 — 不符合睡眠情境
export const SLEEP_PLAYLISTS: SleepPlaylist[] = [
  {
    id: 'super-simple-lullaby',
    playlistId: 'PLdkj6XH8GYPQyu3G4ABn0G3hq-vvfLFY-',
    name: 'Super Simple 催眠曲',
    description: '輕柔英文兒歌，哄睡超有效',
    emoji: '🌙',
  },
  {
    id: 'cocomelon-lullaby',
    playlistId: 'PLyuESFz6eTHlXP8IBWvxe5zNXWbkpxnWW',
    name: 'CoComelon 搖籃曲',
    description: '小孩最熟悉的旋律，睡前放最安心',
    emoji: '⭐',
  },
  {
    id: 'looloo-mozart',
    playlistId: 'PLshBxGt78uB2tSkGRNCY3vGHBI5T2gfXb',
    name: '莫札特睡眠音樂',
    description: '輕柔古典樂，助眠又有助腦部發育',
    emoji: '🎵',
  },
]
