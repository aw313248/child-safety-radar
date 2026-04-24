# PeekKids API — 給未來 Chrome 擴充套件用

這份文件是寫給**未來的你**（或任何想接 PeekKids 引擎的人）看的，記錄 `/api/analyze` 怎麼從 Chrome 擴充套件安全呼叫

---

## 端點

```
POST https://peekkids.tw/api/analyze
```

---

## 驗證

| 來源 | 需要 API Key？ | Rate Limit |
|---|---|---|
| 官網自己呼叫（同網域） | ❌ 不用 | 5 次 / 分鐘 / IP |
| Chrome 擴充套件（跨網域） | ✅ 需要 | 30 次 / 分鐘 / key |

---

## 請求範例（擴充套件呼叫）

```javascript
const res = await fetch('https://peekkids.tw/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY_HERE',
  },
  body: JSON.stringify({
    url: 'https://www.youtube.com/@baradachinese1889',
  }),
})
const data = await res.json()
// data.riskLevel, data.riskScore, data.scoreBreakdown, ...
```

---

## 回應格式（AnalysisResult）

```json
{
  "riskLevel": "high" | "medium" | "low",
  "riskScore": 0-100,
  "channelName": "...",
  "channelThumbnail": "https://...",
  "videoCount": 20,
  "commentsDisabled": true,
  "warningComments": [
    {
      "text": "原文",
      "textZh": "繁中翻譯",
      "author": "@user",
      "likeCount": 12,
      "sourceUrl": "https://www.youtube.com/watch?v=XXX&lc=YYY",
      "videoTitle": "來源影片名"
    }
  ],
  "suspiciousTags": ["kids", "cartoon"],
  "aiSummary": "...",
  "recommendation": "...",
  "scoreBreakdown": [
    { "label": "AI 內容分析", "points": 45, "category": "ai" },
    ...
  ],
  "checkedAt": "2026-04-24T10:00:00.000Z",
  "channelUrl": "..."
}
```

---

## 錯誤回應

| Status | 原因 |
|---|---|
| 400 | 網址格式錯誤 / 找不到頻道 |
| 401 | API key 缺少或無效 |
| 429 | 超過 rate limit（看 `X-RateLimit-Reset` header） |
| 500 | 伺服器錯誤 |

所有回應都會帶這三個 header：
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`（Unix timestamp，什麼時候歸零）

---

## 產生新的 API Key

```bash
openssl rand -hex 24
```

把產生的 key 加到 Vercel 專案的環境變數 `API_KEYS`（多個用逗號分隔）：

```
API_KEYS=key-for-chrome-ext-v1,key-for-test,key-for-friend
```

---

## Chrome 擴充套件 manifest.json 範本

```json
{
  "manifest_version": 3,
  "name": "PeekKids",
  "version": "0.1.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://peekkids.tw/*"
  ],
  "content_scripts": [{
    "matches": ["https://www.youtube.com/*"],
    "js": ["content.js"]
  }]
}
```

content.js 裡面抓當前頁面網址 → 呼叫 API → 根據結果蓋住縮圖 / 彈警告

---

## TODO（之後上線再加）

- [ ] 改 Upstash Redis 當 rate limit 儲存（目前是記憶體版，serverless 冷啟動會 reset）
- [ ] 加 API key 每日 quota（不只每分鐘）
- [ ] 加結果快取（同頻道 7 天內重複掃直接回傳快取）
- [ ] 加使用量 dashboard
