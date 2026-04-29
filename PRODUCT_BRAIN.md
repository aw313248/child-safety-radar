# CareCub Kids — 產品大腦文件
> 給新 session 讀的完整上下文。最後更新：2026-04-29

---

## 一、產品是什麼

**CareCub Kids**（中文品牌：小析守護 / 熊熊守護）
- **核心功能**：掃描 YouTube 頻道/影片，用 AI 判斷是否適合 0-6 歲兒童
- **次要功能**：熊熊守護模式（kids mode）— 精選安心頻道的兒童瀏覽器
- **睡前音樂**：三個人工驗證的 YouTube 睡眠音樂播放清單
- **目標使用者**：台灣爸媽，孩子 0-6 歲
- **商業模式**：Freemium — 免費 2 次掃描，之後需購買解鎖碼（Lemon Squeezy）

---

## 二、技術架構

| 層 | 技術 |
|---|---|
| Framework | Next.js 14 App Router |
| 語言 | TypeScript |
| 樣式 | Tailwind + inline styles（設計系統用 CSS variables） |
| 部署 | Vercel（自動 CI/CD，push main → deploy） |
| 主要 AI | Google Gemini API（頻道安全分析） |
| 資料 API | YouTube Data API v3 |
| 持久化 | Upstash Redis（掃描次數防破解） |
| 人機驗證 | Cloudflare Turnstile（invisible mode） |
| 付款 | Lemon Squeezy（解鎖碼發放） |

### 環境變數（.env.local 已填，Vercel 也已設定）
```
YOUTUBE_API_KEY=（尚未填入 — Oscar 手動從 Google Cloud Console 拿）
GEMINI_API_KEY=（尚未填入）
ACCESS_CODES=（逗號分隔，每賣一張加一個）
DEV_UNLOCK_CODES=（本地開發用，不 commit）
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADEsxU457fEwKry7
TURNSTILE_SECRET_KEY=0x4AAAAAADEsxZHYu5tlNNIxzSxrtB8iZDs
UPSTASH_REDIS_REST_URL=https://game-scorpion-108124.upstash.io
UPSTASH_REDIS_REST_TOKEN=gQAAAAAAAaZcAAIgcDE3YWNmZDZkYzAyNWE0OTJjYjk0MDBhMTYyZjRlODcyYQ
```

---

## 三、檔案地圖

```
app/
  page.tsx              ← 主頁（掃描 + 結果）
  kids/
    page.tsx            ← 熊熊守護模式（頻道列表 + 影片播放 + 睡前音樂）
    layout.tsx          ← Kids 頁面 metadata
  api/
    analyze/route.ts    ← 核心 AI 掃描 API（Gemini + YouTube）
    unlock/route.ts     ← 解鎖碼驗證
    safe-videos/route.ts← Kids 模式安全影片篩選
    channel-thumbnails/ ← 批次取頻道頭像
    feedback/           ← 使用者回饋

components/
  ResultCard.tsx        ← 掃描結果卡片（風險燈號 + 詳細分析）
  CaseLibrary.tsx       ← 案例圖書館（預設收合）
  KidsTimer.tsx         ← 兒童模式計時器
  Mascot.tsx            ← 吉祥物圖片元件（支援 8 種 pose）
  ChannelAvatar.tsx     ← 頻道頭像（真實 thumbnail 或 fallback 吉祥物）
  TurnstileWidget.tsx   ← Cloudflare 人機驗證（invisible）
  UnlockModal.tsx       ← 付費解鎖 modal
  SocialProof.tsx       ← 累計守護次數
  RecentHighRisk.tsx    ← 最近高風險頻道紀錄
  LoadingFacts.tsx      ← 掃描等待時的教育事實輪播
  ScanningStages.tsx    ← 掃描進度視覺化

lib/
  curated-channels.ts   ← 精選頻道清單（7 個，已人工驗證 ID）
  sleep-playlists.ts    ← 睡前音樂播放清單（3 個，已驗證）
  user-channels.ts      ← 爸媽自己加的頻道（localStorage）
  redis.ts              ← Upstash Redis client（scan count）
  rate-limit.ts         ← IP fingerprint + rate limiting
  youtube.ts            ← YouTube API helpers
```

---

## 四、設計系統

### 色彩 tokens（CSS variables）
```css
--ink-hex: #2B1810          /* 深可可棕，主要文字 + 邊框 */
--honey-hex: #F2B84B        /* 蜂蜜金，CTA + 強調 */
--cc-gold-deep: #D99422     /* 深金，hover 狀態 */
--terra-hex: #C2413B        /* 磚紅，危險 + 錯誤 */
--risk-green: #2D7A4F       /* 深綠，安全狀態 */
--card-hex: #FFF6E6         /* 奶油白，卡片背景 */
```

### 主要 CSS classes
```
.bee-card          ← 標準卡片（黃底黑邊 + 3px offset shadow）
.glass-card        ← 毛玻璃卡片（frosted background）
.glass-card-honey  ← 蜂蜜金強調卡（CTA 用）
.sticker-wobble    ← hover 微晃動動畫
.sticker-pop       ← 進場 scale-in 動畫
.reveal-up         ← scroll 進入浮上動畫
.bear-loading      ← 熊熊 loading 動畫（float + blink）
.bear-loading-bar  ← 蜂蜜金進度條動畫
.cinematic-progress← 掃描進度條（漸層 + shimmer）
```

### 吉祥物 poses
`hi` / `guard` / `fly` / `think` / `thumbs-up` / `search` / `sleep` / `angry`
圖片位置：`/public/mascot/{pose}.png`

---

## 五、精選頻道（人工驗證）

| 頻道 | Channel ID | 語言 |
|---|---|---|
| CoComelon | UCbCmjCuTUZos6Inko4u57UQ | 英 |
| Pinkfong 碰碰狐 | UCcdwLMPsaU2ezNSJU1nFoBQ | 中英 |
| Super Simple Songs | UCLsooMJoIpl_7ux2jvdPB-Q | 英 |
| Play BIG 小啼大作 | UCepXGfvoX1evyA6lB553Y7Q | 中 |
| ChuChu TV | UCBnZ16ahKA2DZ_T5W0FPUXg | 英 |
| 巧虎 巧連智 | UCnjadOj5qlKXsTAXPSwc67A | 中 |
| Bluey | UCVzLLZkDuFGAE2BGdBuBNBg | 英 |

**⛔ 加新頻道鐵則：必須 curl 驗證 channelId 和頻道名完全對上才能入庫**
```bash
curl -sL "https://www.youtube.com/@HANDLE" -A "Mozilla/5.0" | grep -oE '"browseId":"UC[a-zA-Z0-9_-]{22}"' | head -1
```

---

## 六、睡前音樂播放清單（人工驗證）

| 清單 | Playlist ID |
|---|---|
| Super Simple Songs Lullabies | PLdkj6XH8GYPQyu3G4ABn0G3hq-vvfLFY- |
| CoComelon 催眠曲 | PLyuESFz6eTHlXP8IBWvxe5zNXWbkpxnWW |
| LooLoo Kids Mozart 睡眠音樂 | PLshBxGt78uB2tSkGRNCY3vGHBI5T2gfXb |

---

## 七、安全防護層（多層反破解）

1. **Cloudflare Turnstile** — invisible CAPTCHA，後端 siteverify 驗 token
2. **Upstash Redis fingerprint** — IP+UA hash，30 天 TTL，跨裝置追蹤掃描次數
3. **Server-side 402** — 免費次數在後端守，localStorage 清空沒用
4. **Security headers** — X-Frame-Options, HSTS, CSP, Referrer-Policy（next.config.mjs）
5. **Input validation** — URL ≤500 字元，regex 白名單，server-side
6. **解鎖碼 env vars** — ACCESS_CODES / DEV_UNLOCK_CODES，不 hardcode，不 commit

---

## 八、兒童守護模式特殊設計

- **YouTube nocookie embed** — `youtube-nocookie.com` 減少追蹤
- **暫停 overlay** — 偵測 postMessage state=2（暫停），全螢幕蓋住阻止點到推薦影片
- **loop=1 + playlist=videoId** — 強制單片循環，end screen 不出現
- **退出算數題** — 混合加減乘，防小孩背答案；每次隨機換題
- **popstate 攔截** — 返回鍵觸發退出確認而不是直接離開
- **beforeunload** — 防意外關閉
- **鍵盤攔截** — F5/F12/Ctrl+R 等組合鍵全擋掉

---

## 九、品牌聲音與文案守則

**語氣**：口語、輕鬆、帶點自嘲幽默，不誇大，不說教
**核心比喻**：小析（熊熊吉祥物）是爸媽的眼睛，去查那些我們沒時間一一確認的東西
**好的文案範例**：
- 「這個卡通安全嗎？」← 直接問使用者的問題
- 「讓小析去查，你去泡咖啡」← 輕鬆，解決焦慮
- 「你先去倒水，快好了」← loading 時減少不安
- 「守護版 · 創始會員 NT$99/月 — 一天 NT$3，保護孩子每天看的內容」← 情緒框架

**避免**：
- 「一杯咖啡的價格」← 爛大街，換掉
- 強調頭銜（Oscar 不要叫「導演」「攝影師」）
- 網頁文字不加句號「。」

---

## 十、定價策略（目前方向）

- **方案名稱**：守護版 · 創始會員（Early Bird）
- **價格**：NT$99/月
- **框架**：一天 NT$3，保護孩子每天看的內容
- **承諾**：現在訂的人永久鎖定 NT$99，之後漲價不影響
- **目的**：early adopter 邊收費邊蒐集數據，之後再調整

---

## 十一、待辦 / 已知問題（從 /critique 產出）

| 優先 | 問題 | 建議 skill |
|---|---|---|
| P1 | 首頁 fold 以下資訊太密（SocialProof + KidsCTA + RecentHighRisk + CaseLibrary） | `/distill` |
| P1 | 新使用者沒有信任基礎就被推往付費，撞 paywall 流失高 | `/onboard` |
| P2 | 掃完後輸入框消失，「再掃一個」需滾動才找得到 | `/optimize` |
| P2 | 沒有 display font，排版缺個性，system-ui 最泛 | `/typeset` |
| P3 | 背景裝飾吉祥物 opacity 0.05–0.07 幾乎看不到 | `/polish` |

---

## 十二、已完成的重要工作（不要重做）

- ✅ Bluey 頻道加入（ID 已 curl 驗證）
- ✅ 巧虎 Benesse Taiwan 加入（已驗證）
- ✅ 5 個 ID 錯誤的頻道已移除
- ✅ 暫停 overlay 防止 YouTube 推薦（postMessage 機制）
- ✅ CaseLibrary 預設收合
- ✅ Cloudflare Turnstile 整合（invisible）
- ✅ Upstash Redis scan count（30 天 TTL）
- ✅ Security headers（CSP / HSTS / X-Frame-Options）
- ✅ 解鎖碼移到 env vars（不再 hardcode）
- ✅ 睡前音樂模式（星空 UI + 3 個驗證清單 + 熊熊睡姿）
- ✅ 熊熊 loading 動畫（float + blink + 進度條）
- ✅ 文字改「爸爸媽媽陪同更放心」

---

## 十三、網址

- **Production**：https://child-safety-radar.vercel.app
- **Vercel Dashboard**：https://vercel.com/cyuttkengineer-6834s-projects/child-safety-radar
- **Cloudflare Turnstile**：https://dash.cloudflare.com → Turnstile
- **Upstash Redis**：https://console.upstash.com → CareCub DB（Tokyo）
- **Lemon Squeezy**：https://app.lemonsqueezy.com

---

## 十四、給 Opus 的注意事項

1. **部署一律用 `vercel deploy --prod --yes`**，commit 之後馬上 deploy
2. **改 env vars 一律用 `vercel env add`**，不要叫 Oscar 手動貼進 Vercel dashboard
3. **加頻道前必須 curl 驗證**，不能猜 channel ID
4. **網頁文字不加句號「。」**
5. **Oscar 不懂程式**，說明要口語、給步驟、不給技術術語
6. **YOUTUBE_API_KEY 和 GEMINI_API_KEY 目前是空的**，很多功能在 production 可能需要先填
7. **本專案 Oscar 是台中在地影像工作者，不是工程師，不用「導演」「攝影師」等頭銜**
8. **定價方向已定（NT$99 創始會員）**，不需要重新討論，直接實作付款頁即可
