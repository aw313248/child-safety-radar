'use client'

import { useEffect, useState } from 'react'

// iOS：Apple 從 iOS 11 起擋掉 prefs: / App-prefs: 深連結
//      → 最佳方案是「複製關鍵字到剪貼簿 + 顯示清楚步驟」讓爸媽進設定後貼上搜尋
// Android：Chrome 吃 intent:// 可以真的跳到輔助使用設定
export default function LockScreenGuide({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const ua = navigator.userAgent.toLowerCase()
    if (/ipad|iphone|ipod/.test(ua) || (ua.includes('macintosh') && 'ontouchend' in document)) {
      setPlatform('ios')
    } else if (/android/.test(ua)) {
      setPlatform('android')
    }
  }, [])

  const handleClick = async () => {
    if (platform === 'android') {
      // Android Chrome 真的可以跳
      window.location.href = 'intent://#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end'
      return
    }

    if (platform === 'ios') {
      // iOS：複製關鍵字到剪貼簿（這個真的有用）
      try {
        await navigator.clipboard.writeText('引導使用模式')
        setCopied(true)
      } catch {
        // 舊 Safari fallback
        const ta = document.createElement('textarea')
        ta.value = '引導使用模式'
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy'); setCopied(true) } catch {}
        document.body.removeChild(ta)
      }
      // 嘗試深連結（iOS 11+ Safari 多半會被擋，但 PWA 或舊版可能吃）
      setTimeout(() => {
        window.location.href = 'App-prefs:ACCESSIBILITY'
      }, 300)
    }
  }

  const platformLabel =
    platform === 'ios' ? 'iPad / iPhone' :
    platform === 'android' ? 'Android 平板 / 手機' : '你的裝置'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(10,10,10,0.86)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--card-hex, #FBF7EA)',
        borderRadius: 28,
        padding: '28px 22px 20px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        margin: 'auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 44, marginBottom: 6 }}>🔒</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em',
            color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: 6,
          }}>
            鎖住這個畫面<br />小孩就跳不出去
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
            偵測到你用 <strong style={{ color: 'var(--text-primary)' }}>{platformLabel}</strong>
          </p>
        </div>

        {/* iOS 教學 */}
        {platform === 'ios' && (
          <>
            <button
              onClick={handleClick}
              style={{
                width: '100%', padding: '16px 18px', marginBottom: 12,
                background: 'var(--ink-hex)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-lg)',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 24px rgba(10,10,10,0.2)',
              }}
            >
              {copied ? '✅ 已複製「引導使用模式」' : '📋 複製關鍵字 + 打開設定'}
            </button>

            {/* 誠實說明 */}
            <p style={{
              fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em',
              lineHeight: 1.55, textAlign: 'center', marginBottom: 14,
            }}>
              iOS Safari 不允許網頁直接跳到設定內頁，<br />
              所以我們先把關鍵字複製給你，再按下面步驟
            </p>

            {/* 3 步驟圖文 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {[
                { n: 1, title: '打開設定 App', body: '回到桌面，點灰色齒輪圖示' },
                { n: 2, title: '貼上剛剛複製的字', body: '設定最上方有搜尋欄 → 長按 → 貼上 → 搜尋' },
                { n: 3, title: '打開「引導使用模式」', body: '點進去把開關打開，回 PeekKids 後連按三下側邊鍵鎖畫面' },
              ].map(s => (
                <div key={s.n} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 12,
                }}>
                  <div style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--ink-hex)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900,
                  }}>{s.n}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>
                      {s.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
                      {s.body}
                    </p>
                  </div>
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
                background: 'var(--ink-hex)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-lg)',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 10px 24px rgba(10,10,10,0.2)',
              }}
            >
              ⚙️ 幫我打開輔助使用設定
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.55, textAlign: 'center', marginBottom: 14 }}>
              打開「螢幕釘選」→ 回 PeekKids 從最近應用長按圖示選「釘選」
            </p>
          </>
        )}

        {/* 其他裝置 */}
        {platform === 'other' && (
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 12, padding: 14, marginBottom: 14,
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.6 }}>
              請在平板上開啟 PeekKids，依系統指示開啟引導使用模式 / 螢幕釘選
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
          {copied ? '我設定好了，開始看片' : '先跳過，直接看片'}
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
