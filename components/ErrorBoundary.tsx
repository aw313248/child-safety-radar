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
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            color: 'var(--cc-red-deep)', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            ★ 系統凸槌了 ★
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.03em', marginBottom: 8 }}>
            這邊壞掉了
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(43,24,16,0.7)', lineHeight: 1.55, marginBottom: 18, fontWeight: 500 }}>
            重新整理應該會修好
            <br />
            一直壞請告訴我們
          </p>
          <button
            onClick={() => { this.handleReset(); if (typeof window !== 'undefined') window.location.reload() }}
            style={{
              padding: '12px 24px',
              background: 'var(--ink-hex)',
              color: '#FFF6E6',
              border: 'none',
              borderRadius: 9999,
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              boxShadow: '0 6px 18px -6px rgba(43,24,16,0.4)',
            }}
          >
            重新整理
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
