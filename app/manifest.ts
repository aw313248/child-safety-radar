import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CareCub Kids — 20 秒看穿卡通藏什麼',
    short_name: 'CareCub Kids',
    description: '貼上 YouTube 網址，AI 看完影片跟留言，告訴你能不能給小孩看',
    start_url: '/',
    display: 'standalone',
    background_color: '#F3EEDD',
    theme_color: '#F2B84B',
    orientation: 'portrait-primary',
    lang: 'zh-TW',
    categories: ['education', 'parenting', 'kids', 'utilities'],
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
