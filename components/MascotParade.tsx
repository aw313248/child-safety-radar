'use client'

import Image from 'next/image'

// 小析滑動隊伍 — 無限橫向跑馬燈，hover 暫停
const POSES = [
  { src: '/mascot/hi.png',        alt: '小析揮手' },
  { src: '/mascot/guard.png',     alt: '小析守護' },
  { src: '/mascot/fly.png',       alt: '小析飛起來' },
  { src: '/mascot/thumbs-up.png', alt: '小析比讚' },
  { src: '/mascot/search.png',    alt: '小析查資料' },
  { src: '/mascot/stand.png',     alt: '小析站姿' },
  { src: '/mascot/wink.png',      alt: '小析眨眼揮手' },
]

interface Props {
  size?: number
  speed?: number   // 一輪秒數，越大越慢
  className?: string
}

export default function MascotParade({ size = 80, speed = 28, className }: Props) {
  // 重複兩遍才能無縫接軌
  const seq = [...POSES, ...POSES]
  return (
    <div
      className={className}
      style={{
        width: '100%',
        overflow: 'hidden',
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)',
        maskImage:        'linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 18,
          width: 'max-content',
          animation: `mascot-parade ${speed}s linear infinite`,
        }}
      >
        {seq.map((p, i) => (
          <div
            key={i}
            style={{
              width: size, height: size,
              flex: '0 0 auto',
              filter: 'drop-shadow(0 6px 12px rgba(43, 24, 16, 0.18))',
            }}
          >
            <Image
              src={p.src}
              alt={p.alt}
              width={size}
              height={size}
              style={{ width: size, height: size, objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes mascot-parade {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        :global(.mascot-parade-wrap:hover) > div {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
