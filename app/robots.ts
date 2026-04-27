import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/share/'],
      },
    ],
    sitemap: 'https://child-safety-radar.vercel.app/sitemap.xml',
    host: 'https://child-safety-radar.vercel.app',
  }
}
