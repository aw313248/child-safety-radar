'use client'

import { useEffect, useRef, useState } from 'react'
import Mascot, { MascotPose } from './Mascot'

// localStorage keys
const TIMER_MIN_KEY = 'peekkids_timer_minutes'  // 預設分鐘數
const TIMER_END_KEY = 'peekkids_timer_end_ts'   // 本次結束時間戳

type Preset = 5 | 10 | 15 | 20 | 30 | 0 // 0 = 不設定

const PRESETS: { value: Preset; label: string }[] = [
  { value: 5,  label: '5 分鐘' },
  { value: 10, label: '10 分鐘' },
  { value: 15, label: '15 分鐘' },
  { value: 20, label: '20 分鐘' },
  { value: 30, label: '30 分鐘' },
  { value: 0,  label: '不設定' },
]

// 數學題（延長用）
function makeMath() {
  const a = 6 + Math.floor(Math.random() * 6)
  const b = 7 + Math.floor(Math.random() * 6)
  return { a, b, answer: a + b }
}

interface Props {
  /** 時間到要做的事（kids 頁面：停止播放 + 跳結束畫面） */
  onTimeUp: () => void
  /** 手動離開 */
  onExit: () => void
}

export default function KidsTimer({ onTimeUp, onExit }: Props) {
  const [mounted, setMounted] = useState(false)
  const [needSetup, setNeedSetup] = useState(false)
  const [minutes, setMinutes] = useState<number>(5)
  const [customMin, setCustomMin] = useState<string>('')
  const [endTs, setEndTs] = useState<number | null>(null)
  const [remainSec, setRemainSec] = useState<number>(0)

  // 警示：5 分鐘前、1 分鐘前、時間到
  const [warn, setWarn] = useState<'5min' | '1min' | 'up' | null>(null)
  const shown5 = useRef(false)
  const shown1 = useRef(false)
  const triggeredUp = useRef(false)

  // 延長數學題
  const [extendMath, setExtendMath] = useState(makeMath())
  const [extendInput, setExtendInput] = useState('')
  const [extendErr, setExtendErr] = useState(false)

  // ── 初始化 ──────────────────────────────
  useEffect(() => {
    setMounted(true)
    const savedMin = Number(localStorage.getItem(TIMER_MIN_KEY) || '0')
    const savedEnd = Number(localStorage.getItem(TIMER_END_KEY) || '0')
    const now = Date.now()

    if (savedEnd && savedEnd > now) {
      // 還在計時
      setMinutes(savedMin)
      setEndTs(savedEnd)
      setNeedSetup(false)
    } else {
      // 新 session → 顯示設定
      setNeedSetup(true)
      if (savedMin > 0) setMinutes(savedMin)
    }
  }, [])

  // ── 每秒 tick ──────────────────────────
  useEffect(() => {
    if (!endTs) return
    const tick = () => {
      const remain = Math.max(0, Math.floor((endTs - Date.now()) / 1000))
      setRemainSec(remain)

      // 剩 5 分鐘提醒
      if (remain <= 300 && remain > 295 && !shown5.current) {
        shown5.current = true
        setWarn('5min')
        setTimeout(() => setWarn(w => w === '5min' ? null : w), 5000)
      }
      // 剩 1 分鐘提醒
      if (remain <= 60 && remain > 55 && !shown1.current) {
        shown1.current = true
        setWarn('1min')
        setTimeout(() => setWarn(w => w === '1min' ? null : w), 5000)
      }
      // 時間到
      if (remain === 0 && !triggeredUp.current) {
        triggeredUp.current = true
        setWarn('up')
        onTimeUp()
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTs, onTimeUp])

  // ── 開始計時 ────────────────────────────
  const startTimer = (min: number) => {
    localStorage.setItem(TIMER_MIN_KEY, String(min))
    if (min === 0) {
      // 不設定 → 清掉
      localStorage.removeItem(TIMER_END_KEY)
      setEndTs(null)
      setNeedSetup(false)
      return
    }
    const end = Date.now() + min * 60 * 1000
    localStorage.setItem(TIMER_END_KEY, String(end))
    setMinutes(min)
    setEndTs(end)
    shown5.current = min <= 5  // 5 分鐘以下不跳 5min 提醒
    shown1.current = false
    triggeredUp.current = false
    setNeedSetup(false)
  }

  // 延長時間（爸媽驗證）
  const tryExtend = (extraMin: number) => {
    if (parseInt(extendInput, 10) !== extendMath.answer) {
      setExtendErr(true)
      setTimeout(() => setExtendErr(false), 900)
      return
    }
    setExtendInput('')
    setExtendMath(makeMath())
    setWarn(null)               // ★ 關閉時間到畫面（不然會卡住跳下一題）
    startTimer(extraMin)
  }

  if (!mounted) return null

  // ── 設定畫面（進入時 / 時間到選延長） ──
  if (needSetup) {
    return (
      <SetupScreen
        value={minutes}
        customMin={customMin}
        setCustomMin={setCustomMin}
        onPick={startTimer}
        onClose={() => setNeedSetup(false)}
      />
    )
  }

  // ── 時間到！全螢幕小析 ──────────────────
  if (warn === 'up') {
    return (
      <TimeUpScreen
        math={extendMath}
        input={extendInput}
        setInput={setExtendInput}
        error={extendErr}
        onExtend={tryExtend}
        onExit={onExit}
      />
    )
  }

  // ── 正常狀態：右上計時 Bubble + 小析警示 ──
  return (
    <>
      {endTs && (
        <TimerBubble
          remainSec={remainSec}
          onClick={() => setNeedSetup(true)}
        />
      )}
      {warn === '5min' && <BearWarn msg="再 5 分鐘就要休息囉～" pose="think" />}
      {warn === '1min' && <BearWarn msg="最後 1 分鐘！再看一下下" pose="thumbs-up" urgent />}
    </>
  )
}

// ═══════════════════════════════════════
// 設定畫面 — Busy Bee 風，含自訂
// ═══════════════════════════════════════
function SetupScreen({
  value, customMin, setCustomMin, onPick, onClose,
}: {
  value: number
  customMin: string
  setCustomMin: (s: string) => void
  onPick: (min: number) => void
  onClose: () => void
}) {
  const handleCustom = () => {
    const n = parseInt(customMin, 10)
    if (!n || n < 1 || n > 120) return
    onPick(n)
  }

  return (
    <div className="kids-timer-setup-backdrop" style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(43,24,16,0.55)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      <div className="bee-card" style={{
        width: '100%', maxWidth: 440,
        padding: '28px 24px 22px',
        margin: 'auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
            <Mascot pose="think" size={96} />
          </div>
          <h2 className="font-display" style={{ fontSize: 26, color: 'var(--ink-hex)', marginBottom: 8 }}>
            小朋友今天要看多久？
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6 }}>
            小析會幫你看時間，時間到就會跳出來提醒
          </p>
        </div>

        {/* Preset grid — 「不設定」用差異化樣式：透明 + 虛線，明顯不是時間選項 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {PRESETS.map(p => {
            const isSkip = p.value === 0
            const isActive = value === p.value
            return (
              <button
                key={p.value}
                onClick={() => onPick(p.value)}
                className={isSkip ? '' : 'bee-card-flat'}
                style={{
                  padding: '14px 8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  borderRadius: 14,
                  background: isSkip
                    ? 'transparent'
                    : isActive ? 'var(--honey-hex)' : 'var(--card-hex)',
                  border: isSkip
                    ? '2px dashed rgba(43,24,16,0.15)'
                    : undefined,
                  boxShadow: isSkip ? 'none' : undefined,
                  transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
                }}
                onMouseEnter={e => {
                  if (isSkip) {
                    e.currentTarget.style.background = 'rgba(43,24,16,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(43,24,16,0.25)'
                  }
                }}
                onMouseLeave={e => {
                  if (isSkip) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(43,24,16,0.15)'
                  }
                }}
              >
                <div style={{
                  fontSize: isSkip ? 13 : 16,
                  fontWeight: isSkip ? 700 : 900,
                  color: isSkip ? 'var(--text-tertiary)' : 'var(--ink-hex)',
                  letterSpacing: '-0.02em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  {isSkip && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                  {isSkip ? '不限時' : p.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* 自訂 — grid 確保不會擠出去 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 8, alignItems: 'center', marginBottom: 14,
          padding: '12px 14px',
          background: 'rgba(43,24,16,0.04)',
          border: '1.5px solid rgba(242, 184, 75, 0.55)',
          borderRadius: 16,
          width: '100%', boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--ink-hex)', letterSpacing: '-0.01em' }}>自訂</span>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center',
            gap: 4, minWidth: 0,
          }}>
            <input
              type="text"
              inputMode="numeric"
              value={customMin}
              onChange={e => setCustomMin(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="幾分"
              style={{
                width: '100%', minWidth: 0, maxWidth: 90,
                border: 'none', outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 17, fontWeight: 900,
                color: 'var(--ink-hex)',
                textAlign: 'right',
                letterSpacing: '-0.02em',
              }}
              className="strong-placeholder"
            />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-hex)', flexShrink: 0 }}>分鐘</span>
          </div>
          <button
            onClick={handleCustom}
            disabled={!customMin || parseInt(customMin, 10) < 1}
            style={{
              padding: '10px 18px',
              borderRadius: 9999,
              background: customMin && parseInt(customMin, 10) >= 1
                ? 'linear-gradient(135deg, #F2B84B 0%, #D99422 100%)'
                : 'rgba(43,24,16,0.08)',
              color: customMin && parseInt(customMin, 10) >= 1 ? 'var(--ink-hex)' : 'rgba(43,24,16,0.42)',
              border: '2px solid var(--ink-hex)',
              fontFamily: 'inherit',
              fontSize: 14, fontWeight: 800,
              cursor: customMin ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              boxShadow: customMin && parseInt(customMin, 10) >= 1
                ? '3px 3px 0 var(--ink-hex)' : '2px 2px 0 rgba(43,24,16,0.25)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            開始
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: 12,
            borderRadius: 14,
            background: 'rgba(43,24,16,0.04)',
            color: 'var(--ink-hex)',
            border: '1.5px solid rgba(43,24,16,0.22)',
            cursor: 'pointer',
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            fontFamily: 'inherit',
            opacity: 0.85,
          }}
        >
          先不改 · 繼續剛剛設的
        </button>

        <p style={{
          textAlign: 'center', marginTop: 14,
          padding: '10px 14px',
          background: 'rgba(242, 184, 75, 0.14)',
          border: '1px solid rgba(242, 184, 75, 0.4)',
          borderRadius: 12,
          fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em',
          fontWeight: 700, lineHeight: 1.5,
        }}>
          3–6 歲醫學建議：單次 ≤ <strong style={{ color: '#F2B84B', fontWeight: 900 }}>20 分鐘</strong>，一天 ≤ <strong style={{ color: '#F2B84B', fontWeight: 900 }}>1 小時</strong>
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// 右上角計時 Bubble
// ═══════════════════════════════════════
function TimerBubble({ remainSec, onClick }: { remainSec: number; onClick: () => void }) {
  const mm = Math.floor(remainSec / 60)
  const ss = remainSec % 60
  const urgent = remainSec <= 60
  return (
    <button
      onClick={onClick}
      title="點一下可以重新設定時間"
      style={{
        position: 'fixed',
        top: 'max(14px, env(safe-area-inset-top))',
        right: 14,
        zIndex: 9000,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px 8px 10px',
        background: urgent ? 'var(--terra-hex)' : 'var(--ink-hex)',
        color: urgent ? '#fff' : 'var(--honey-hex)',
        border: '2.5px solid var(--ink-hex)',
        borderRadius: 9999,
        boxShadow: '3px 3px 0 rgba(43,24,16,0.92)',
        fontFamily: 'inherit',
        cursor: 'pointer',
        animation: urgent ? 'bubble-pulse 0.9s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{ fontSize: 16 }}>⏱️</span>
      <span style={{
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 14, fontWeight: 900, letterSpacing: '0.02em',
      }}>
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </span>
      <style>{`
        @keyframes bubble-pulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.08); }
        }
      `}</style>
    </button>
  )
}

// ═══════════════════════════════════════
// 小析警示 — 從右下彈出揮手
// ═══════════════════════════════════════
function BearWarn({ msg, pose, urgent = false }: { msg: string; pose: MascotPose; urgent?: boolean }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'max(20px, env(safe-area-inset-bottom))',
      right: 16,
      zIndex: 9100,
      display: 'flex', alignItems: 'flex-end', gap: 6,
      animation: 'bear-slidein 0.5s var(--ease-spring)',
      pointerEvents: 'none',
    }}>
      {/* 對話框 */}
      <div style={{
        background: urgent
          ? 'linear-gradient(135deg, #C2413B 0%, #8E2A24 100%)'
          : 'linear-gradient(135deg, #F2B84B 0%, #D99422 100%)',
        color: urgent ? '#fff' : '#2B1810',
        border: '1.5px solid rgba(255,255,255,0.55)',
        borderRadius: 18,
        padding: '12px 16px',
        boxShadow: '0 14px 34px -10px rgba(15, 36, 68, 0.55)',
        maxWidth: 220,
        position: 'relative',
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.4 }}>
          {msg}
        </p>
        {/* 對話框尾巴 */}
        <div style={{
          position: 'absolute',
          right: -8, bottom: 14,
          width: 0, height: 0,
          borderLeft: `10px solid ${urgent ? '#8E2A24' : '#D99422'}`,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
        }} />
      </div>
      {/* 小析本人 */}
      <div style={{
        animation: 'bear-wave 1.4s ease-in-out infinite',
        transformOrigin: '50% 90%',
      }}>
        <Mascot pose={pose} size={96} />
      </div>
      <style>{`
        @keyframes bear-slidein {
          from { transform: translateY(40px) scale(0.8); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes bear-wave {
          0%,100% { transform: rotate(-4deg); }
          50%     { transform: rotate(4deg); }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════
// 時間到 — 全螢幕小析 + 爸媽解鎖延長
// ═══════════════════════════════════════
function TimeUpScreen({
  math, input, setInput, error, onExtend, onExit,
}: {
  math: { a: number; b: number; answer: number }
  input: string
  setInput: (s: string) => void
  error: boolean
  onExtend: (extraMin: number) => void
  onExit: () => void
}) {
  return (
    <div className="kids-timer-timeup" style={{
      position: 'fixed', inset: 0, zIndex: 9900,
      background: 'var(--honey-hex)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
      animation: 'fade-scale-in 0.4s var(--ease-out)',
    }}>
      <div style={{
        width: '100%', maxWidth: 460,
        textAlign: 'center',
        margin: 'auto',
      }}>
        {/* 小析本人 — 睡覺大圖 */}
        <div style={{
          marginBottom: 8, display: 'flex', justifyContent: 'center',
          animation: 'sleep-breathe 3.2s ease-in-out infinite',
        }}>
          <Mascot pose="sleep" size={220} />
        </div>

        <h1 className="font-display" style={{
          fontSize: 'clamp(32px, 9vw, 48px)',
          color: '#fff',
          marginBottom: 14,
          lineHeight: 1,
          textShadow: '0 6px 30px rgba(0,0,0,0.45)',
        }}>
          小朋友時間到囉
        </h1>
        <p style={{
          fontSize: 17, color: 'rgba(255,255,255,0.92)',
          fontWeight: 500, letterSpacing: '-0.01em',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          下次再一起探索新世界吧！<br />
          現在先讓眼睛休息一下
        </p>
        <style>{`
          @keyframes sleep-breathe {
            0%,100% { transform: scale(1); }
            50%     { transform: scale(1.035); }
          }
        `}</style>

        {/* 爸媽延長區 */}
        <div className="bee-card" style={{
          padding: '20px 20px 18px',
          marginBottom: 14,
          textAlign: 'left',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 900, color: 'var(--ink-hex)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            opacity: 0.7, marginBottom: 8, textAlign: 'center',
          }}>
            ⚠️ 爸媽區 · 小孩請勿動
          </p>
          <p style={{
            fontSize: 14, color: 'var(--ink-hex)',
            fontWeight: 700, letterSpacing: '-0.01em',
            textAlign: 'center', marginBottom: 12, lineHeight: 1.5,
          }}>
            要延長時間，請先算：<br />
            <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.02em' }}>
              {math.a} + {math.b} = ?
            </span>
          </p>

          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="答案"
            className={error ? 'shake' : ''}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 18, fontWeight: 900,
              textAlign: 'center',
              letterSpacing: '0.04em',
              background: error ? '#FFE8E0' : 'var(--card-hex)',
              border: `2.5px solid ${error ? 'var(--terra-hex)' : 'var(--ink-hex)'}`,
              borderRadius: 14,
              fontFamily: 'inherit',
              color: 'var(--ink-hex)',
              marginBottom: 12,
              outline: 'none',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[5, 10, 15].map(m => (
              <button
                key={m}
                onClick={() => onExtend(m)}
                className="bee-card-flat"
                style={{
                  padding: '10px 4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 900,
                  color: 'var(--ink-hex)',
                  letterSpacing: '-0.02em',
                  background: 'var(--honey-hex)',
                }}
              >
                +{m} 分鐘
              </button>
            ))}
          </div>

          <style>{`
            .shake { animation: input-shake 0.4s; }
            @keyframes input-shake {
              0%,100% { transform: translateX(0); }
              20%,60% { transform: translateX(-6px); }
              40%,80% { transform: translateX(6px); }
            }
          `}</style>
        </div>

        <button
          onClick={onExit}
          className="btn-pill"
          style={{ width: '100%' }}
        >
          好，今天先到這裡
        </button>
      </div>
    </div>
  )
}
