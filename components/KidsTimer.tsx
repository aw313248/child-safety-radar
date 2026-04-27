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

// 數學題（延長用）— 多樣化避免小孩背答案
// 隨機混合 +、-、× 三種運算，保持答案 ≥ 0、≤ 100、爸媽 5 秒可算
function makeMath(): { a: number; b: number; op: '+' | '-' | '×'; answer: number } {
  const ops: Array<'+' | '-' | '×'> = ['+', '+', '-', '×'] // + 略多
  const op = ops[Math.floor(Math.random() * ops.length)]
  if (op === '×') {
    const a = 3 + Math.floor(Math.random() * 7) // 3-9
    const b = 2 + Math.floor(Math.random() * 6) // 2-7
    return { a, b, op, answer: a * b }
  }
  if (op === '-') {
    const a = 12 + Math.floor(Math.random() * 18) // 12-29
    const b = 3 + Math.floor(Math.random() * Math.min(8, a - 1))
    return { a, b, op, answer: a - b }
  }
  const a = 6 + Math.floor(Math.random() * 14)
  const b = 7 + Math.floor(Math.random() * 14)
  return { a, b, op: '+', answer: a + b }
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

    // 跨日重置：endTs 是昨天設的（不同日期）→ 一律過期，不要彈「時間到」
    const isSameDay = savedEnd > 0 &&
      new Date(savedEnd).toDateString() === new Date(now).toDateString()

    if (savedEnd && savedEnd > now && isSameDay) {
      // 同一天還在計時
      setMinutes(savedMin)
      setEndTs(savedEnd)
      setNeedSetup(false)
    } else {
      // 新一天 / 過期 / 沒設過 → 清掉舊 endTs + 顯示設定
      if (savedEnd) localStorage.removeItem(TIMER_END_KEY)
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
        hasRunningTimer={!!endTs}
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
  value, customMin, setCustomMin, onPick, onClose, hasRunningTimer,
}: {
  value: number
  customMin: string
  setCustomMin: (s: string) => void
  onPick: (min: number) => void
  onClose: () => void
  hasRunningTimer: boolean
}) {
  const handleCustom = () => {
    const n = parseInt(customMin, 10)
    if (!n || n < 1 || n > 120) return
    onPick(n)
  }

  // 5 個時間預設置中（不含「不限時」），不限時抽出來放底部當 link
  const TIMED = PRESETS.filter(p => p.value !== 0)

  return (
    <div className="kids-timer-setup-backdrop" style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: 'rgba(43,24,16,0.45)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        padding: '28px 24px 22px',
        margin: 'auto',
        // Apple liquid glass — 非常透 + 強 blur + saturation + hairline
        background: 'rgba(255, 246, 230, 0.68)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        borderRadius: 28,
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.7),' +     // 頂部高光
          ' inset 0 -1px 0 rgba(43,24,16,0.06),' +     // 底部微暗 (depth)
          ' 0 30px 60px -20px rgba(43,24,16,0.30)',    // 飄浮感
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center' }}>
            <Mascot pose="think" size={96} />
          </div>
          <h2 className="font-display" style={{ fontSize: 26, color: 'var(--ink-hex)', marginBottom: 8 }}>
            小朋友今天要看多久？
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(43,24,16,0.66)', fontWeight: 500, lineHeight: 1.6 }}>
            小析會幫你看時間，時間到就會跳出來提醒
          </p>
        </div>

        {/* Preset grid — 5 個時間預設置中（3 + 2），全 liquid glass */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          {TIMED.map((p, i) => {
            const isActive = value === p.value
            // 第二排（idx 3, 4）只有 2 顆 → 置中：給第 4 顆 grid-column 2
            const gridColumn = i === 3 ? '1 / 2' : i === 4 ? '2 / 3' : 'auto'
            return (
              <button
                key={p.value}
                onClick={() => onPick(p.value)}
                className="kids-glass-pill"
                aria-pressed={isActive}
                style={{
                  gridColumn,
                  padding: '16px 8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  borderRadius: 18,
                  fontSize: 16, fontWeight: 800,
                  color: 'var(--ink-hex)',
                  letterSpacing: '-0.02em',
                  ...(isActive ? { background: 'rgba(242, 184, 75, 0.55)' } : {}),
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* 自訂 row — liquid glass，沒有橘色虛線邊 */}
        <div className="kids-glass-row" style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 10, alignItems: 'center', marginBottom: 10,
          padding: '10px 12px 10px 16px',
          borderRadius: 18,
          width: '100%', boxSizing: 'border-box',
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.01em' }}>自訂</span>
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
                fontSize: 17, fontWeight: 800,
                color: 'var(--ink-hex)',
                textAlign: 'right',
                letterSpacing: '-0.02em',
              }}
              className="strong-placeholder"
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-hex)', flexShrink: 0 }}>分鐘</span>
          </div>
          <button
            onClick={handleCustom}
            disabled={!customMin || parseInt(customMin, 10) < 1}
            className="kids-glass-cta"
            data-active={!!(customMin && parseInt(customMin, 10) >= 1)}
            style={{
              padding: '10px 18px',
              borderRadius: 9999,
              fontFamily: 'inherit',
              fontSize: 14, fontWeight: 800,
              cursor: customMin ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
              color: 'var(--ink-hex)',
            }}
          >
            開始
          </button>
        </div>

        {/* 「保留剛剛設的計時」— 只在已有 timer running 時顯示，避免首次進來語意混亂 */}
        {hasRunningTimer && (
          <button
            onClick={onClose}
            className="kids-glass-row"
            style={{
              width: '100%', padding: '12px',
              borderRadius: 14,
              color: 'var(--ink-hex)',
              cursor: 'pointer',
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              fontFamily: 'inherit',
            }}
          >
            保留剛剛設的計時
          </button>
        )}

        {/* 「不限時」獨立 link — 替代路徑，明確說「不計時、自己看」 */}
        <button
          onClick={() => onPick(0)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', marginTop: hasRunningTimer ? 8 : 0, padding: '10px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(43,24,16,0.66)',
            cursor: 'pointer',
            fontSize: 12, fontWeight: 600, letterSpacing: '-0.005em',
            fontFamily: 'inherit',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            textDecorationColor: 'rgba(43,24,16,0.28)',
          }}
        >
          不計時 · 我自己看時間
        </button>

        <p style={{
          textAlign: 'center', marginTop: 14,
          padding: '10px 14px',
          background: 'rgba(255, 246, 230, 0.55)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 12,
          fontSize: 13, color: 'var(--ink-hex)', letterSpacing: '-0.01em',
          fontWeight: 600, lineHeight: 1.5,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
        }}>
          3–6 歲醫學建議：單次 ≤ <strong style={{ color: '#D99422', fontWeight: 800 }}>20 分鐘</strong>，一天 ≤ <strong style={{ color: '#D99422', fontWeight: 800 }}>1 小時</strong>
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

  // 口語化顯示（不要 24 小時制冷冰冰）
  let label: string
  if (remainSec <= 60) label = '快 1 分鐘了'
  else if (remainSec < 180) label = `剩 ${mm} 分`
  else label = `${mm}:${String(ss).padStart(2, '0')}`

  return (
    <button
      onClick={onClick}
      title="點一下可以重新設定時間"
      style={{
        position: 'fixed',
        top: 'max(14px, env(safe-area-inset-top))',
        right: 14,
        zIndex: 9000,
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 14px 8px 11px',
        background: urgent
          ? 'linear-gradient(135deg, rgba(194,65,59,0.92), rgba(142,42,36,0.88))'
          : 'rgba(43,24,16,0.85)',
        color: urgent ? '#FFF6E6' : 'var(--cc-gold)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: urgent ? '1px solid rgba(142,42,36,0.5)' : '1px solid rgba(43,24,16,0.55)',
        borderRadius: 9999,
        boxShadow: urgent
          ? 'inset 0 1px 0 rgba(255,255,255,0.22), 0 6px 18px -6px rgba(142,42,36,0.5)'
          : 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px -4px rgba(43,24,16,0.4)',
        fontFamily: 'inherit',
        cursor: 'pointer',
        animation: urgent ? 'bubble-pulse 0.9s ease-in-out infinite' : 'none',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>
      </svg>
      <span style={{
        fontFamily: remainSec >= 180 ? 'ui-monospace, "SF Mono", Menlo, monospace' : 'inherit',
        fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em',
      }}>
        {label}
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
  math: { a: number; b: number; op: '+' | '-' | '×'; answer: number }
  input: string
  setInput: (s: string) => void
  error: boolean
  onExtend: (extraMin: number) => void
  onExit: () => void
}) {
  return (
    <div className="kids-timer-timeup" style={{
      position: 'fixed', inset: 0, zIndex: 9900,
      // 改回首頁同款 cc-gold（#F2B84B），不是過飽和的 honey-hex（#FFB703）
      background: 'radial-gradient(ellipse 80% 60% at 30% 20%, #F8C566 0%, #F2B84B 55%, #E0A832 100%)',
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

        {/* 文字改 ink 深可可 — 在 cc-gold 底上對比清楚（vs 原本白字 textShadow） */}
        <h1 className="font-display" style={{
          fontSize: 'clamp(32px, 9vw, 48px)',
          color: 'var(--ink-hex)',
          marginBottom: 14,
          lineHeight: 1,
          letterSpacing: '-0.045em',
        }}>
          小朋友時間到囉
        </h1>
        <p style={{
          fontSize: 17, color: 'rgba(43,24,16,0.78)',
          fontWeight: 500, letterSpacing: '-0.01em',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          下次再一起探索新世界吧<br />
          現在先讓眼睛休息一下
        </p>
        <style>{`
          @keyframes sleep-breathe {
            0%,100% { transform: scale(1); }
            50%     { transform: scale(1.035); }
          }
        `}</style>

        {/* 爸媽延長區 — liquid glass 暖奶油，跟其他 modal 同套 */}
        <div style={{
          padding: '20px 20px 18px',
          marginBottom: 14,
          textAlign: 'left',
          background: 'rgba(255, 246, 230, 0.72)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          borderRadius: 22,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.7),' +
            ' inset 0 -1px 0 rgba(43,24,16,0.06),' +
            ' 0 18px 36px -16px rgba(43,24,16,0.22)',
        }}>
          <p style={{
            fontSize: 11, fontWeight: 800, color: 'var(--ink-hex)',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            opacity: 0.75, marginBottom: 8, textAlign: 'center',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            width: '100%', justifyContent: 'center',
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            爸媽區 · 小孩請勿動
          </p>
          <p style={{
            fontSize: 14, color: 'var(--ink-hex)',
            fontWeight: 600, letterSpacing: '-0.01em',
            textAlign: 'center', marginBottom: 12, lineHeight: 1.5,
          }}>
            要延長時間，請先算：<br />
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.02em', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}>
              {math.a} {math.op} {math.b} = ?
            </span>
          </p>

          <input
            type="number"
            inputMode="numeric"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="答案"
            className={`strong-placeholder${error ? ' shake' : ''}`}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 18, fontWeight: 800,
              textAlign: 'center',
              letterSpacing: '0.04em',
              background: error ? 'rgba(194, 65, 59, 0.08)' : 'rgba(255, 255, 255, 0.85)',
              border: `1.5px solid ${error ? 'var(--terra-hex)' : 'rgba(43, 24, 16, 0.22)'}`,
              borderRadius: 14,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
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
                style={{
                  padding: '10px 4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 800,
                  color: 'var(--ink-hex)',
                  letterSpacing: '-0.02em',
                  background: 'rgba(255, 255, 255, 0.55)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: '1px solid rgba(43, 24, 16, 0.22)',
                  borderRadius: 12,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
                  transition: 'background 0.15s, transform 0.12s',
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
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'var(--ink-hex)',
            color: '#FFF6E6',
            border: 'none',
            borderRadius: 9999,
            fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            boxShadow: '0 8px 22px -8px rgba(43, 24, 16, 0.42)',
          }}
        >
          好，今天先到這裡
        </button>
      </div>
    </div>
  )
}
