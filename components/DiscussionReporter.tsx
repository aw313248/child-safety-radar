'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  channelId?: string
  channelName: string
  channelUrl: string
  riskScore: number
}

type Mode = 'idle' | 'rating_correction' | 'discussion'
type Status = 'ready' | 'sending' | 'done' | 'error'

// ── 共用 button 樣式 ──────────────────────────────────────────────
const ghostButtonStyle: React.CSSProperties = {
  flex: 1, fontSize: 13, fontWeight: 800, letterSpacing: '0.06em',
  padding: '11px 9px', minHeight: 44,
  background: 'rgba(255,255,255,0.70)',
  border: '1.5px solid rgba(43,24,16,0.18)',
  borderRadius: 14,
  color: 'var(--ink-hex)',
  cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

function submitButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    background: enabled ? 'var(--honey-hex)' : 'rgba(43,24,16,0.10)',
    border: '2px solid var(--ink-hex)',
    borderRadius: 14,
    padding: '9px 18px',
    fontSize: 13, fontWeight: 900, letterSpacing: '0.06em',
    color: 'var(--ink-hex)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit',
    opacity: enabled ? 1 : 0.55,
    boxShadow: enabled ? '2px 2px 0 var(--ink-hex)' : 'none',
    minHeight: 44,
  }
}

interface Discussion {
  id: string
  content: string
  miaRating?: number
  submittedAt: string
}

// Mia 第四輪 P2 #7：空狀態示範討論（真實媽媽視角語氣，標明示範）
// 不影響真實 Notion 留言抓取，真實留言會顯示在示範下方
const DEMO_DISCUSSIONS: { id: string; author: string; content: string }[] = [
  {
    id: 'demo-1',
    author: '小米媽',
    content: '我家小孩 4 歲，看 Bluey 還算靜得下來，但看完還是會跳上跳下，我都搭配戶外活動',
  },
  {
    id: 'demo-2',
    author: '阿珊',
    content: 'Peppa Pig 國語版口音真的很怪，後來改看英文原版反而學了一些字',
  },
  {
    id: 'demo-3',
    author: '小綠媽',
    content: '拿鐵媽媽那篇 5 維度真的有用，我用她的框架自己評估後再給孩子看',
  },
]

// 星等滑桿 1-5 — 鍵盤可調 + 點擊星星
function StarSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }} role="radiogroup" aria-label="你覺得幾顆星">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} 星`}
            name="rating"
            value={n}
            onClick={() => onChange(n)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 4, fontFamily: 'inherit', lineHeight: 1,
              minWidth: 36, minHeight: 36,
            }}
          >
            <span style={{
              fontSize: 26,
              color: n <= value ? '#F2B84B' : 'rgba(43,24,16,0.20)',
              transition: 'color 0.15s',
            }}>★</span>
          </button>
        ))}
      </div>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: 'var(--ink-hex)', letterSpacing: '-0.01em',
      }}>
        {value > 0 ? `${value} / 5` : '尚未選擇'}
      </span>
    </div>
  )
}

export default function DiscussionReporter({ channelId, channelName, channelUrl, riskScore }: Props) {
  const [mode, setMode] = useState<Mode>('idle')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState<Status>('ready')
  const [showToast, setShowToast] = useState<string | null>(null)

  // 討論列表
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  const fetchDiscussions = useCallback(async (cursor: string | null, append: boolean) => {
    if (!channelId) return
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ channelId, limit: '10' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`/api/discussions?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDiscussions(prev => append ? [...prev, ...data.discussions] : data.discussions)
      setNextCursor(data.nextCursor ?? null)
      setHasMore(Boolean(data.hasMore))
    } catch {
      // 安靜失敗 — Notion 可能沒接好，不嚇到使用者
    } finally {
      setLoadingList(false)
    }
  }, [channelId])

  // 打開「補充討論」抽屜時拉留言
  useEffect(() => {
    if (mode === 'discussion' && discussions.length === 0) {
      fetchDiscussions(null, false)
    }
  }, [mode, discussions.length, fetchDiscussions])

  const reset = () => {
    setMode('idle')
    setText('')
    setRating(0)
    setStatus('ready')
  }

  const submit = async () => {
    if (status === 'sending') return
    const content = text.trim()
    if (mode === 'rating_correction') {
      if (rating < 1 || rating > 5) return
      if (content.length < 3) return
    } else {
      if (content.length < 3) return
    }
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode,
          channelId: channelId || '',
          channelName,
          channelUrl,
          riskScore,
          miaRating: mode === 'rating_correction' ? rating : undefined,
          miaComment: content.slice(0, 1000),
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')

      if (mode === 'discussion') {
        // 即時 append 到列表上方
        const newItem: Discussion = {
          id: `local-${Date.now()}`,
          content,
          submittedAt: new Date().toISOString(),
        }
        setDiscussions(prev => [newItem, ...prev])
        setText('')
        setShowToast('✓ 謝謝你的回饋，我們會持續改進')
        setStatus('ready')
      } else {
        setShowToast('✓ 謝謝你的回饋，我們會持續改進')
        // 收起 accordion
        setTimeout(() => { reset() }, 1500)
      }
      // Mia 第四輪 P1 #4：toast 2 秒自動消失（原本 3 秒）
      setTimeout(() => setShowToast(null), 2000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="stagger-4" style={{
      background: 'rgba(255,255,255,0.50)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.80)',
      borderRadius: 20,
      padding: mode === 'idle' ? '14px 16px' : '16px',
      boxShadow: '0 2px 12px rgba(43,24,16,0.05), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>
      {/* Toast — Mia 第四輪 P1 #4：300ms 漸入 + 2 秒自動消失 */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            background: 'rgba(74,138,92,0.10)',
            border: '1px solid rgba(74,138,92,0.25)',
            borderRadius: 12,
            fontSize: 13, fontWeight: 700,
            color: 'var(--risk-green)', letterSpacing: '-0.01em',
            animation: 'cc-toast-fade-in 0.3s ease-out',
          }}
        >
          {showToast}
        </div>
      )}
      <style jsx>{`
        @keyframes cc-toast-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* idle：兩顆按鈕 */}
      {mode === 'idle' && (
        <>
          <p style={{
            fontSize: 13, color: 'rgba(43,24,16,0.65)',
            lineHeight: 1.55, letterSpacing: '-0.01em',
            marginBottom: 10, textAlign: 'center', fontWeight: 500,
          }}>
            覺得這次評分不準，或想看別的家長怎麼說，
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('rating_correction')} style={ghostButtonStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              評分有誤
            </button>
            <button onClick={() => setMode('discussion')} style={ghostButtonStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              補充討論
            </button>
          </div>
        </>
      )}

      {/* rating_correction：滑桿 + 文字框 */}
      {mode === 'rating_correction' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.01em' }}>
              你覺得這頻道整體幾顆星
            </p>
            <button onClick={reset} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'rgba(43,24,16,0.55)', letterSpacing: '-0.01em',
              fontFamily: 'inherit', padding: 4,
            }}>
              取消
            </button>
          </div>

          <StarSlider value={rating} onChange={setRating} />

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="為什麼這樣覺得，舉個例子幫評分模型變更準"
            rows={3}
            maxLength={1000}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(43,24,16,0.15)',
              borderRadius: 12,
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--ink-hex)',
              letterSpacing: '-0.01em',
              lineHeight: 1.55,
              resize: 'vertical',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(43,24,16,0.45)', letterSpacing: '-0.01em' }}>
              {text.length}/1000
            </span>
            <button
              onClick={submit}
              disabled={rating < 1 || text.trim().length < 3 || status === 'sending'}
              style={submitButtonStyle(rating > 0 && text.trim().length >= 3 && status !== 'sending')}
            >
              {status === 'sending' ? '送出中' : '送出'}
            </button>
          </div>

          {status === 'error' && (
            <p style={{ fontSize: 12, color: 'var(--terra-hex)', letterSpacing: '-0.01em', fontWeight: 600 }}>
              送出失敗，再試一次
            </p>
          )}
        </div>
      )}

      {/* discussion：留言列表 + 新增 */}
      {mode === 'discussion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-hex)', letterSpacing: '-0.01em' }}>
              其他家長的討論
            </p>
            <button onClick={reset} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'rgba(43,24,16,0.55)', letterSpacing: '-0.01em',
              fontFamily: 'inherit', padding: 4,
            }}>
              收起
            </button>
          </div>

          {/* 留言列表 */}
          {/* Mia 第四輪 P2 #7：空狀態顯示 3 筆示範討論，不阻擋真實留言 */}
          {discussions.length === 0 && !loadingList && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.45)', letterSpacing: '0.01em', fontWeight: 600 }}>
                示範討論 · 等真實討論累積中
              </p>
              {DEMO_DISCUSSIONS.map(d => (
                <div key={d.id} style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.45)',
                  border: '1px dashed rgba(43,24,16,0.15)',
                  borderRadius: 12,
                }}>
                  <p style={{
                    fontSize: 13, color: 'rgba(43,24,16,0.78)',
                    letterSpacing: '-0.005em', lineHeight: 1.55, fontWeight: 500,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {d.content}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.45)', letterSpacing: '-0.01em', marginTop: 4 }}>
                    — {d.author}（示範）
                  </p>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'rgba(43,24,16,0.55)', letterSpacing: '-0.01em', textAlign: 'center', padding: '8px 0 4px' }}>
                成為第一個真實分享
              </p>
            </div>
          )}
          {loadingList && discussions.length === 0 && (
            <p style={{ fontSize: 13, color: 'rgba(43,24,16,0.55)', letterSpacing: '-0.01em', textAlign: 'center', padding: '14px 0' }}>
              載入中
            </p>
          )}
          {discussions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {discussions.map(d => (
                <div key={d.id} style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(43,24,16,0.08)',
                  borderRadius: 12,
                }}>
                  <p style={{
                    fontSize: 13, color: 'var(--ink-hex)',
                    letterSpacing: '-0.005em', lineHeight: 1.55, fontWeight: 500,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {d.content}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(43,24,16,0.45)', letterSpacing: '-0.01em', marginTop: 4 }}>
                    {new Date(d.submittedAt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
          {hasMore && (
            <button
              onClick={() => fetchDiscussions(nextCursor, true)}
              disabled={loadingList}
              style={{
                alignSelf: 'center',
                background: 'transparent', border: '1px solid rgba(43,24,16,0.18)',
                borderRadius: 9999, padding: '6px 14px',
                fontSize: 12, fontWeight: 700, color: 'var(--ink-hex)',
                letterSpacing: '0.04em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {loadingList ? '載入中' : '載更多'}
            </button>
          )}

          {/* 新增留言 */}
          <div style={{
            borderTop: '1px dashed rgba(43,24,16,0.12)',
            paddingTop: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="貼 Threads / PTT / Dcard / 新聞連結，或寫下你的觀察"
              rows={3}
              maxLength={1000}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.70)',
                border: '1px solid rgba(43,24,16,0.15)',
                borderRadius: 12,
                padding: '10px 12px',
                fontFamily: 'inherit',
                fontSize: 13, color: 'var(--ink-hex)',
                letterSpacing: '-0.01em', lineHeight: 1.55,
                resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(43,24,16,0.45)' }}>
                {text.length}/1000
              </span>
              <button
                onClick={submit}
                disabled={text.trim().length < 3 || status === 'sending'}
                style={submitButtonStyle(text.trim().length >= 3 && status !== 'sending')}
              >
                {status === 'sending' ? '送出中' : '送出討論'}
              </button>
            </div>
            {status === 'error' && (
              <p style={{ fontSize: 12, color: 'var(--terra-hex)', letterSpacing: '-0.01em', fontWeight: 600 }}>
                送出失敗，再試一次
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
