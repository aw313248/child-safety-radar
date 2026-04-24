'use client'

import { useState } from 'react'

interface Props {
  channelName: string
  channelUrl: string
  riskScore: number
}

type Mode = 'idle' | 'report' | 'discussion'
type Status = 'ready' | 'sending' | 'done' | 'error'

export default function DiscussionReporter({ channelName, channelUrl, riskScore }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<Status>('ready')

  const submit = async () => {
    if (!text.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          channelName,
          channelUrl,
          riskScore,
          content: text.trim().slice(0, 1000),
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
      setText('')
      setTimeout(() => { setMode('idle'); setStatus('ready') }, 2500)
    } catch {
      setStatus('error')
    }
  }

  // 成功狀態
  if (status === 'done') {
    return (
      <div className="stagger-4" style={{
        background: 'rgba(22,163,74,0.06)',
        border: '1px solid rgba(22,163,74,0.18)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: 'var(--risk-green)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          收到了，謝謝你
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, letterSpacing: '-0.01em' }}>
          你的回饋會讓評分模型更準
        </p>
      </div>
    )
  }

  // 輸入表單
  if (mode !== 'idle') {
    const placeholder = mode === 'report'
      ? '這個頻道其實是⋯⋯，評分應該是⋯⋯'
      : '貼 Threads / PTT / Dcard / 新聞連結（可多個，一行一個）'

    return (
      <div className="card stagger-4" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {mode === 'report' ? '回報評分有誤' : '補充家長討論'}
          </p>
          <button
            onClick={() => { setMode('idle'); setText(''); setStatus('ready') }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '-0.01em',
            }}
          >
            取消
          </button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={1000}
          style={{
            width: '100%',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            fontFamily: 'inherit',
            fontSize: 13,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {text.length}/1000
          </span>
          <button
            onClick={submit}
            disabled={!text.trim() || status === 'sending'}
            className="btn-primary"
            style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}
          >
            {status === 'sending' ? '傳送中' : '送出'}
          </button>
        </div>

        {status === 'error' && (
          <p style={{ fontSize: 11, color: 'var(--risk-red)', marginTop: 8, letterSpacing: '-0.01em' }}>
            送出失敗，請再試一次
          </p>
        )}
      </div>
    )
  }

  // 預設：兩顆按鈕
  return (
    <div className="stagger-4" style={{
      background: 'rgba(15,23,42,0.025)',
      border: '1px dashed var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, letterSpacing: '-0.01em', marginBottom: 10, textAlign: 'center' }}>
        覺得這次評分不準，或看過家長討論？
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('report')}
          className="btn-secondary"
          style={{ flex: 1, fontSize: 12, padding: '9px', letterSpacing: '-0.01em' }}
        >
          🚩 評分有誤
        </button>
        <button
          onClick={() => setMode('discussion')}
          className="btn-secondary"
          style={{ flex: 1, fontSize: 12, padding: '9px', letterSpacing: '-0.01em' }}
        >
          💬 補充討論
        </button>
      </div>
    </div>
  )
}
