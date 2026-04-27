// 爸媽自己驗證加入的頻道（存在 localStorage）
// 官方精選只收百分百確定的 5 個，其他想看的中文頻道請爸媽自行掃描驗證後加入
// 這樣才安全，因為每個爸媽的標準不同

import type { AgeGroup } from './curated-channels'

const STORAGE_KEY = 'peekkids_user_channels'

export interface UserChannel {
  channelId: string
  name: string
  thumbnail?: string
  ageGroup: AgeGroup
  /** Mascot pose 取代 emoji。舊資料的 emoji 欄位保留向下相容 */
  mascotPose?: string
  /** @deprecated 舊版用 emoji，新版改用 mascotPose */
  emoji?: string
  addedAt: number
  riskScore?: number
}

export function getUserChannels(): UserChannel[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function addUserChannel(ch: UserChannel): UserChannel[] {
  const list = getUserChannels()
  // 去重（同 channelId 就覆蓋）
  const next = list.filter(c => c.channelId !== ch.channelId)
  next.unshift(ch)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function removeUserChannel(channelId: string): UserChannel[] {
  const next = getUserChannels().filter(c => c.channelId !== channelId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function hasUserChannel(channelId: string): boolean {
  return getUserChannels().some(c => c.channelId === channelId)
}
