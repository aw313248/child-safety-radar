'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type BlacklistItem = {
  channelId: string
  channelName: string
  blacklistedAt: string
}

const BLACKLIST_KEY = 'cc_user_blacklist'

export default function BlacklistPage() {
  const [items, setItems] = useState<BlacklistItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '[]')
      const normalized: BlacklistItem[] = raw.map((item: string | BlacklistItem) =>
        typeof item === 'string'
          ? { channelId: item, channelName: '（舊資料 · 未存頻道名）', blacklistedAt: '' }
          : item
      )
      setItems(normalized)
    } catch {}
  }, [])

  const handleRemove = (channelId: string) => {
    const filtered = items.filter(i => i.channelId !== channelId)
    setItems(filtered)
    try { localStorage.setItem(BLACKLIST_KEY, JSON.stringify(filtered)) } catch {}
  }

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-warm, #FFF6E6)', fontFamily: 'var(--font-heihei, sans-serif)' }}>
      {/* sticky honey AppBar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#F2B84B', borderBottom: '2px solid #2B1810',
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          fontWeight: 800, fontSize: 15,
          color: '#2B1810', textDecoration: 'none', letterSpacing: '-0.02em',
        }}>
          ← 回首頁
        </Link>
        <span style={{ fontSize: 13, color: '#2B1810', opacity: 0.6 }}>⚑ 我的黑名單</span>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{
          fontSize: 24, fontWeight: 900,
          color: '#2B1810', letterSpacing: '-0.04em', marginBottom: 6,
        }}>
          我的黑名單
        </h1>
        <p style={{ fontSize: 13, color: '#2B1810', opacity: 0.5, marginBottom: 32 }}>
          你手動標記為「不適合」的頻道，移除後可重新掃描
        </p>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>⚑</p>
            <p style={{ fontSize: 16, color: '#2B1810', fontWeight: 600 }}>
              目前沒有列入黑名單的頻道
            </p>
            <p style={{ fontSize: 14, color: '#2B1810', opacity: 0.5, marginTop: 8 }}>
              掃描頻道後，點「列入我的黑名單」即可記錄
            </p>
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 24, fontSize: 14, fontWeight: 700,
              color: '#2B1810', textDecoration: 'none',
              padding: '10px 18px', border: '2px solid #2B1810', borderRadius: 12,
            }}>
              去掃描頻道 →
            </Link>
          </div>
        ) : (
          <ul style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {items.map(item => (
              <li key={item.channelId} style={{
                background: '#FBF7EA',
                border: '2px solid #2B1810',
                borderRadius: 12,
                padding: 16,
              }}>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: '#2B1810', letterSpacing: '-0.02em',
                }}>
                  {item.channelName}
                </div>
                <div style={{ fontSize: 12, color: '#2B1810', opacity: 0.5, marginTop: 3 }}>
                  {item.channelId}
                  {item.blacklistedAt && (
                    <> · 列入於 {new Date(item.blacklistedAt).toLocaleDateString('zh-TW')}</>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleRemove(item.channelId)}
                    style={{
                      padding: '8px 14px', minHeight: 36,
                      background: 'transparent', color: '#2B1810',
                      border: '2px solid #2B1810', borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    移除黑名單
                  </button>
                  <a
                    href={`/?u=https://www.youtube.com/channel/${item.channelId}`}
                    style={{
                      padding: '8px 14px', minHeight: 36,
                      background: '#2B1810', color: '#FFF6E6',
                      borderRadius: 8,
                      fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                      textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    重新掃描 →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* 底部返回 */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px dashed rgba(43,24,16,0.14)' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 700,
            color: '#2B1810', textDecoration: 'none',
            padding: '10px 16px', border: '2px solid #2B1810', borderRadius: 12,
          }}>
            ← 回首頁掃描
          </Link>
        </div>
      </main>
    </div>
  )
}
