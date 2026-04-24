'use client'

import { useEffect, useState } from 'react'
import { CuratedChannel, AgeGroup, filterChannelsByAge } from '@/lib/curated-channels'
import { getUserChannels, removeUserChannel, UserChannel } from '@/lib/user-channels'
import LockScreenGuide from '@/components/LockScreenGuide'

// 統一顯示用
type DisplayChannel = {
  channelId: string
  name: string
  description: string
  emoji: string
  ageGroups: AgeGroup[]
  source: 'curated' | 'user'
}

function curatedToDisplay(c: CuratedChannel): DisplayChannel {
  return {
    channelId: c.channelId,
    name: c.name,
    description: c.description,
    emoji: c.emoji,
    ageGroups: c.ageGroups,
    source: 'curated',
  }
}
function userToDisplay(c: UserChannel): DisplayChannel {
  return {
    channelId: c.channelId,
    name: c.name,
    description: '爸媽驗證後加入',
    emoji: c.emoji,
    ageGroups: [c.ageGroup],
    source: 'user',
  }
}

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
  const [userChannels, setUserChannels] = useState<UserChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<DisplayChannel | null>(null)
  const [videos, setVideos] = useState<SafeVideo[]>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  // 大人出題（小孩沒那麼快算）
  const [exitMath] = useState(() => {
    const a = 6 + Math.floor(Math.random() * 6) // 6–11
    const b = 7 + Math.floor(Math.random() * 6) // 7–12
    return { a, b, answer: a + b }
  })
  const [exitInput, setExitInput] = useState('')
  const [exitError, setExitError] = useState(false)

  const tryExit = () => {
    if (parseInt(exitInput, 10) === exitMath.answer) {
      window.location.href = '/'
    } else {
      setExitError(true)
      setTimeout(() => setExitError(false), 900)
    }
  }

  useEffect(() => {
    setMounted(true)
    setShowGuide(localStorage.getItem(LOCK_GUIDE_KEY) !== '1')
    const savedAge = localStorage.getItem(AGE_KEY) as AgeGroup | 'all' | null
    if (savedAge) setAge(savedAge)
    setUserChannels(getUserChannels())
  }, [])

  const removeMyChannel = (channelId: string) => {
    const next = removeUserChannel(channelId)
    setUserChannels(next)
  }

  const saveAge = (a: AgeGroup | 'all') => {
    setAge(a)
    localStorage.setItem(AGE_KEY, a)
  }

  // 合併官方精選 + 爸媽加入的，再依年齡篩
  const curated = filterChannelsByAge(age).map(curatedToDisplay)
  const mine = userChannels
    .filter(c => age === 'all' || c.ageGroup === age)
    .map(userToDisplay)

  const openChannel = async (ch: DisplayChannel) => {
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
            三層防護：官方頻道 × <strong style={{ color: 'var(--text-primary)' }}>YouTube 兒童認證</strong> × 標題黑名單，6 歲內專用
          </p>
        </div>

        {curated.length > 0 && (
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            官方精選 · 100% 驗證
          </p>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: curated.length > 0 ? 28 : 0,
        }}>
          {curated.map(ch => (
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

        {/* 爸媽加入的 */}
        {mine.length > 0 && (
          <>
            <p style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
            }}>
              爸媽加入的 · 自行驗證
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}>
              {mine.map(ch => (
                <div
                  key={ch.channelId}
                  style={{
                    position: 'relative',
                    background: '#FFFFFF',
                    border: '1px dashed var(--border-soft)',
                    borderRadius: 20,
                    padding: 16,
                    textAlign: 'center',
                    transition: 'transform 0.15s var(--ease-spring), box-shadow 0.15s',
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`移除「${ch.name}」？`)) removeMyChannel(ch.channelId)
                    }}
                    aria-label="移除"
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 24, height: 24,
                      borderRadius: '50%',
                      background: 'var(--ink-05)',
                      border: '1px solid var(--border-soft)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 11, color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => openChannel(ch)}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', padding: 0,
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
                </div>
              ))}
            </div>
          </>
        )}

        {curated.length === 0 && mine.length === 0 && (
          <div style={{
            padding: 32, textAlign: 'center',
            background: 'var(--card-hex, #FBF7EA)',
            border: '1px dashed var(--border-soft)',
            borderRadius: 20,
          }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🛡️</div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
              目前沒有已驗證的頻道
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.6 }}>
              回 PeekKids 首頁掃描你想給小孩看的頻道，<br />
              非高風險就能點「加入兒童安心模式」
            </p>
            <a href="/" style={{
              display: 'inline-block', marginTop: 14,
              padding: '10px 20px', borderRadius: 9999,
              background: 'var(--ink-hex)', color: '#fff',
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
            }}>
              回首頁掃描
            </a>
          </div>
        )}

        <p style={{
          textAlign: 'center', marginTop: 28,
          fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', lineHeight: 1.5,
        }}>
          想加入其他頻道？回到 PeekKids 首頁掃描驗證後加入<br />
          所有頻道持續追蹤中，發現問題會立即下架
        </p>
      </div>

      {/* 找爸爸媽媽對話 — 需要大人解簡單算式才能離開（小孩沒那麼快） */}
      {showExitConfirm && (
        <div
          onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: 24, padding: 28, maxWidth: 360, width: '100%',
              textAlign: 'center', boxShadow: '0 28px 56px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 10 }}>👋</div>
            <h3 style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 6 }}>
              大人才能離開
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5, marginBottom: 16 }}>
              算一下下面這題，答對就回首頁
            </p>

            {/* 算式 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, marginBottom: 14,
              padding: '14px 18px',
              background: 'var(--paper-hex)',
              border: '1px solid var(--border-soft)',
              borderRadius: 16,
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)', fontFamily: 'ui-monospace, "SF Mono", monospace' }}>
                {exitMath.a} + {exitMath.b} =
              </span>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={exitInput}
                onChange={e => { setExitInput(e.target.value); setExitError(false) }}
                onKeyDown={e => e.key === 'Enter' && tryExit()}
                placeholder="?"
                style={{
                  width: 70, padding: '8px 0',
                  fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em',
                  textAlign: 'center',
                  border: `2px solid ${exitError ? 'var(--risk-red)' : 'var(--border-soft)'}`,
                  borderRadius: 12,
                  background: '#fff',
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>

            {exitError && (
              <p style={{ fontSize: 12, color: 'var(--risk-red)', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 10 }}>
                答錯了，再試一次
              </p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowExitConfirm(false); setExitInput(''); setExitError(false) }}
                style={{
                  flex: 1, padding: 12,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--ink-05)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-soft)', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                }}
              >
                繼續看影片
              </button>
              <button
                onClick={tryExit}
                disabled={!exitInput}
                style={{
                  flex: 1, padding: 12,
                  borderRadius: 'var(--radius-lg)',
                  background: exitInput ? 'var(--ink-hex)' : 'var(--ink-20)',
                  color: '#fff',
                  border: 'none',
                  cursor: exitInput ? 'pointer' : 'not-allowed',
                  fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                }}
              >
                離開安心模式
              </button>
            </div>

            <p style={{ marginTop: 14, fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
              若已用引導使用模式 / 螢幕釘選鎖住畫面，<br />
              離開還需要輸入平板密碼或同時按返回+概覽鍵
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

