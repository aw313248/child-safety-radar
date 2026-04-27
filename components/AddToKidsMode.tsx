'use client'

import { useEffect, useState, useCallback } from 'react'
import { AgeGroup } from '@/lib/curated-channels'
import { addUserChannel, hasUserChannel, removeUserChannel } from '@/lib/user-channels'
import Mascot, { MascotPose } from './Mascot'

interface Props {
  channelId?: string
  channelName: string
  channelThumbnail?: string
  riskScore: number
  riskLevel: 'high' | 'medium' | 'low'
}

// 取代 emoji pool — 用 Mascot pose 跟全站視覺一致
const POSES: MascotPose[] = ['hi', 'guard', 'fly', 'think', 'thumbs-up', 'search']

export default function AddToKidsMode({ channelId, channelName, channelThumbnail, riskScore, riskLevel }: Props) {
  const [mounted, setMounted] = useState(false)
  const [added, setAdded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('3-6')
  const [pose, setPose] = useState<MascotPose>('hi')

  useEffect(() => {
    setMounted(true)
    if (channelId) setAdded(hasUserChannel(channelId))
    setPose(POSES[Math.floor(Math.random() * POSES.length)])
  }, [channelId])

  // ESC 關 modal
  const closeModal = useCallback(() => setShowModal(false), [])
  useEffect(() => {
    if (!showModal) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal, closeModal])

  if (!mounted || !channelId) return null

  // 高風險不給加，顯示說明（不要靜默 return null，使用者會困惑）
  if (riskLevel === 'high') {
    return (
      <div style={{
        marginTop: 10,
        padding: '12px 14px',
        background: 'rgba(194, 65, 59, 0.10)',
        border: '1px solid rgba(194, 65, 59, 0.32)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span aria-hidden style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--cc-red-deep)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: '#fff',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
        <p style={{ flex: 1, fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', lineHeight: 1.5, fontWeight: 600 }}>
          這個頻道風險太高，不能加入熊熊守護模式
          <br />
          <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 500 }}>避免小孩誤點看到不適合的內容</span>
        </p>
      </div>
    )
  }

  const handleConfirm = () => {
    addUserChannel({
      channelId,
      name: channelName,
      thumbnail: channelThumbnail,
      ageGroup,
      mascotPose: pose,
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
        padding: '12px 14px',
        background: 'rgba(122, 184, 126, 0.12)',
        border: '1px solid rgba(122, 184, 126, 0.35)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span aria-hidden style={{
          width: 22, height: 22, borderRadius: '50%',
          background: '#7AB87E',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <p style={{ flex: 1, fontSize: 12, color: 'var(--ink-hex)', letterSpacing: '-0.01em', fontWeight: 600 }}>
          已加入熊熊守護模式
        </p>
        <button
          onClick={handleRemove}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(43,24,16,0.18)',
            borderRadius: 9999,
            fontSize: 11, fontWeight: 700, color: 'var(--ink-hex)',
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
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #F2B84B 0%, #D99422 100%)',
          color: 'var(--ink-hex)',
          border: '1.5px solid var(--ink-hex)',
          borderRadius: 16,
          cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 6px 16px -6px rgba(217,148,34,0.4)',
        }}
      >
        <span aria-hidden style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #FBF7EA 70%)',
          border: '1.5px solid var(--ink-hex)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          <Mascot pose="hi" size={20} />
        </span>
        加入熊熊守護模式
      </button>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(43,24,16,0.45)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(255, 246, 230, 0.72)',
              backdropFilter: 'blur(40px) saturate(160%)',
              WebkitBackdropFilter: 'blur(40px) saturate(160%)',
              border: '1px solid rgba(255, 255, 255, 0.55)',
              borderRadius: 28, padding: 24,
              maxWidth: 380, width: '100%',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.7),' +
                ' inset 0 -1px 0 rgba(43,24,16,0.06),' +
                ' 0 30px 60px -20px rgba(43,24,16,0.30)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
                  border: '2px solid var(--ink-hex)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <Mascot pose="guard" size={48} />
                </div>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink-hex)', marginBottom: 4 }}>
                加入熊熊守護模式
              </h3>
              <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.66)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                「{channelName}」會出現在熊熊頁面<br />
                小孩只能看你驗證過的頻道
              </p>
            </div>

            {/* 年齡 */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(43,24,16,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
              適合年齡
            </p>
            <div style={{
              display: 'flex', gap: 6, marginBottom: 16,
              background: 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(14px)',
              borderRadius: 12, padding: 4,
              border: '1px solid rgba(255,255,255,0.55)',
            }}>
              {(['0-3', '3-6'] as AgeGroup[]).map(a => (
                <button
                  key={a}
                  onClick={() => setAgeGroup(a)}
                  style={{
                    flex: 1, padding: '10px 0',
                    borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: ageGroup === a ? 'var(--ink-hex)' : 'transparent',
                    color: ageGroup === a ? 'var(--cc-gold)' : 'var(--ink-hex)',
                    fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {a === '0-3' ? '0–3 歲' : '3–6 歲'}
                </button>
              ))}
            </div>

            {/* 選熊熊 pose 取代 emoji pool */}
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(43,24,16,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
              選個熊熊
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 20 }}>
              {POSES.map(p => (
                <button
                  key={p}
                  onClick={() => setPose(p)}
                  aria-label={`選 ${p} 熊熊`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 12,
                    border: pose === p ? '2px solid var(--ink-hex)' : '1px solid rgba(43,24,16,0.18)',
                    background: pose === p
                      ? 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)'
                      : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'transform 0.12s, background 0.15s',
                  }}
                >
                  <Mascot pose={p} size={32} />
                </button>
              ))}
            </div>

            <div style={{
              background: 'rgba(242, 184, 75, 0.14)',
              border: '1px solid rgba(217, 148, 34, 0.3)',
              borderRadius: 12, padding: '10px 12px', marginBottom: 14,
            }}>
              <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.7)', letterSpacing: '-0.01em', lineHeight: 1.55, fontWeight: 600 }}>
                你加入的頻道由你自己負責，CareCub Kids 會持續用標題黑名單再幫你把關一次
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: 12,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(14px)',
                  color: 'var(--ink-hex)',
                  border: '1px solid rgba(43,24,16,0.18)', cursor: 'pointer',
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
                  borderRadius: 14,
                  background: 'var(--ink-hex)', color: 'var(--cc-gold)',
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
