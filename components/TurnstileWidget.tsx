'use client'

import { Turnstile } from '@marsidev/react-turnstile'

interface Props {
  onSuccess: (token: string) => void
  onExpire: () => void
}

// Cloudflare Turnstile 人機驗證元件
// siteKey 從 NEXT_PUBLIC_TURNSTILE_SITE_KEY 讀（公開，前端安全）
// 驗證結果 token 傳給後端 /api/analyze 做 server-side 驗證
export default function TurnstileWidget({ onSuccess, onExpire }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return null

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onSuccess}
      onExpire={onExpire}
      options={{
        theme: 'light',
        size: 'invisible', // 背景靜默驗，通常 0 秒，只有可疑流量才跳 challenge
      }}
    />
  )
}
