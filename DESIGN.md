# CareCub Hearth — Design System

Golden Hour 家族變體，為兒童安全產品微調。
溫暖如壁爐、可信賴、不刺眼，主畫面跟熊熊守護模式共用同一組 token。

---

## 1. Color

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

### 風險燈號（語意色）
| 燈號 | Hex | 詞彙 |
|------|-----|------|
| 🟢 安全 | `#7AB87E` | 可以看 |
| 🟡 留意 | `#F2B84B` | 留意 |
| 🔴 警告 | `#C2413B` | 別給看 |

### 選取色
`::selection` 用 `--cc-gold` 底 + `--ink-hex` 字（細節劇場）

---

## 2. Typography

### 字體
- **Display + Body**: `Noto Sans TC` 變數字型，subsets latin，weights 400/500/700/900
- **Numeric**: `ui-monospace, "SF Mono", Menlo` 給分數、金額、計時
- **Tabular figures** 全站開啟：`font-feature-settings: 'tnum' on, 'lnum' on, 'ss01' on`

### 字重層級（嚴格遵守）
| 層級 | weight | 場景 |
|------|--------|------|
| 900 | 唯一 | Hero h1 「這個卡通安全嗎？」 |
| 800 | 區段大標 / 主 CTA 文字 / 步驟標題 |
| 700 | 子標題 / chip / 重要小字 |
| 600 | 次要強調 |
| 500 | 內文 / helper / 副標 |
| 400 | 純說明文字 |

### 字距
- Display：`-0.045em` 至 `-0.05em`
- 內文：`-0.005em` 至 `-0.01em`
- ALL CAPS / 標籤：`+0.04em` 至 `+0.18em`

---

## 3. Surface Language

### 圓角
- 卡片大：`24-28px`
- 卡片小：`14-16px`
- 按鈕 pill：`9999px`
- icon 圖示鈕：`50%`
- Double-Bezel 同心圓：外 30 / 內 24

### Border
- 所有可互動元件 `2-2.5px solid var(--ink-hex)`
- 不用 `1.5px`（uncommitted weight）
- Hairline ring：`1px solid rgba(43,24,16,0.06)` 用於玻璃 tray 外殼

### Shadow（兩套語言並行）
**Sticker（厚實墨黑 offset）** — sticker-* / chip-* / bee-card 用：
```
預設 3px 3px 0 var(--ink-hex)
hover 5px 5px 0 var(--ink-hex)
active 1px 1px 0 var(--ink-hex)
大卡 6px 6px 0 rgba(43,24,16,0.92)
```

**Atmospheric（柔和 depth）** — glass-* / hero / 主畫面卡 用：
```
0 14px 36px -16px rgba(43,24,16,0.18)
inset 0 1px 0 rgba(255,255,255,0.7)
0 22px 40px -28px rgba(43,24,16,0.22)
```

兩套不混用：sticker 給「童趣 / 貼紙」，glass 給「精品 / 機械」

### Spacing scale
4 / 6 / 8 / 10 / 12 / 14 / 18 / 22 / 28 / 40 / 56 / 64 px

---

## 4. Motion

### Easing
- 主曲線：`cubic-bezier(0.22, 1, 0.36, 1)` — 蘋果風 ease-out-quint
- 進場：`cubic-bezier(0.16, 1, 0.3, 1)` — ease-out-expo
- 永遠不用 bounce / elastic

### Duration
| 用途 | ms |
|------|------|
| 即時回饋（按鈕 press、toggle） | 100-150 |
| 狀態切換（hover、menu open） | 200-300 |
| 進場（page load、modal） | 500-700 |
| Cinematic 環境動效 | 2000-2400 |
| Confetti 一次性 | 600-700 |

### 唯一可動 properties
`transform` + `opacity` + `box-shadow`（限 GPU-safe）
**禁止** 動 width / height / top / left / margin / padding

### Reduced motion
所有 keyframe 必須有 `@media (prefers-reduced-motion: reduce)` fallback

---

## 5. Component Namespace Map

`globals.css` 共 101 class，分 11 namespace：

| Namespace | 用途 | 代表 |
|-----------|------|------|
| `bee-*` | 厚邊墨黑卡 / segmented / 按鈕 | bee-card / bee-segmented / btn-pill |
| `glass-*` | 毛玻璃卡 / 輸入框 / 按鈕 | glass-card / glass-input-wrap / glass-btn-honey |
| `sticker-*` | 貼紙風（icon-btn / tab / wobble / pop） | sticker-icon-btn--gold |
| `chip-*` | 狀態 chip + 緊迫感動畫 | chip-urgent / chip-blocked / chip-danger |
| `cinematic-*` | 掃描中 cinematic 區塊 | cinematic-progress / cinematic-scan / sweep / ticker |
| `cta-*` | CTA 互動微動 | cta-paywall / cta-escape / cta-arrow-nest |
| `hero-*` | Hero 點擊提示 / pulse | hero-clickable / hero-hint |
| `bolt-bob` / `live-dot` / `confetti-burst` | 單獨 keyframe atom | — |
| `animate-*` | 入場動畫 | animate-slide-up / animate-fade-scale-in |
| `step-*` | 「怎麼用」步驟卡 | step-icon |
| `risk-*` / `badge-*` | 風險燈號徽章 | badge-high / badge-medium / badge-low |

**未來重構建議**：統一加 `cc-` 前綴避免污染。先不動，等使用穩定再 codemod。

---

## 6. Voice / 文案口吻

- 結尾用「，」或不收，**不要句號 / 句點**
- 不要「使用者」「客戶」「家長」 → 用「爸媽」「小朋友」「熊熊」「小析」
- 數字 + 單位之間半形空格：`20 秒`、`3-6 歲`、`NT$99`
- 對話化：「掃這個頻道 →」、「你先去倒水，快好了」、「掃完會看到」
- 拒絕 enterprise 用語：別寫「啟動分析」「執行掃描」
- Oscar 自稱「台中在地影像工作者」，**不用** 導演 / 攝影師 / XX 師頭銜

---

## 7. Accessibility 規範

### 對比硬規則（WCAG AA）
- **文字（含 placeholder / disabled）**：最低 4.5:1 對比 vs 背景
- **大字（≥18px 700 或 ≥24px 400）**：最低 3:1
- 預設瀏覽器 placeholder（淺灰）一律會違反，所有 input 加 `.strong-placeholder` class 強制覆寫
- Disabled state：不要用 `opacity: 0.4` 把全部變淺。改用「弱化 background + 維持 ink 色文字 + 0.42-0.5 alpha 文字」
- Icon-only 按鈕：必有 `aria-label` + visible label 或夠大尺寸（≥44×44 觸控目標）

### Skill workflow
- 大改 UI 完默認跑 `/audit` (impeccable) + `/web-design-guidelines`
- 文字不明顯時跑 `/clarify`
- 改完前自查清單：
  1. 所有 placeholder 是否 ≥ 4.5:1？
  2. Disabled 是否仍可讀？
  3. Icon-only 按鈕是否有文字 caption 或 aria-label？
  4. Focus ring 是否可見？

### 既有 a11y 實作

- 所有可互動元件 `:focus-visible` 用蜂蜜金 ring 2px outline-offset 2-3px
- Form input：`<label>` 配 `htmlFor`，視覺隱藏用 `.sr-only`
- Loading 區 `role="status"` + `aria-live="polite"` + `aria-busy="true"`
- Error 區 `role="alert"` + `aria-live="assertive"` + `id` 配 input `aria-describedby`
- Progress bar：`role="progressbar"` + `aria-valuenow/min/max`
- Skip link：`.skip-link` 鍵盤 Tab 第一站可跳掃描輸入
- Image alt：`<Mascot>` 必傳 `alt`，裝飾性圖示加 `aria-hidden`

---

## 8. Theme Family

**Golden Hour（warm autumn）** — 對應 theme-factory 既有主題第 5 號

為兒童安全產品做的微調：
- 把 mustard 推亮成 honey
- 加入披風紅作為品牌記憶點（角色 CC Bear 的披風）
- 深可可取代純黑來軟化文字
- 加入夜空藍（用於 /kids 熊熊守護模式 — 已淡化）

絕對拒絕：
- Vantablack OLED 黑（破暖色家族）
- Geist / Clash Display / Inter（破中文質感）
- 旋轉度數的元件（女友嫌「仨小」）
- 句號 / 句點
- Glassmorphism 大量堆疊（拿掉了 candy 主題就因為這個）

---

## 9. Decision Log（記錄為什麼這樣做）

- **女友 = 視覺取向最高決策權**。她說「乾淨單純最舒適」就是對的方向
- **不要塞滿說明文字** — 使用者能去其他平台看 Oscar 的東西
- **首頁三件事優先**：1. 「20 秒看穿卡通藏什麼」 2. 「掃這個頻道」 3. 「打開熊熊守護模式」
- **不要強迫 modal first**，能 inline 就 inline
- **能用 icon / UI 表達就不用文字** — 這是 Oscar 的核心原則
