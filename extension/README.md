# PeekKids Chrome Extension

在 YouTube 頁面自動注入檢查按鈕，讓爸媽不用先跳到官網就能掃描頻道

## 載入方式（開發中測試）

1. Chrome 開 `chrome://extensions`
2. 右上角打開「開發人員模式」
3. 按「載入未封裝項目」
4. 選這個 `extension/` 資料夾
5. 打開 YouTube 頻道頁（例：`https://www.youtube.com/@sesamestreet`）
6. 右下角會出現 🦉 PeekKids 檢查 按鈕

## 第一次使用

1. 按擴充套件圖示 → 點「⚙ 設定」
2. 貼上 API Key（官網解鎖後拿到）
3. 回 YouTube 按浮動按鈕開始掃

## 檔案結構

```
extension/
├── manifest.json      # MV3 設定
├── config.js          # API endpoint + 快取時間
├── background.js      # service worker（呼叫 API、快取）
├── content.js         # 注入到 YouTube 頁面的浮動按鈕
├── content.css        # 浮動按鈕 + 面板樣式
├── popup.html/.js     # 點擴充套件圖示彈出的小視窗
├── options.html/.js   # 設定 API Key 的頁面
└── icons/             # 16/48/128 三種尺寸
```

## 發佈前檢查清單

- [ ] 換 API_BASE 為 peekkids.tw（正式網域）
- [ ] icons 換成正式設計（目前是程式生成的臨時版）
- [ ] 隱私權政策頁（Chrome Web Store 必要）
- [ ] description 裡補上商店用文案
- [ ] screenshots（1280×800 × 5 張）
- [ ] promo image（440×280）
