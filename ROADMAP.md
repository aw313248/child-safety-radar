# CareCub — 開發路線圖
> 最後更新：2026-04-30
> App 技術：Flutter（iOS 優先）
> 工作模式：規劃 chat 寫策略 + 指令稿，執行 chat 做事

## 📍 目前進度：階段 1（網頁完善）

## ✅ 階段 0：地基修復
- [x] 5 個 P0/P1 BUG 修復
- [x] 雙 chat 工作模式建立
- [x] 推薦規則修正
- [x] App 技術選型鎖定 Flutter（iOS 優先）

## 🟡 階段 1：網頁完善（進行中）
- [x] 1.1 手機版 UI 全面診斷
- [ ] 1.2 手機版 UI 優化
- [ ] 1.3 桌面版 UI polish
- [ ] 1.4 補環境變數 YOUTUBE_API_KEY + GEMINI_API_KEY
- [ ] 1.5 加 /privacy 頁（App 上架必備）
- [ ] 1.6 加 /terms 頁

## ⚪ 階段 2：網頁體驗深化
- [ ] 2.1 P2 級 UX 改善
- [ ] 2.2 加 SEO
- [ ] 2.3 加 Analytics
- [ ] 2.4 收集 50-100 個真實使用者反饋

## ⚪ 階段 3：Flutter App 開發環境
- [ ] 3.1 確認 Flutter 方案 ✅
- [ ] 3.2 申請 Apple Developer Account（USD $99/年）
- [ ] 3.3 安裝 Xcode
- [x] 3.4 執行 chat 安裝 Flutter SDK + 建空白 App 專案
- [ ] 3.5 用 iPhone 跑起 hello world
- [x] 3.6 把品牌色 token / 字型搬到 Flutter

## ⚪ 階段 4：Flutter App 核心功能
- [ ] 4.1 主頁掃描畫面
- [ ] 4.2 結果卡 ResultCard
- [ ] 4.3 兒童守護模式
- [ ] 4.4 睡前音樂模式
- [ ] 4.5 解鎖 modal + 串 Apple IAP

## ⚪ 階段 5：iOS 上架
- [ ] 5.1 App icon
- [ ] 5.2 Splash screen
- [ ] 5.3 App Store 截圖
- [ ] 5.4 App 描述 / 關鍵字
- [ ] 5.5 隱私權政策
- [ ] 5.6 TestFlight 內測
- [ ] 5.7 送審 → 上架

## ⚪ 階段 6：商業 + Android 版本

---

## 待 App 正式開發時統一同步（累積清單）

App 端正式開發（階段 4）時，需把網頁這邊累積的改動套進去：

### 設計系統 token
- [ ] colors.dart 新增 adultOrange = Color(0xFFE07B00)
- [ ] colors.dart 新增 adultOrangeSoft = Color(0xFFFFEEDD)

### 資料模型
- [ ] Flutter RiskLevel enum 加 adult_inappropriate

### 結果頁 UI
- [ ] result_screen.dart 加 adult_inappropriate 分支
- [ ] 橘色大字 banner「⚠️ 此頻道含成人露骨內容」
- [ ] 個人黑名單按鈕「⚑ 列入我的黑名單」（用 SecureStore 存）

### 主頁
- [ ] 掃描前檢查 SecureStore 黑名單，命中直接顯示警示

### 結果頁 UI（補）
- [ ] AddToKidsMode 對 adult_inappropriate 改 disabled「⛔ 此頻道風險過高，不能加入守護模式」

### 黑名單功能
- [ ] 新增「我的黑名單」管理頁（讀 SecureStore）
- [ ] 列入黑名單時存物件 {channelId, channelName, blacklistedAt}（不是只存 ID）
- [ ] 主頁 footer 加「我的黑名單」入口
