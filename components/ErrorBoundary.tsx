'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * React Error Boundary — 任一元件 crash 不會整頁白屏
 * fallback 顯示友善錯誤 + 重新整理 CTA
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      // Mia 第四輪 P2 #6：文案改溫和、加返回掃描按鈕
      return (
        <div style={{
          padding: '32px 24px',
          margin: '24px auto',
          maxWidth: 440,
          textAlign: 'center',
          background: 'rgba(255, 246, 230, 0.7)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderRadius: 22,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 16px 32px -16px rgba(43,24,16,0.2)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.03em', marginBottom: 10 }}>
            這頁暫時不見了
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(43,24,16,0.7)', lineHeight: 1.65, marginBottom: 22, fontWeight: 500, letterSpacing: '-0.005em' }}>
            重新整理試試，或回到掃描頁繼續，
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { this.handleReset(); if (typeof window !== 'undefined') window.location.reload() }}
              style={{
                padding: '12px 22px',
                background: 'var(--ink-hex)',
                color: '#FFF6E6',
                border: 'none',
                borderRadius: 9999,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.5px',
                boxShadow: '0 6px 18px -6px rgba(43,24,16,0.4)',
                minHeight: 44,
              }}
            >
              重新整理
            </button>
            <a
              href="/history"
              style={{
                padding: '12px 22px',
                background: 'rgba(255,255,255,0.70)',
                color: 'var(--ink-hex)',
                border: '1.5px solid rgba(43,24,16,0.18)',
                borderRadius: 9999,
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.5px',
                textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                minHeight: 44,
              }}
            >
              回掃描歷史
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
