/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // 防 clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // 防 MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 強制 HTTPS
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // 限制 referrer 外洩
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 限制瀏覽器功能（攝影機、麥克風、地理位置都關）
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP：只允許自身來源 + YouTube embed + Google Fonts + Gemini/YouTube API
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // inline style 讓 Next.js 正常運作；unsafe-eval 讓 dev HMR 用，prod 可移除
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // YouTube 播放器 embed
              "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
              // YouTube / Google API + Lemon Squeezy
              "connect-src 'self' https://www.googleapis.com https://api.lemonsqueezy.com",
              // 頻道縮圖來源
              "img-src 'self' data: https://yt3.ggpht.com https://yt3.googleusercontent.com https://i.ytimg.com",
            ].join('; '),
          },
        ],
      },
      // API 路由額外限制：不快取敏感 endpoint
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
