'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { AnalysisResult } from '@/types/analysis'

interface Props {
  result: AnalysisResult
  onClose: () => void
}

// 精簡結果到能塞進 URL 的最小集合，避免太長
function encodeResultToUrl(r: AnalysisResult): string {
  const core = {
    n: r.channelName,
    u: r.channelUrl,
    s: r.riskScore,
    l: r.riskLevel,
    t: r.channelThumbnail,
    sum: (r.aiSummary || '').slice(0, 240),
    rec: (r.recommendation || '').slice(0, 180),
    at: r.checkedAt,
  }
  const json = JSON.stringify(core)
  const b64 = typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export default function ShareQRModal({ result, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const data = encodeResultToUrl(result)
    const url = `${window.location.origin}/share?d=${data}`
    setShareUrl(url)
    QRCode.toDataURL(url, {
      width: 440,
      margin: 1,
      color: { dark: '#0A0A0A', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(console.error)
  }, [result])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10,10,10,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fade-scale-in 0.25s var(--ease-out)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#FFFFFF',
          borderRadius: 28,
          padding: '28px 24px 24px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.24)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
              marginBottom: 6,
            }}>
              傳給另一台裝置
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
              用手機相機掃，或複製連結貼給另一半
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--ink-05)', border: 'none',
              cursor: 'pointer', fontSize: 18, color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >×</button>
        </div>

        <div style={{
          background: 'var(--paper-hex)',
          border: '1px solid var(--border-soft)',
          borderRadius: 20,
          padding: 16,
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'center',
        }}>
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="分享 QR"
              width={220}
              height={220}
              style={{ display: 'block', borderRadius: 8 }}
            />
          ) : (
            <div style={{ width: 220, height: 220, background: 'var(--ink-05)', borderRadius: 8 }} />
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'var(--ink-05)',
          borderRadius: 12,
          marginBottom: 14,
        }}>
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.005em',
          }}>
            {shareUrl}
          </span>
          <button
            onClick={copy}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 9999,
              background: 'var(--ink-hex)',
              color: '#fff',
              border: 'none',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {copied ? '已複製' : '複製'}
          </button>
        </div>

        <p style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          letterSpacing: '-0.01em',
          lineHeight: 1.55,
          textAlign: 'center',
        }}>
          結果藏在連結裡，不經過伺服器，<br />
          點開就能看到，不需要帳號
        </p>
      </div>
    </div>
  )
}
