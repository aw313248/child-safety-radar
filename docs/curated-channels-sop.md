# 精選頻道入庫 SOP

## 硬規定 1：入庫前必須用 curl 驗證 UC ID

**曾犯的錯：**
1. Little Baby Bum 填成遊戲實況頻道 UC（出現血腥內容）
2. ChuChu TV 填錯 UC（整個頻道沒影片）

**驗證流程（缺一不可）：**

```bash
curl -sL "https://www.youtube.com/@HANDLE" -A "Mozilla/5.0" \
  | grep -oE '"browseId":"UC[a-zA-Z0-9_-]{22}"' | head -1

curl -sL "https://www.youtube.com/@HANDLE" -A "Mozilla/5.0" \
  | grep -oE '<meta property="og:title" content="[^"]+"'
```

UC ID 回傳的頻道名必須完全對得上才能入庫

---

## 硬規定 2：每個入庫頻道必須先用 CareCub 自掃驗證（2026-05-12 Oscar 鎖定）

Oscar 鐵則：「精選頻道要先透過我們自己的判定方法，先確定每個內容都適合上架後再上架」

**流程：**
1. UC ID curl 驗證 ✓（硬規定 1）
2. 用 CareCub `/api/analyze` 自掃該頻道 → 取得 riskScore
3. score < 70（低 / 中風險才符合）+ 5 維度任一不能 < 3★（拿鐵媽媽自動降級鐵則）
4. Oscar 親手 review 結果 + 推薦語 → 點頭才入庫
5. 入庫後加 `lastVerifiedAt` comment 標記驗證日期
