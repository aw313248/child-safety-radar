"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  PARENT_EDUCATION_TEXTS,
  getBadgeLabel,
  type EducationEntry,
} from "@/lib/parentEducationTexts"

/**
 * CircularTestimonials — 圓形機構徽章引用 carousel
 *
 * 法律 anchor：零真實照片（Path A + C）
 * 用機構徽章（WHO / AAP / CSM / ZTT / Lovevery / 安兒康 / 未來親子 / CNBC / 親子天下 / Kidsburgh）
 * + 引用 quote + source URL 取代真人頭像，避開肖像權風險
 *
 * 設計：
 * - 圓形 1.5px ink border + 暖白底 + 中文/英文機構名置中
 * - category color：screenTime = honey / development = terra / practical = riskGreen
 * - 用 CareCub token: var(--paper-hex), var(--ink-hex), var(--honey-hex), var(--terra-hex)
 * - dark mode 自動 swap（用 token 不 hardcode）
 *
 * NOTE：isolated 不主動整合進任何頁面，等 Oscar 決定哪頁要用再 import
 */

export interface Testimonial {
  quote: string
  source: string
  sourceUrl: string
  category: "screenTime" | "development" | "practical"
}

/** PR #17 11 段教育文本 → Testimonial[] adapter */
export function eduEntryToTestimonial(e: EducationEntry): Testimonial {
  return {
    quote: e.text,
    source: e.source,
    sourceUrl: e.url,
    category: e.category,
  }
}

/** 預設 testimonials = PR #17 11 段教育文本 */
export const DEFAULT_TESTIMONIALS: Testimonial[] = PARENT_EDUCATION_TEXTS.map(
  eduEntryToTestimonial
)

interface CircularTestimonialsProps {
  testimonials?: Testimonial[]
  /** 自動播放間隔 ms，0 = 關閉 */
  autoplay?: number
  className?: string
}

/** category → 配色 mapping，全部走 token */
const categoryColor: Record<
  Testimonial["category"],
  { bg: string; ring: string; tag: string; tagLabel: string }
> = {
  screenTime: {
    bg: "var(--honey-hex)",
    ring: "var(--honey-deep, #FB8500)",
    tag: "var(--honey-deep, #FB8500)",
    tagLabel: "螢幕時間",
  },
  development: {
    bg: "var(--terra-hex)",
    ring: "var(--terra-hex)",
    tag: "var(--terra-hex)",
    tagLabel: "發展研究",
  },
  practical: {
    // riskGreen — 用既有 token 沒有專屬綠時 fallback 一個穩定值
    bg: "var(--risk-green, #4F8A3F)",
    ring: "var(--risk-green, #4F8A3F)",
    tag: "var(--risk-green, #4F8A3F)",
    tagLabel: "實戰建議",
  },
}

export function CircularTestimonials({
  testimonials = DEFAULT_TESTIMONIALS,
  autoplay = 6000,
  className,
}: CircularTestimonialsProps) {
  const [active, setActive] = React.useState(0)
  const [hovered, setHovered] = React.useState(false)
  const total = testimonials.length

  const next = React.useCallback(
    () => setActive((i) => (i + 1) % total),
    [total]
  )
  const prev = React.useCallback(
    () => setActive((i) => (i - 1 + total) % total),
    [total]
  )

  // autoplay — hover 暫停
  React.useEffect(() => {
    if (!autoplay || hovered || total <= 1) return
    const id = setInterval(next, autoplay)
    return () => clearInterval(id)
  }, [autoplay, hovered, next, total])

  if (total === 0) return null

  return (
    <section
      className={cn(
        "w-full max-w-3xl mx-auto px-6 py-10",
        "rounded-3xl",
        className
      )}
      style={{
        background: "var(--paper-hex)",
        border: "1px solid var(--border-soft)",
        boxShadow: "var(--shadow-card)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-roledescription="carousel"
      aria-label="家長教育引用 carousel"
    >
      <div className="flex flex-col items-center gap-6">
        {/* badge — 圓形機構徽章 carousel */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {testimonials.map((t, i) =>
              i === active ? (
                <motion.div
                  key={t.source + i}
                  initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.85, rotate: 8 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <InstitutionBadge testimonial={t} />
                </motion.div>
              ) : null
            )}
          </AnimatePresence>
        </div>

        {/* category tag */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`tag-${active}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs tracking-[0.18em] uppercase font-bold"
            style={{ color: categoryColor[testimonials[active].category].tag }}
          >
            {categoryColor[testimonials[active].category].tagLabel}
          </motion.div>
        </AnimatePresence>

        {/* quote */}
        <div className="min-h-[8rem] w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={`quote-${active}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center text-[15px] md:text-base leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            >
              <span aria-hidden className="select-none">「</span>
              {testimonials[active].quote}
              <span aria-hidden className="select-none">」</span>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        {/* source + link */}
        <AnimatePresence mode="wait">
          <motion.a
            key={`source-${active}`}
            href={testimonials[active].sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              "transition-opacity hover:opacity-100 opacity-70",
              "underline-offset-4 hover:underline"
            )}
            style={{ color: "var(--text-secondary)" }}
          >
            <span>出處：{testimonials[active].source}</span>
            <ExternalLink size={11} strokeWidth={2} />
          </motion.a>
        </AnimatePresence>

        {/* nav controls */}
        <div className="flex items-center gap-4 mt-2">
          <button
            type="button"
            onClick={prev}
            aria-label="上一則引用"
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              "transition-all duration-200",
              "hover:scale-110 active:scale-95"
            )}
            style={{
              border: "1.5px solid var(--ink-hex)",
              color: "var(--ink-hex)",
              background: "transparent",
            }}
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>

          {/* dots */}
          <div className="flex items-center gap-1.5" role="tablist">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`第 ${i + 1} 則，共 ${total} 則`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === active ? "w-6" : "w-1.5"
                )}
                style={{
                  background:
                    i === active
                      ? "var(--ink-hex)"
                      : "var(--ink-20, rgba(0,0,0,0.2))",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="下一則引用"
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              "transition-all duration-200",
              "hover:scale-110 active:scale-95"
            )}
            style={{
              border: "1.5px solid var(--ink-hex)",
              color: "var(--ink-hex)",
              background: "transparent",
            }}
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </section>
  )
}

/** 圓形機構徽章 — 1.5px ink border + 暖白底 + 機構簡稱置中 */
function InstitutionBadge({ testimonial }: { testimonial: Testimonial }) {
  const label = getBadgeLabel(testimonial.source)
  const palette = categoryColor[testimonial.category]
  // 中文 3-4 字壓小一級，避免溢出
  const isCJK = /[一-鿿]/.test(label)
  const fontSize =
    isCJK
      ? label.length >= 4
        ? "0.95rem"
        : "1.1rem"
      : label.length >= 4
        ? "1rem"
        : "1.25rem"

  return (
    <div className="relative w-32 h-32">
      {/* 外環 glow — category 色 */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-xl opacity-40"
        style={{ background: palette.ring }}
      />
      {/* 主徽章圓 */}
      <div
        className={cn(
          "relative w-32 h-32 rounded-full flex flex-col items-center justify-center",
          "transition-transform duration-300"
        )}
        style={{
          background: "var(--paper-hex)",
          border: "1.5px solid var(--ink-hex)",
          boxShadow: `0 4px 14px ${palette.ring}33, var(--sticker-shadow, 3px 3px 0 var(--ink-hex))`,
        }}
      >
        {/* 上方雙線標 category 色 */}
        <div className="flex flex-col items-center gap-0.5 mb-1">
          <span
            aria-hidden
            className="block w-6 h-px"
            style={{ background: palette.ring }}
          />
          <span
            aria-hidden
            className="block w-4 h-px"
            style={{ background: palette.ring }}
          />
        </div>
        {/* 機構簡稱 */}
        <span
          className="font-bold leading-none tracking-wide"
          style={{
            color: "var(--ink-hex)",
            fontSize,
          }}
        >
          {label}
        </span>
        {/* 下方雙線標 */}
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <span
            aria-hidden
            className="block w-4 h-px"
            style={{ background: palette.ring }}
          />
          <span
            aria-hidden
            className="block w-6 h-px"
            style={{ background: palette.ring }}
          />
        </div>
      </div>
    </div>
  )
}

export default CircularTestimonials
