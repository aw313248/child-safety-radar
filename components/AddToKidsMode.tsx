'use client'

import { useEffect, useState } from 'react'
import { AgeGroup } from '@/lib/curated-channels'
import { addUserChannel, hasUserChannel, removeUserChannel } from '@/lib/user-channels'

interface Props {
  channelId?: string
  channelName: string
  channelThumbnail?: string
  riskScore: number
  riskLevel: 'high' | 'medium' | 'low'
}

const EMOJI_POOL = ['🎵', '📚', '🎨', '🐻', '🚂', '🦄', '🌟', '🍎', '🐰', '🚀', '🎪', '🌈']

export default function AddToKidsMode({ channelId, channelName, channelThumbnail, riskScore, riskLevel }: Props) {
  const [mounted, setMounted] = useState(false)
  const [added, setAdded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('3-6')
  const [emoji, setEmoji] = useState(EMOJI_POOL[0])

  useEffect(() => {
    setMounted(true)
    if (channelId) setAdded(hasUserChannel(channelId))
    setEmoji(EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)])
  }, [channelId])

  // 高風險不給加
  if (!mounted || !channelId || riskLevel === 'high') return null

  const handleConfirm = () => {
    addUserChannel({
      channelId,
      name: channelName,
      thumbnail: channelThumbnail,
      ageGroup,
      emoji,
      addedAt: Date.now(),
      riskScore,
    })
    setAdded(true)
    setShowModal(false)
  }

  const handleRemove = () => {
    removeUserChannel(channelId)
    setAdded(false)
  }

  if (added) {
    return (
      <div style={{
        marginTop: 10,
        padding: '10px 14px',
        background: 'rgba(74,143,87,0.08)',
        border: '1px solid rgba(74,143,87,0.25)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <p style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', letterSpacing: '-0.01em', fontWeight: 600 }}>
          已加入兒童安心模式
        </p>
        <button
          onClick={handleRemove}
          style={{
            padding: '6px 10px',
            background: 'transparent',
            border: '1px solid var(--border-soft)',
            borderRadius: 9999,
            fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
            letterSpacing: '-0.01em', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          移除
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          marginTop: 10, width: '100%',
          padding: '13px 16px',
          background: 'var(--ink-hex)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-lg)',
          cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 20px rgba(10,10,10,0.15)',
        }}
      >
        <span style={{ fontSize: 16 }}>🛡️</span>
        加入兒童安心模式
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF', borderRadius: 24, padding: 24,
              maxWidth: 380, width: '100%',
              boxShadow: '0 28px 56px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 42, marginBottom: 6 }}>🛡️</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: 4 }}>
                加入兒童安心模式？
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                「{channelName}」將出現在 /kids 頁面<br />
                小孩只能看這些你驗證過的頻道
              </p>
            </div>

            {/* 年齡 */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
              適合年齡
            </p>
            <div style={{
              display: 'flex', gap: 6, marginBottom: 16,
              background: 'var(--paper-hex)',
              borderRadius: 12, padding: 4,
              border: '1px solid var(--border-soft)',
            }}>
              {(['0-3', '3-6'] as AgeGroup[]).map(a => (
                <button
                  key={a}
                  onClick={() => setAgeGroup(a)}
                  style={{
                    flex: 1, padding: '10px 0',
                    borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: ageGroup === a ? 'var(--ink-hex)' : 'transparent',
                    color: ageGroup === a ? '#fff' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                    fontFamily: 'inherit',
                  }}
                >
                  {a === '0-3' ? '0–3 歲' : '3–6 歲'}
                </button>
              ))}
            </div>

            {/* Emoji */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
              選個圖示
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {EMOJI_POOL.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 40, height: 40,
                    borderRadius: 10,
                    border: emoji === e ? '2px solid var(--ink-hex)' : '1px solid var(--border-soft)',
                    background: emoji === e ? 'var(--ink-05)' : '#fff',
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 20,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>

            <div style={{
              background: 'rgba(217,162,58,0.08)',
              border: '1px solid rgba(217,162,58,0.25)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                ⚠️ 你加入的頻道由你自己負責，PeekKids 只會持續用標題黑名單再篩一次
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
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
                取消
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1, padding: 12,
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--ink-hex)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em',
                  fontFamily: 'inherit',
                }}
              >
                加入
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
