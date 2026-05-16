"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FabAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  /** 可選：自訂顏色 (CSS color string)；不指定則用 token 預設 */
  color?: string
}

interface FloatingActionMenuProps {
  actions: FabAction[]
  /** 位置：預設右下 */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  /** 主按鈕 icon */
  icon?: React.ReactNode
  /** 額外 className */
  className?: string
  /** 主按鈕 aria-label */
  label?: string
}

const positionClassMap: Record<NonNullable<FloatingActionMenuProps["position"]>, string> = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
}

/**
 * FloatingActionMenu — radial / stacked FAB
 * 完全靠 CSS variable (var(--honey-hex) / var(--ink-hex) ...) 上色
 * dark mode 下自動跟 globals.css .dark token 走
 *
 * NOTE：目前 isolated 不主動整合進任何頁面，等 Oscar 決定哪頁要用再 import
 */
export function FloatingActionMenu({
  actions,
  position = "bottom-right",
  icon,
  className,
  label = "更多動作",
}: FloatingActionMenuProps) {
  const [open, setOpen] = React.useState(false)

  // 點外部關閉
  React.useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-fab-root]")) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  // Esc 關閉
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div
      data-fab-root
      className={cn(
        "fixed z-[1100] flex flex-col-reverse items-end gap-3",
        positionClassMap[position],
        className
      )}
    >
      {/* 子項目 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
              closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
            }}
            className="flex flex-col-reverse items-end gap-3"
          >
            {actions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.label + i}
                  variants={{
                    open: { opacity: 1, y: 0, scale: 1 },
                    closed: { opacity: 0, y: 14, scale: 0.92 },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 24,
                  }}
                  className="flex items-center gap-3"
                >
                  <span
                    className="px-3 py-1.5 rounded-full text-xs font-bold tracking-tight whitespace-nowrap"
                    style={{
                      background: "var(--card-hex)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-soft)",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    {action.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      action.onClick()
                      setOpen(false)
                    }}
                    aria-label={action.label}
                    className="h-11 w-11 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                    style={{
                      background: action.color ?? "var(--honey-hex)",
                      color: "var(--paper-hex)",
                      border: "1px solid var(--border-soft)",
                      boxShadow: "var(--shadow-lift)",
                    }}
                  >
                    {Icon ? <Icon size={18} strokeWidth={2.2} /> : null}
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主按鈕 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center",
          "transition-transform duration-200 hover:scale-105 active:scale-95"
        )}
        style={{
          background: "var(--honey-hex)",
          color: "var(--paper-hex)",
          border: "1px solid var(--border-soft)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="flex items-center justify-center"
        >
          {icon ?? <Plus size={22} strokeWidth={2.4} />}
        </motion.span>
      </button>
    </div>
  )
}

export default FloatingActionMenu
