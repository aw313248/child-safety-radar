import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import readingTime from 'reading-time'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  category: string
  readingMinutes: number
}

export interface Post extends PostMeta {
  contentHtml: string
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
}

export function getAllPosts(): PostMeta[] {
  return getAllPostSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), 'utf8')
      const { data, content } = matter(raw)
      return {
        slug,
        title: data.title || slug,
        description: data.description || '',
        date: data.date || '',
        category: data.category || '未分類',
        readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const processed = await remark().use(html).process(content)
  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || '',
    category: data.category || '未分類',
    readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
    contentHtml: processed.toString(),
  }
}
