'use client'

interface Props {
  size?: number
  spinning?: boolean
}

export default function RadarScanner({ size = 40, spinning = false }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={spinning ? 'animate-spin-radar' : ''}
    >
      {/* Outer ring */}
      <circle cx="24" cy="24" r="22" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      {/* Middle ring */}
      <circle cx="24" cy="24" r="14" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
      {/* Inner ring */}
      <circle cx="24" cy="24" r="6" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
      {/* Center dot */}
      <circle cx="24" cy="24" r="2.5" fill="#ef4444" />
      {/* Sweep line */}
      <line x1="24" y1="24" x2="46" y2="24" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
      {/* Cross hairs */}
      <line x1="24" y1="2" x2="24" y2="8" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
      <line x1="24" y1="40" x2="24" y2="46" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
      <line x1="2" y1="24" x2="8" y2="24" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
      <line x1="40" y1="24" x2="46" y2="24" stroke="#ef4444" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}
