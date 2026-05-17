"use client"

import * as React from "react"
import { Home, Film, Shield, Share2, Heart, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GradientMenuItem {
  title: string
  icon: LucideIcon
  /** Tailwind gradient classes, e.g. "from-[#FFD78A] to-[#E5B560]" */
  gradientFrom: string
  gradientTo: string
  onClick?: () => void
  href?: string
}

interface GradientMenuProps {
  items?: GradientMenuItem[]
  className?: string
}

/**
 * GradientMenu — hover 展開 + 5 色 gradient 漸層 menu
 *
 * Fancy 視覺：hover w-14 → w-48 expand transition、blur glow、uppercase tracking
 * 用 CareCub token: bg 走 var(--paper-hex)，dark mode 自動 swap
 *
 * NOTE：isolated 不主動整合進任何頁面，等 Oscar 決定哪頁要用再 import
 * （三色內鐵則對 user-facing UI 強制，這個 component 是 OPTIONAL fancy library）
 */
export const DEFAULT_GRADIENT_MENU_ITEMS: GradientMenuItem[] = [
  {
    title: "首頁",
    icon: Home,
    gradientFrom: "#FFD78A",
    gradientTo: "#E5B560",
  },
  {
    title: "熊熊模式",
    icon: Heart,
    gradientFrom: "#a955ff",
    gradientTo: "#ea51ff",
  },
  {
    title: "掃描歷史",
    icon: Film,
    gradientFrom: "#56CCF2",
    gradientTo: "#2F80ED",
  },
  {
    title: "黑名單",
    icon: Shield,
    gradientFrom: "#FF9966",
    gradientTo: "#FF5E62",
  },
  {
    title: "分享",
    icon: Share2,
    gradientFrom: "#80FF72",
    gradientTo: "#7EE8FA",
  },
]

export function GradientMenu({
  items = DEFAULT_GRADIENT_MENU_ITEMS,
  className,
}: GradientMenuProps) {
  return (
    <ul
      className={cn(
        "flex items-center justify-center gap-4 p-4 rounded-3xl",
        className
      )}
      style={{
        background: "var(--paper-hex)",
      }}
    >
      {items.map((item, idx) => {
        const Icon = item.icon
        const gradientStyle = {
          backgroundImage: `linear-gradient(to bottom right, ${item.gradientFrom}, ${item.gradientTo})`,
        }
        return (
          <li
            key={item.title + idx}
            style={gradientStyle}
            className={cn(
              "group/item relative cursor-pointer overflow-hidden",
              "rounded-full text-white shadow-lg",
              "flex items-center h-14",
              // hover expand：w-14 → w-48
              "w-14 hover:w-48",
              "transition-[width] duration-500 ease-out"
            )}
            onClick={item.onClick}
          >
            {/* blur glow effect */}
            <span
              aria-hidden
              style={gradientStyle}
              className={cn(
                "absolute inset-0 -z-10 blur-2xl opacity-0",
                "transition-opacity duration-500 ease-out",
                "group-hover/item:opacity-70"
              )}
            />

            {/* icon container — 固定置左 */}
            <span
              className={cn(
                "flex items-center justify-center w-14 h-14 shrink-0",
                "transition-transform duration-500 ease-out",
                "group-hover/item:scale-110"
              )}
            >
              <Icon size={22} strokeWidth={2.2} />
            </span>

            {/* label — hover 才浮現 */}
            <span
              className={cn(
                "whitespace-nowrap uppercase tracking-wide text-xs font-bold pr-5",
                "opacity-0 -translate-x-2",
                "transition-all duration-500 ease-out",
                "group-hover/item:opacity-100 group-hover/item:translate-x-0"
              )}
            >
              {item.title}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default GradientMenu
