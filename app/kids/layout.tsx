import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '熊熊守護模式 · CareCub Kids',
  description: '只有爸媽驗證過的頻道，沒有推薦、沒有搜尋，放心交給小孩',
}

export default function KidsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
