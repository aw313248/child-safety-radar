'use client'

type OwlState = 'idle' | 'scanning' | 'danger' | 'safe'

interface Props {
  state?: OwlState
  size?: number
}

export default function OwlMascot({ state = 'idle', size = 160 }: Props) {
  const isScanning = state === 'scanning'
  const isDanger = state === 'danger'
  const isSafe = state === 'safe'

  const eyeColor = isDanger ? '#C0392B' : isSafe ? '#1E8449' : '#E8960C'
  const eyeGlowClass = isDanger ? 'animate-glow-red' : isSafe ? 'animate-glow-green' : ''

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${state === 'idle' ? 'animate-float' : ''} ${eyeGlowClass}`}
    >
      {/* Shadow */}
      <ellipse cx="80" cy="174" rx="36" ry="5" fill="rgba(27,58,45,0.1)" />

      {/* Body */}
      <ellipse cx="80" cy="138" rx="38" ry="34" fill="#1B3A2D" />

      {/* Wing feather detail left */}
      <path d="M42 118 Q28 130 34 148 Q40 138 42 118Z" fill="#2D5E45" />
      <path d="M44 124 Q31 136 37 152 Q43 142 44 124Z" fill="#1B3A2D" opacity="0.5"/>

      {/* Wing feather detail right */}
      <path d="M118 118 Q132 130 126 148 Q120 138 118 118Z" fill="#2D5E45" />
      <path d="M116 124 Q129 136 123 152 Q117 142 116 124Z" fill="#1B3A2D" opacity="0.5"/>

      {/* Belly / chest lighter patch */}
      <ellipse cx="80" cy="142" rx="22" ry="22" fill="#2D5E45" opacity="0.5" />
      <ellipse cx="80" cy="146" rx="16" ry="16" fill="#3A7055" opacity="0.35" />

      {/* Feet */}
      <g stroke="#E8960C" strokeWidth="2.5" strokeLinecap="round">
        <line x1="66" y1="168" x2="56" y2="176" />
        <line x1="66" y1="168" x2="63" y2="177" />
        <line x1="66" y1="168" x2="70" y2="177" />
        <line x1="94" y1="168" x2="84" y2="176" />
        <line x1="94" y1="168" x2="91" y2="177" />
        <line x1="94" y1="168" x2="98" y2="177" />
      </g>

      {/* Head */}
      <circle cx="80" cy="75" r="44" fill="#1B3A2D" />

      {/* Ear tufts */}
      <path d="M52 40 L44 20 L62 34Z" fill="#1B3A2D" />
      <path d="M108 40 L116 20 L98 34Z" fill="#1B3A2D" />
      <path d="M52 40 L47 26 L59 36Z" fill="#2D5E45" opacity="0.6" />
      <path d="M108 40 L113 26 L101 36Z" fill="#2D5E45" opacity="0.6" />

      {/* Face disc */}
      <ellipse cx="80" cy="78" rx="34" ry="30" fill="#2D5E45" opacity="0.45" />

      {/* Left eye — outer ring */}
      <circle cx="62" cy="72" r="16" fill={eyeColor} />

      {/* Left eye — radar sweep (only when scanning) */}
      {isScanning && (
        <g style={{ transformOrigin: '62px 72px' }} className="animate-radar">
          <path
            d="M62 72 L62 58 A14 14 0 0 1 76 72Z"
            fill="rgba(255,255,255,0.25)"
          />
        </g>
      )}

      {/* Left eye — pupil */}
      <circle cx="62" cy="72" r="9" fill="#1C1A16" />
      <circle cx="65" cy="68" r="3.5" fill="white" opacity="0.9" />
      <circle cx="58" cy="75" r="1.5" fill="white" opacity="0.4" />

      {/* Left eyelid (blink) */}
      <ellipse
        cx="62" cy="72" rx="16" ry="16"
        fill="#1B3A2D"
        style={{ transformOrigin: '62px 56px', transformBox: 'fill-box' }}
        className={state === 'idle' ? 'animate-blink' : ''}
      />

      {/* Right eye — outer ring */}
      <circle cx="98" cy="72" r="16" fill={eyeColor} />

      {/* Right eye — radar sweep (only when scanning) */}
      {isScanning && (
        <g style={{ transformOrigin: '98px 72px' }} className="animate-radar">
          <path
            d="M98 72 L98 58 A14 14 0 0 1 112 72Z"
            fill="rgba(255,255,255,0.25)"
          />
        </g>
      )}

      {/* Right eye — pupil */}
      <circle cx="98" cy="72" r="9" fill="#1C1A16" />
      <circle cx="101" cy="68" r="3.5" fill="white" opacity="0.9" />
      <circle cx="94" cy="75" r="1.5" fill="white" opacity="0.4" />

      {/* Right eyelid (blink) */}
      <ellipse
        cx="98" cy="72" rx="16" ry="16"
        fill="#1B3A2D"
        style={{ transformOrigin: '98px 56px', transformBox: 'fill-box' }}
        className={state === 'idle' ? 'animate-blink' : ''}
      />

      {/* Beak */}
      <path d="M80 83 L74 92 L86 92Z" fill="#E8960C" />
      <path d="M80 86 L74 92 L86 92Z" fill="#C87800" opacity="0.5" />

      {/* Chest feather rows */}
      <path d="M64 122 Q72 118 80 122 Q88 118 96 122" stroke="#3A7055" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <path d="M62 130 Q71 126 80 130 Q89 126 98 130" stroke="#3A7055" strokeWidth="1.5" fill="none" opacity="0.6"/>
      <path d="M64 138 Q72 134 80 138 Q88 134 96 138" stroke="#3A7055" strokeWidth="1.5" fill="none" opacity="0.5"/>
    </svg>
  )
}
