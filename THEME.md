# CareCub Hearth

Golden Hour 家族變體，為兒童安全產品微調，
溫暖如壁爐、可信賴、不刺眼，主畫面（淺）跟熊熊守護模式（深）共用同一組 token

---

## Color Palette

### 主色 — Brand Anchor
| 角色 | Hex | CSS var | 用法 |
|------|-----|---------|------|
| Honey Gold（蜂蜜金） | `#F2B84B` | `--cc-gold` | 主要 CTA、徽章、active 狀態 |
| Honey Deep（深金） | `#D99422` | `--cc-gold-deep` | 金色漸層收尾、icon stroke |
| Cape Red（披風紅） | `#C2413B` | `--cc-red` / `--terra-hex` | 警示、CC 角色披風、emphasis 字 |
| Cape Red Deep（血紅） | `#8E2A24` | `--cc-red-deep` | hover、深陰影、night-sky 背景暈 |
| Deep Cocoa（深可可） | `#2B1810` | `--ink-hex` | 文字、border、所有 sticker offset shadow |

### 中性 — Surface
| 角色 | Hex | CSS var | 用法 |
|------|-----|---------|------|
| Paper Cream（奶油米） | `#F3EEDD` | `--paper-hex` | 主畫面背景 |
| Card Cream（卡片底） | `#FBF7EA` | `--card-hex` | 卡片、輸入框底 |
| Cream Highlight | `#FFF6E6` | — | 高光、頭像球面光 |

### 次色 — Accent
| 角色 | Hex | 用法 |
|------|-----|------|
| Hero Navy | `#1E3A5F` / `--cc-navy` | 西裝色、深色版次要文字 |
| Night Sky | `#0F2444` / `--cc-navy-deep` | 熊熊守護模式背景漸層 |
| Sky Blue | `#8ECAE6` / `--cc-sky` | 點綴星光 |
| Risk Green | `#7AB87E` | 安全綠燈 |

### 風險燈號
| 燈號 | Hex |
|------|-----|
| 🟢 安全 | `#7AB87E` |
| 🟡 留意 | `#F2B84B`（同 honey） |
| 🔴 警告 | `#C2413B`（同 cape red） |

---

## Typography

- **Display（標題）**: `var(--font-display)` — 系統襯線/極粗黑體 fallback，font-weight 900，letter-spacing -0.045em
- **Body（內文）**: Noto Sans TC + system stack，font-weight 400/500/700
- **Numeric（分數）**: ui-monospace, "SF Mono", Menlo

---

## Surface Language

- 圓角：卡片 24-28px、按鈕 pill `9999px`、icon 圖示鈕 50%
- Border：所有可互動元件 `2-2.5px solid var(--ink-hex)`
- Shadow：**厚實墨黑 offset**（不要軟陰影）
  - 預設 `3px 3px 0 var(--ink-hex)`
  - hover `5px 5px 0 var(--ink-hex)`
  - active `1px 1px 0 var(--ink-hex)`
- 卡片大尺寸 `6px 6px 0 rgba(43,24,16,0.92)`

---

## Motion

- Easing：`cubic-bezier(0.22, 1, 0.36, 1)` —— 蘋果風 ease-out-quint
- Duration：互動回饋 150ms、狀態切換 200-300ms、入場 500-700ms
- Reduced motion：`@media (prefers-reduced-motion: reduce)` 全部 fallback

---

## Voice

- 文案結尾用「，」或不收，**不要句號**
- 稱呼用「小朋友」「爸媽」「熊熊」，不要「使用者」「客戶」
- 數字 + 單位之間留半形空格：`20 秒`、`3-6 歲`

---

## Theme Family

**Golden Hour（warm autumn）** — 對應 theme-factory 既有主題第 5 號
為兒童安全產品做的微調：把 mustard 推亮成 honey、加入披風紅作為品牌記憶點、深可可取代純黑來軟化文字
