"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

type Variant = "icon" | "bar"

interface CurtainThemeToggleProps {
  variant?: Variant
  className?: string
}

const STORAGE_KEY = "carecub-theme"

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark") return stored
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    return prefersDark ? "dark" : "light"
  } catch {
    return "light"
  }
}

/**
 * CurtainThemeToggle — 切換 dark/light，搭配 curtain 全螢幕過場
 * 不用 inline TOKENS，靠 documentElement.classList.add/remove("dark")
 * 觸發 CSS variable swap（CareCub globals.css 已備好 .dark token）
 *
 * variant="icon" — fixed top-right 圓形 icon button（推薦）
 * variant="bar"  — inline pill bar（給 header 用）
 */
export function CurtainThemeToggle({
  variant = "icon",
  className,
}: CurtainThemeToggleProps) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [mounted, setMounted] = React.useState(false)
  const [transitioning, setTransitioning] = React.useState(false)
  const [curtainColor, setCurtainColor] = React.useState<string>("#1F1815")

  // hydration safe: 初始化後再讀 localStorage
  React.useEffect(() => {
    const initial = getInitialTheme()
    setTheme(initial)
    document.documentElement.classList.toggle("dark", initial === "dark")
    setMounted(true)
  }, [])

  const toggle = React.useCallback(() => {
    if (transitioning) return
    const next = theme === "light" ? "dark" : "light"
    // curtain 顏色用「目標主題」的 paper，視覺上像把新世界拉進來
    setCurtainColor(next === "dark" ? "#1F1815" : "#F3EEDD")
    setTransitioning(true)

    // 等 curtain 拉滿（260ms）再 swap theme，再讓 curtain 拉開
    window.setTimeout(() => {
      document.documentElement.classList.toggle("dark", next === "dark")
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {}
      setTheme(next)
      window.setTimeout(() => setTransitioning(false), 260)
    }, 260)
  }, [theme, transitioning])

  if (!mounted) {
    // 避免 SSR / hydration mismatch，未 mount 前留 placeholder 佔位
    return variant === "icon" ? (
      <div
        aria-hidden
        className={cn(
          "fixed top-4 right-4 z-[1200] h-11 w-11 rounded-full opacity-0",
          className
        )}
      />
    ) : null
  }

  const isDark = theme === "dark"
  const label = isDark ? "切換成日間模式" : "切換成夜間模式"

  const button =
    variant === "icon" ? (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={cn(
          "fixed top-4 right-4 z-[1200] h-11 w-11 rounded-full",
          "flex items-center justify-center",
          "border transition-all duration-200",
          "hover:scale-105 active:scale-95",
          isDark
            ? "bg-[rgba(42,33,27,0.72)] border-[rgba(223,216,198,0.18)] text-[#FFD78A] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            : "bg-[rgba(255,255,255,0.72)] border-[rgba(43,24,16,0.10)] text-[#2B1810] shadow-[0_8px_24px_rgba(43,24,16,0.12)]",
          "backdrop-blur-xl",
          className
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <Moon size={20} strokeWidth={2.2} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <Sun size={20} strokeWidth={2.2} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    ) : (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center gap-2 h-10 px-4 rounded-full",
          "border transition-all duration-200",
          "text-sm font-bold tracking-tight",
          isDark
            ? "bg-[rgba(42,33,27,0.72)] border-[rgba(223,216,198,0.18)] text-[#FFD78A]"
            : "bg-[rgba(255,255,255,0.72)] border-[rgba(43,24,16,0.10)] text-[#2B1810]",
          "backdrop-blur-xl",
          className
        )}
      >
        {isDark ? <Moon size={16} strokeWidth={2.2} /> : <Sun size={16} strokeWidth={2.2} />}
        <span>{isDark ? "夜間" : "日間"}</span>
      </button>
    )

  return (
    <>
      {button}

      {/* curtain overlay — 從上往下覆蓋再從下往上拉開 */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            key="curtain"
            initial={{ y: "-100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{
              duration: 0.26,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="fixed inset-0 z-[1300] pointer-events-none"
            style={{ background: curtainColor }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default CurtainThemeToggle
