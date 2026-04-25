'use client'

import { useEffect, useState } from 'react'
import Mascot from './Mascot'

// iOS：Apple 從 iOS 11 起擋掉 prefs: / App-prefs: 深連結
//      → 最佳方案是「複製關鍵字到剪貼簿 + 顯示清楚步驟」讓爸媽進設定後貼上搜尋
// Android：Chrome 吃 intent:// 可以真的跳到輔助使用設定
type TestPhase = 'idle' | 'running' | 'pass' | 'fail'

export default function LockScreenGuide({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [copied, setCopied] = useState(false)
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [count, setCount] = useState(5)

  // ★ 真實測試：要求家長按 Home / 滑出，5 秒內畫面若被切走 = 沒鎖成功
  useEffect(() => {
    if (phase !== 'running') return
    setCount(5)
    let leftScreen = false
    const onVis = () => { if (document.hidden) leftScreen = true }
    document.addEventListener('visibilitychange', onVis)

    const tick = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(tick)
          document.removeEventListener('visibilitychange', onVis)
          setPhase(leftScreen ? 'fail' : 'pass')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [phase])

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent.toLowerCase()
    if (/ipad|iphone|ipod/.test(ua) || (ua.includes('macintosh') && 'ontouchend' in document)) {
      setPlatform('ios')
    } else if (/android/.test(ua)) {
      setPlatform('android')
    }
  }, [])

  // ESC 關閉，避免卡住
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const handleClick = async () => {
    if (platform === 'android') {
      window.location.href = 'intent://#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end'
      return
    }
    if (platform === 'ios') {
      const keyword = '輔助使用'
      try {
        await navigator.clipboard.writeText(keyword)
        setCopied(true)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = keyword
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy'); setCopied(true) } catch {}
        document.body.removeChild(ta)
      }
    }
  }

  // ── 顏色硬編：完全不用 var()，避免被 candy 主題覆蓋成白色 ──
  const NAVY = '#0F2444'
  const NAVY_2 = '#1E3A5F'
  const CREAM = '#FFF6E6'
  const GOLD = '#F2B84B'
  const GOLD_DEEP = '#D99422'
  const RED = '#C2413B'

  return (
    <div
      onClick={onDone}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15, 36, 68, 0.78)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: `linear-gradient(160deg, ${NAVY_2} 0%, ${NAVY} 100%)`,
          borderRadius: 28,
          padding: '24px 22px 20px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
          border: `1.5px solid ${GOLD}`,
          margin: 'auto',
          position: 'relative',
        }}
      >
        {/* 右上 X 關閉 — 確保大人隨時可以離開 */}
        <button
          onClick={onDone}
          aria-label="關閉"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.28)',
            color: CREAM,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18"/>
            <line x1="6" y1="18" x2="18" y2="6"/>
          </svg>
        </button>

        {/* 標題區 — 大圖 + 短句 */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            margin: '0 auto 12px',
            background: `radial-gradient(circle at 35% 30%, ${CREAM} 0%, ${GOLD} 60%, ${GOLD_DEEP} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2.5px solid ${CREAM}`,
            boxShadow: '0 12px 32px rgba(242, 184, 75, 0.35)',
          }}>
            <Mascot pose="guard" size={84} />
          </div>
          <h2 style={{
            fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em',
            color: CREAM, lineHeight: 1.15, marginBottom: 6,
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            鎖住畫面
          </h2>
          <p style={{
            fontSize: 14, color: 'rgba(255,246,230,0.78)',
            letterSpacing: '-0.01em', lineHeight: 1.5, fontWeight: 600,
          }}>
            小孩就跳不出去
          </p>
        </div>

        {/* 強調：設定一次用一輩子 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', marginBottom: 16,
          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
          borderRadius: 14,
          border: `1.5px solid ${CREAM}`,
          boxShadow: '0 8px 20px -8px rgba(242,184,75,0.5)',
        }}>
          <div style={{ fontSize: 24, lineHeight: 1 }}>✨</div>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 14, fontWeight: 900, color: NAVY,
              letterSpacing: '-0.02em', lineHeight: 1.3,
            }}>
              設定一次用一輩子
            </p>
            <p style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(15,36,68,0.78)',
              letterSpacing: '-0.005em', marginTop: 2,
            }}>
              下次打開不會再跳這個畫面
            </p>
          </div>
        </div>

        {/* iOS 教學 */}
        {platform === 'ios' && (
          <>
            <button
              onClick={handleClick}
              style={{
                width: '100%', padding: '16px 18px', marginBottom: 14,
                background: copied
                  ? `linear-gradient(135deg, #4A8A5C 0%, #2F6740 100%)`
                  : `linear-gradient(135deg, ${RED} 0%, #8E2A24 100%)`,
                color: CREAM,
                border: `1.5px solid ${GOLD}`,
                borderRadius: 16,
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 16, fontWeight: 900, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 12px 28px -10px rgba(0,0,0,0.5)',
              }}
            >
              {copied ? '✓ 已複製「輔助使用」' : '📋 複製關鍵字'}
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {[
                { n: 1, body: '回桌面，打開灰色「設定」' },
                { n: 2, body: '最上面搜尋欄 → 長按貼上 → 點「輔助使用」' },
                { n: 3, body: '滑到底「引導使用模式」→ 打開 → 回來連按 3 下側邊鍵' },
              ].map(s => (
                <div key={s.n} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(242,184,75,0.32)',
                  borderRadius: 14,
                }}>
                  <div style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: '50%',
                    background: GOLD, color: NAVY,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900,
                    border: `1.5px solid ${CREAM}`,
                  }}>{s.n}</div>
                  <p style={{
                    flex: 1, fontSize: 13, fontWeight: 600, color: CREAM,
                    letterSpacing: '-0.01em', lineHeight: 1.5, paddingTop: 4,
                  }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Android 教學 */}
        {platform === 'android' && (
          <>
            <button
              onClick={handleClick}
              style={{
                width: '100%', padding: '16px 18px', marginBottom: 12,
                background: `linear-gradient(135deg, ${RED} 0%, #8E2A24 100%)`,
                color: CREAM,
                border: `1.5px solid ${GOLD}`, borderRadius: 16,
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 16, fontWeight: 900, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 12px 28px -10px rgba(0,0,0,0.5)',
              }}
            >
              ⚙️ 打開輔助使用設定
            </button>
            <p style={{
              fontSize: 13, color: CREAM, letterSpacing: '-0.01em',
              lineHeight: 1.55, textAlign: 'center', marginBottom: 14, fontWeight: 600,
            }}>
              打開「螢幕釘選」→ 回來最近應用長按圖示選釘選
            </p>
          </>
        )}

        {/* 其他裝置 */}
        {platform === 'other' && (
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 14, padding: 14, marginBottom: 14,
          }}>
            <p style={{ fontSize: 13, color: CREAM, letterSpacing: '-0.01em', lineHeight: 1.6, fontWeight: 600 }}>
              請在平板上開啟，依系統指示開啟引導使用模式 / 螢幕釘選
            </p>
          </div>
        )}

        {/* 底部兩顆按鈕 — 兩個都會關 modal，確保不會卡住 */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDone}
            style={{
              flex: 1, padding: 14,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.08)',
              color: CREAM,
              border: '1.5px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              fontFamily: 'inherit',
            }}
          >
            先跳過
          </button>
          <button
            onClick={() => setPhase('running')}
            style={{
              flex: 1.4, padding: 14,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
              color: NAVY,
              border: `1.5px solid ${CREAM}`,
              cursor: 'pointer',
              fontSize: 14, fontWeight: 900, letterSpacing: '-0.01em',
              fontFamily: 'inherit',
              boxShadow: '0 8px 20px -8px rgba(242,184,75,0.5)',
            }}
          >
            ✓ 我設定好了，來測試
          </button>
        </div>

        {/* ── 真實測試覆蓋層 ── */}
        {phase !== 'idle' && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', inset: 0, borderRadius: 28,
              background: `linear-gradient(160deg, ${NAVY_2} 0%, ${NAVY} 100%)`,
              padding: '28px 22px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', gap: 14,
            }}
          >
            {phase === 'running' && (
              <>
                <div style={{ fontSize: 56, lineHeight: 1, color: GOLD, fontWeight: 900 }}>{count}</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: CREAM, letterSpacing: '-0.03em' }}>
                  現在按 Home 鍵 / 往上滑
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,246,230,0.85)', lineHeight: 1.6, fontWeight: 600, maxWidth: 320 }}>
                  如果跳不出去 → 設定成功<br/>
                  如果跳出去了 → 還沒鎖好
                </p>
                <button
                  onClick={() => setPhase('idle')}
                  style={{
                    marginTop: 8, padding: '10px 20px',
                    borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.3)', color: CREAM,
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  取消測試
                </button>
              </>
            )}
            {phase === 'pass' && (
              <>
                <div style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: `linear-gradient(135deg, #4A8A5C 0%, #2F6740 100%)`,
                  border: `3px solid ${CREAM}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48, color: CREAM, fontWeight: 900,
                  boxShadow: '0 12px 28px -8px rgba(74,138,92,0.55)',
                }}>✓</div>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: CREAM, letterSpacing: '-0.03em' }}>
                  鎖定成功
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,246,230,0.85)', lineHeight: 1.6, fontWeight: 600 }}>
                  小孩跳不出去了，可以放心
                </p>
                <button
                  onClick={onDone}
                  style={{
                    marginTop: 6, padding: '14px 28px',
                    borderRadius: 14,
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
                    color: NAVY, border: `1.5px solid ${CREAM}`,
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px -8px rgba(242,184,75,0.5)',
                  }}
                >
                  開始給小孩看 →
                </button>
              </>
            )}
            {phase === 'fail' && (
              <>
                <div style={{
                  width: 88, height: 88, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${RED} 0%, #8E2A24 100%)`,
                  border: `3px solid ${CREAM}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48, color: CREAM, fontWeight: 900,
                  boxShadow: '0 12px 28px -8px rgba(194,65,59,0.55)',
                }}>✕</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: CREAM, letterSpacing: '-0.03em' }}>
                  還沒鎖好
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,246,230,0.85)', lineHeight: 1.6, fontWeight: 600, maxWidth: 320 }}>
                  剛才畫面被切出去了，請依上面步驟再試一次
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button
                    onClick={() => setPhase('idle')}
                    style={{
                      flex: 1, padding: '12px 18px',
                      borderRadius: 12, background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.3)', color: CREAM,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    回去看步驟
                  </button>
                  <button
                    onClick={() => setPhase('running')}
                    style={{
                      flex: 1, padding: '12px 18px',
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_DEEP} 100%)`,
                      color: NAVY, border: `1.5px solid ${CREAM}`,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 900, cursor: 'pointer',
                    }}
                  >
                    再測一次
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
