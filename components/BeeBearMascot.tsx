'use client'

/**
 * BeeBearMascot — Busy Bee Honey 風格吉祥物
 * 🐻 熊 = 守護者（爸媽）
 * 🐝 蜜蜂 = 小孩（會飛來飛去，需要守護）
 *
 * state:
 *   idle      - 熊坐著，蜜蜂繞著飛
 *   scanning  - 蜜蜂加速繞圈 + 熊微微跳動
 *   safe      - 蜂蜜黃光暈 + 蜜蜂停在熊頭上
 *   danger    - 熊擋在蜜蜂前面 + 紅色警戒光
 */

export type MascotState = 'idle' | 'scanning' | 'safe' | 'danger'

export default function BeeBearMascot({
  state = 'idle',
  size = 140,
}: {
  state?: MascotState
  size?: number
}) {
  const bearColor = '#8B5A3C'       // 暖棕熊
  const bearDark = '#5C3820'
  const muzzle = '#E8C9A8'
  const honey = '#F5C13D'
  const ink = '#3A2820'

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      className={
        state === 'scanning' ? 'mascot-scanning' :
        state === 'safe' ? 'mascot-safe' :
        state === 'danger' ? 'mascot-danger' : 'mascot-idle'
      }
    >
      {/* 光暈底 */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          borderRadius: '50%',
          background:
            state === 'danger'
              ? 'radial-gradient(circle, rgba(194,65,59,0.35) 0%, transparent 70%)'
              : state === 'safe'
              ? 'radial-gradient(circle, rgba(245,193,61,0.55) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(245,193,61,0.30) 0%, transparent 70%)',
          animation: 'mascot-halo-pulse 3.5s ease-in-out infinite',
        }}
      />

      {/* 熊本體 SVG */}
      <svg
        viewBox="0 0 200 200"
        width={size * 0.85}
        height={size * 0.85}
        style={{
          position: 'relative',
          zIndex: 2,
          animation: state === 'scanning'
            ? 'bear-bob 0.8s ease-in-out infinite'
            : 'bear-breathe 3.5s ease-in-out infinite',
        }}
      >
        {/* 耳朵（後） */}
        <circle cx="55" cy="55" r="18" fill={bearDark} />
        <circle cx="145" cy="55" r="18" fill={bearDark} />
        <circle cx="55" cy="55" r="11" fill={muzzle} />
        <circle cx="145" cy="55" r="11" fill={muzzle} />

        {/* 頭 */}
        <ellipse cx="100" cy="100" rx="58" ry="54" fill={bearColor} />

        {/* 口鼻區 */}
        <ellipse cx="100" cy="120" rx="30" ry="22" fill={muzzle} />

        {/* 眼睛 — 狀態變化 */}
        {state === 'danger' ? (
          <>
            {/* 警戒：眉毛下壓 */}
            <path d="M 70 82 L 88 86" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            <path d="M 130 82 L 112 86" stroke={ink} strokeWidth="4" strokeLinecap="round" />
            <circle cx="80" cy="95" r="4" fill={ink} />
            <circle cx="120" cy="95" r="4" fill={ink} />
          </>
        ) : state === 'safe' ? (
          <>
            {/* 開心：眯眯眼 */}
            <path d="M 72 93 Q 80 87 88 93" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M 112 93 Q 120 87 128 93" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            {/* 普通：圓眼 */}
            <circle cx="80" cy="93" r="5" fill={ink} />
            <circle cx="120" cy="93" r="5" fill={ink} />
            <circle cx="82" cy="91" r="1.5" fill="#FFF" />
            <circle cx="122" cy="91" r="1.5" fill="#FFF" />
          </>
        )}

        {/* 鼻子 */}
        <ellipse cx="100" cy="112" rx="8" ry="6" fill={ink} />

        {/* 嘴巴 */}
        {state === 'danger' ? (
          <path d="M 88 132 Q 100 126 112 132" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 92 128 Q 100 136 108 128" stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round" />
        )}

        {/* 腮紅 */}
        <circle cx="62" cy="115" r="7" fill={honey} opacity="0.55" />
        <circle cx="138" cy="115" r="7" fill={honey} opacity="0.55" />
      </svg>

      {/* 蜜蜂（繞圈飛） */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          animation:
            state === 'scanning'
              ? 'bee-orbit 1.6s linear infinite'
              : state === 'safe'
              ? 'none'
              : 'bee-orbit 5s linear infinite',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: state === 'safe' ? '-5%' : '8%',
            left: state === 'safe' ? '50%' : '82%',
            transform: state === 'safe' ? 'translateX(-50%)' : 'none',
            fontSize: size * 0.22,
            animation: 'bee-wobble 0.3s ease-in-out infinite',
            filter: 'drop-shadow(0 2px 4px rgba(58,40,32,0.25))',
          }}
        >
          🐝
        </div>
      </div>

      <style jsx>{`
        @keyframes mascot-halo-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
        @keyframes bear-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.035); }
        }
        @keyframes bear-bob {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-4px) scale(1.02); }
        }
        @keyframes bee-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes bee-wobble {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50%      { transform: translateY(-3px) rotate(5deg); }
        }
      `}</style>
    </div>
  )
}
