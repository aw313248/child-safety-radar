'use client'

import { useState } from 'react'

// 教爸媽用 iOS 引導使用模式 / Android 螢幕釘選鎖死 App
// 第一次打開兒童模式時顯示
export default function LockScreenGuide({ onDone }: { onDone: () => void }) {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios')

  const steps = platform === 'ios' ? [
    { n: '1', title: '打開設定', body: '設定 → 輔助使用 → 引導使用模式 → 打開' },
    { n: '2', title: '回到 PeekKids', body: '留在「兒童安心模式」這個畫面' },
    { n: '3', title: '連按三下側邊鍵', body: '連按 3 次電源鍵（有 Home 鍵的機型按 Home），設密碼後開始' },
    { n: '4', title: '完成', body: '小孩只能在這個頁面操作，離開需要密碼' },
  ] : [
    { n: '1', title: '打開設定', body: '設定 → 安全性 → 螢幕釘選 → 開啟' },
    { n: '2', title: '回到 PeekKids', body: '留在「兒童安心模式」這個畫面' },
    { n: '3', title: '下滑叫出最近應用', body: '長按 PeekKids 的標題列，選「釘選」' },
    { n: '4', title: '完成', body: '要取消釘選需要同時按返回 + 概覽鍵' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(10,10,10,0.86)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: '#FFFFFF',
        borderRadius: 28,
        padding: '32px 24px 24px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🔒</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em',
            color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 6,
          }}>
            鎖住這個 App，小孩跳不出去
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
            平板內建功能，設一次用一輩子
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 6, marginBottom: 18,
          background: 'var(--ink-05)', borderRadius: 12, padding: 4,
        }}>
          {([['ios', 'iPad'], ['android', 'Android']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setPlatform(k)}
              style={{
                flex: 1, padding: '10px 0',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: platform === k ? 'var(--ink-hex)' : 'transparent',
                color: platform === k ? '#fff' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {steps.map(s => (
            <div key={s.n} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '12px 14px',
              background: 'var(--paper-hex)',
              borderRadius: 14,
              border: '1px solid var(--border-soft)',
            }}>
              <div style={{
                flexShrink: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--ink-hex)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900,
              }}>{s.n}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                  {s.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '-0.005em', lineHeight: 1.5 }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onDone}
          style={{
            width: '100%', padding: 14,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--ink-hex)', color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
            fontFamily: 'inherit',
          }}
        >
          我知道了，開始使用
        </button>

        <p style={{
          textAlign: 'center', marginTop: 12,
          fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '-0.01em',
        }}>
          下次不會再出現，設定一次就好
        </p>
      </div>
    </div>
  )
}
