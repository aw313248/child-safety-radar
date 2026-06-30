'use client'

import { useRef, useEffect } from 'react'

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {
      // Autoplay blocked by browser — poster image remains visible
    })
  }, [])

  return (
    <section
      aria-label="Hero video"
      style={{
        // Break out of .page-main padding (24px top, 20px sides)
        marginTop: '-24px',
        marginLeft: '-20px',
        width: 'calc(100% + 40px)',
        height: '100svh',
        minHeight: 480,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#050505',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingBottom: 'clamp(36px, 8vh, 72px)',
        paddingLeft: 'clamp(24px, 6vw, 64px)',
        paddingRight: 'clamp(24px, 6vw, 64px)',
        marginBottom: 56,
      }}
    >
      {/* Background video */}
      <video
        ref={videoRef}
        src="/videos/hero.mp4"
        poster="/videos/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Gradient overlay — top subtle, bottom readable for text */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom,' +
            ' rgba(0,0,0,0.08) 0%,' +
            ' rgba(0,0,0,0.10) 50%,' +
            ' rgba(0,0,0,0.46) 85%,' +
            ' rgba(0,0,0,0.62) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Text content */}
      <div style={{ position: 'relative', zIndex: 1, color: '#fff' }}>
        <h1
          style={{
            fontSize: 'clamp(32px, 5.5vw, 68px)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            marginBottom: 10,
            textShadow: '0 2px 24px rgba(0,0,0,0.35)',
          }}
        >
          Oscar Lai
        </h1>
        <p
          style={{
            fontSize: 'clamp(10px, 1.1vw, 13px)',
            fontWeight: 400,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            opacity: 0.72,
            marginBottom: 36,
            textShadow: '0 1px 8px rgba(0,0,0,0.45)',
          }}
        >
          Director&nbsp;&nbsp;·&nbsp;&nbsp;Filmmaker&nbsp;&nbsp;·&nbsp;&nbsp;Visual Storyteller
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="/portfolio"
            className="hero-cta hero-cta--primary"
          >
            View Portfolio
          </a>
          <a
            href="https://minehoooo.vercel.app/field-notes"
            className="hero-cta hero-cta--ghost"
          >
            Explore Field Notes
          </a>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden
        className="hero-scroll-cue"
        style={{
          position: 'absolute',
          bottom: 28,
          right: 'clamp(24px, 6vw, 64px)',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.50)',
            marginBottom: 8,
            writingMode: 'vertical-rl',
          }}
        >
          Scroll
        </span>
        <span
          className="hero-scroll-line"
          style={{
            display: 'block',
            width: 1,
            height: 32,
            background: 'rgba(255,255,255,0.30)',
            margin: '0 auto',
          }}
        />
      </div>
    </section>
  )
}
