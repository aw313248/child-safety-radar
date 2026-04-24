'use client'

import { useEffect, useState } from 'react'

// 教爸媽用 iOS 引導使用模式 / Android 螢幕釘選鎖死 App
// 一鍵打開設定（網頁深連結的極限）
export default function LockScreenGuide({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent.toLowerCase()
    if (/ipad|iphone|ipod/.test(ua) || (ua.includes('macintosh') && 'ontouchend' in document)) {
      setPlatform('ios')
    } else if (/android/.test(ua)) {
      setPlatform('android')
    }
  }, [])

  // 一鍵打開設定
  const openSettings = () => {
    setTried(true)
    if (platform === 'ios') {
      // iOS：嘗試跳到「輔助使用」設定頁
      // Safari 會擋大部分 prefs: URL，但 PWA 安裝後 / 舊版 iOS 可能吃
      window.location.href = 'App-prefs:ACCESSIBILITY'
    } else if (platform === 'android') {
      // Android Chrome：intent URL 會直接打開輔助使用設定
      window.location.href =
        'intent://#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end'
    }
  }

  // 平台設定路徑說明
  const pathText = platform === 'ios'
    ? '設定 → 輔助使用 → 引導使用模式 → 打開開關'
    : platform === 'android'
      ? '設定 → 安全性（或輔助使用）→ 螢幕釘選 → 開啟'
      : '打開平板的設定，找「引導使用模式」或「螢幕釘選」'

  const useText = platform === 'ios'
    ? '回到 PeekKids，連按三下側邊鍵（或 Home 鍵）即可鎖住畫面'
    : platform === 'android'
      ? '回到 PeekKids，從最近應用長按 PeekKids 圖示選「釘選」'
      : '回到 PeekKids 後依平板指示把這個畫面鎖住'

  const platformLabel = platform === 'ios' ? 'iPad / iPhone' : platform === 'android' ? 'Android' : '你的裝置'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(10,10,10,0.86)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#FFFFFF',
        borderRadius: 28,
        padding: '32px 24px 24px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em',
            color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 6,
          }}>
            鎖住這個 App<br />小孩就跳不出去
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
            偵測到你用 <strong style={{ color: 'var(--text-primary)' }}>{platformLabel}</strong>，點一下就幫你打開設定
          </p>
        </div>

        {/* 主 CTA — 一鍵打開設定 */}
        {platform !== 'other' && (
          <button
            onClick={openSettings}
            style={{
              width: '100%',
              padding: '16px 18px',
              marginBottom: 12,
              background: 'var(--ink-hex)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 10px 24px rgba(10,10,10,0.2)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            幫我打開設定
          </button>
        )}

        {/* 沒反應的 fallback 說明（點過才顯示，避免一開始就讓人覺得複雜） */}
        {tried && (
          <div style={{
            background: 'var(--paper-hex)',
            border: '1px solid var(--border-soft)',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
              沒跳過去？手動走一次（只要做一次）
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.55, fontWeight: 600, marginBottom: 6 }}>
              {pathText}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.55 }}>
              {useText}
            </p>
          </div>
        )}

        {/* 預設顯示的簡短說明 */}
        {!tried && platform !== 'other' && (
          <p style={{
            fontSize: 12, color: 'var(--text-secondary)',
            letterSpacing: '-0.01em', lineHeight: 1.55,
            textAlign: 'center', marginBottom: 14,
          }}>
            打開<strong style={{ color: 'var(--text-primary)' }}>{platform === 'ios' ? '引導使用模式' : '螢幕釘選'}</strong>，回到 PeekKids 就能鎖住
          </p>
        )}

        {/* 其他平台 fallback */}
        {platform === 'other' && (
          <div style={{
            background: 'var(--paper-hex)',
            borderRadius: 12, padding: 14, marginBottom: 14,
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.6 }}>
              請在平板上打開 PeekKids，系統會自動帶你到設定
            </p>
          </div>
        )}

        <button
          onClick={onDone}
          style={{
            width: '100%', padding: 12,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--ink-05)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-soft)',
            cursor: 'pointer',
            fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
            fontFamily: 'inherit',
          }}
        >
          {tried ? '設定好了，開始使用' : '先跳過，直接看片'}
        </button>

        <p style={{
          textAlign: 'center', marginTop: 10,
          fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '-0.01em',
        }}>
          設定一次用一輩子，下次不會再出現
        </p>
      </div>
    </div>
  )
}
