'use client'

import { useEffect, useState } from 'react'
import { CuratedChannel, AgeGroup, filterChannelsByAge } from '@/lib/curated-channels'
import LockScreenGuide from '@/components/LockScreenGuide'

const LOCK_GUIDE_KEY = 'peekkids_lock_guide_seen'
const AGE_KEY = 'peekkids_kids_age'

interface SafeVideo {
  id: string
  title: string
  thumbnail: string
  madeForKids: boolean
}

export default function KidsModePage() {
  const [mounted, setMounted] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [age, setAge] = useState<AgeGroup | 'all'>('3-6')
  const [selectedChannel, setSelectedChannel] = useState<CuratedChannel | null>(null)
  const [videos, setVideos] = useState<SafeVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    setMounted(true)
    setShowGuide(localStorage.getItem(LOCK_GUIDE_KEY) !== '1')
    const savedAge = localStorage.getItem(AGE_KEY) as AgeGroup | 'all' | null
    if (savedAge) setAge(savedAge)
  }, [])

  const saveAge = (a: AgeGroup | 'all') => {
    setAge(a)
    localStorage.setItem(AGE_KEY, a)
  }

  const channels = filterChannelsByAge(age)

  const openChannel = async (ch: CuratedChannel) => {
    setSelectedChannel(ch)
    setVideos([])
    setPlayingVideoId(null)
    setLoadingVideos(true)
    try {
      const res = await fetch(`/api/safe-videos?channelId=${ch.channelId}`)
      const data = await res.json()
      if (data.videos) setVideos(data.videos)
    } catch {}
    setLoadingVideos(false)
  }

  if (!mounted) return null

  if (showGuide) {
    return (
      <LockScreenGuide onDone={() => {
        localStorage.setItem(LOCK_GUIDE_KEY, '1')
        setShowGuide(false)
      }} />
    )
  }

  // ── 播放器：全螢幕、無推薦、無側邊 ───────────────
  if (playingVideoId && selectedChannel) {
    return (
      <main style={{
        position: 'fixed', inset: 0,
        background: '#000',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 頂部控制條 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
        }}>
          <button
            onClick={() => setPlayingVideoId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.15)',
              color: '#fff', border: 'none',
              padding: '8px 14px', borderRadius: 9999,
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              fontFamily: 'inherit',
            }}
          >
            ← 回去選影片
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>安心播放中</span>
        </div>

        {/* 影片嵌入 — rel=0 關閉相關影片、modestbranding 隱藏 logo */}
        <div style={{ flex: 1, position: 'relative', background: '#000' }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${playingVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&fs=1&playsinline=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      </main>
    )
  }

  // ── 頻道內影片清單 ────────────────────────────────
  if (selectedChannel) {
    return (
      <main style={{
        minHeight: '100dvh',
        padding: '20px 16px 40px',
        background: 'var(--paper-hex)',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <button
            onClick={() => setSelectedChannel(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', marginBottom: 18,
              borderRadius: 9999,
              background: 'var(--ink-05)', border: '1px solid var(--border-soft)',
              color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← 回到頻道列表
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--stone-hex)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32,
            }}>
              {selectedChannel.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em',
                color: 'var(--text-primary)', lineHeight: 1.1,
              }}>
                {selectedChannel.name}
              </h1>
              <p style={{
                fontSize: 13, color: 'var(--text-secondary)',
                letterSpacing: '-0.01em', marginTop: 4,
              }}>
                {selectedChannel.description}
              </p>
            </div>
          </div>

          {loadingVideos ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontSize: 14 }}>
              正在挑選安心影片…
            </div>
          ) : videos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontSize: 14 }}>
              這個頻道暫時沒有通過篩選的影片
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
            }}>
              {videos.map(v => (
                <button
                  key={v.id}
                  onClick={() => setPlayingVideoId(v.id)}
                  style={{
                    textAlign: 'left',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 18,
                    padding: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'transform 0.15s var(--ease-spring), box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', marginBottom: 8, background: 'var(--ink-05)' }}>
                    {v.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    {v.madeForKids && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'var(--risk-green)', color: '#fff',
                        padding: '3px 8px', borderRadius: 9999,
                        fontSize: 10, fontWeight: 700, letterSpacing: '-0.01em',
                      }}>
                        YouTube 兒童認證
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13, fontWeight: 700,
                    color: 'var(--text-primary)', letterSpacing: '-0.02em',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {v.title}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── 首頁：頻道格 + 年齡篩選 ──────────────────────
  return (
    <main style={{
      minHeight: '100dvh',
      padding: '20px 16px 40px',
      background: 'var(--paper-hex)',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* 頂部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--stone-hex)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>🦉</div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                PeekKids
              </p>
              <h1 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1 }}>
                安心看片模式
              </h1>
            </div>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            aria-label="找爸爸媽媽"
            style={{
              padding: '8px 14px',
              borderRadius: 9999,
              background: 'var(--ink-05)', border: '1px solid var(--border-soft)',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            找爸爸媽媽
          </button>
        </div>

        {/* 年齡選擇（只影響顯示的頻道） */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 18,
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 14, padding: 4,
          border: '1px solid var(--border-soft)',
        }}>
          {([
            ['0-3', '0–3 歲'],
            ['3-6', '3–6 歲'],
            ['6-10', '6–10 歲'],
            ['all', '全部'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => saveAge(k)}
              style={{
                flex: 1, padding: '10px 0',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                background: age === k ? 'var(--ink-hex)' : 'transparent',
                color: age === k ? '#fff' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 第三層防護提示 */}
        <div style={{
          background: 'rgba(74,143,87,0.08)',
          border: '1px solid rgba(74,143,87,0.2)',
          borderRadius: 14,
          padding: '10px 14px',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <p style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
            這些頻道都人工驗證過，<strong style={{ color: 'var(--text-primary)' }}>影片標題含挑戰／恐怖等字眼會自動過濾</strong>
          </p>
        </div>

        {/* 頻道格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}>
          {channels.map(ch => (
            <button
              key={ch.channelId}
              onClick={() => openChannel(ch)}
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border-soft)',
                borderRadius: 20,
                padding: 16,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                transition: 'transform 0.15s var(--ease-spring), box-shadow 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              <div style={{
                width: 64, height: 64, margin: '0 auto 10px',
                borderRadius: '50%',
                background: 'var(--stone-hex)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>{ch.emoji}</div>
              <p style={{
                fontSize: 13, fontWeight: 800,
                color: 'var(--text-primary)', letterSpacing: '-0.02em',
                marginBottom: 4, lineHeight: 1.2,
              }}>
                {ch.name}
              </p>
              <p style={{
                fontSize: 10, color: 'var(--text-tertiary)',
                letterSpacing: '-0.005em', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {ch.description}
              </p>
              <div style={{
                marginTop: 8,
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 9999,
                background: 'var(--ink-05)',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                color: 'var(--text-secondary)',
              }}>
                {ch.ageGroups.join(' · ')} 歲
              </div>
            </button>
          ))}
        </div>

        <p style={{
          textAlign: 'center', marginTop: 28,
          fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', lineHeight: 1.5,
        }}>
          想加入其他頻道？回到 PeekKids 首頁掃描驗證後加入<br />
          所有頻道持續追蹤中，發現問題會立即下架
        </p>
      </div>

      {/* 找爸爸媽媽對話 */}
      {showExitConfirm && (
        <div
          onClick={() => setShowExitConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: 24, padding: 28, maxWidth: 340, width: '100%',
              textAlign: 'center', boxShadow: '0 28px 56px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 10 }}>👋</div>
            <h3 style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 8 }}>
              要找爸爸媽媽嗎？
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5, marginBottom: 18 }}>
              要離開安心模式，請大人同時按<br />
              <strong style={{ color: 'var(--text-primary)' }}>返回鍵 + 概覽鍵</strong>（Android）<br />
              或 <strong style={{ color: 'var(--text-primary)' }}>連按三下側邊鍵</strong>（iPad）
            </p>
            <button
              onClick={() => setShowExitConfirm(false)}
              style={{
                width: '100%', padding: 12,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--ink-hex)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
            >
              繼續看影片
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

