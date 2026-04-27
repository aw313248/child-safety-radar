'use client'

import Image from 'next/image'
import { useState } from 'react'
import Mascot, { MascotPose } from './Mascot'

interface Props {
  /** YouTube channel thumbnail URL（從 /api/channel-thumbnails 拿） */
  src?: string | null
  /** 載入失敗 / 沒拿到時 fallback Mascot pose */
  fallbackPose: MascotPose
  /** 對外顯示尺寸（圓直徑） */
  size?: number
  alt?: string
}

/**
 * 頻道頭像 — 預設用 YouTube channel 真實頭像，
 * 載入失敗或缺資料時 fallback 到 Mascot（風格保底）
 *
 * 為什麼不直接用 next/image 的 onError fallback？
 *   → 需要 React state 管理 fallback 切換 + skeleton
 */
export default function ChannelAvatar({ src, fallbackPose, size = 92, alt = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const useMascot = !src || failed

  return (
    <div style={{
      width: size, height: size, margin: '0 auto 12px',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, #FFF6E6 0%, #F2B84B 65%, #D99422 100%)',
      border: '2.5px solid var(--ink-hex)',
      boxShadow: '0 10px 22px -10px rgba(43, 24, 16, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      {useMascot ? (
        <Mascot pose={fallbackPose} size={Math.round(size * 0.85)} />
      ) : (
        <>
          {/* Skeleton shimmer 在圖載入完成前撐住版面 */}
          {!loaded && (
            <div aria-hidden style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(110deg, rgba(255,246,230,0.3) 30%, rgba(255,255,255,0.55) 50%, rgba(255,246,230,0.3) 70%)',
              backgroundSize: '200% 100%',
              animation: 'avatar-shimmer 1.4s ease-in-out infinite',
              borderRadius: '50%',
            }} />
          )}
          <Image
            src={src!}
            alt={alt}
            width={size}
            height={size}
            unoptimized
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </>
      )}
      <style>{`
        @keyframes avatar-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
