import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '服務條款',
  description: 'CareCub 服務條款 — 使用本服務前請閱讀這份簡單條款',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '2026-04-30'
const CONTACT_EMAIL = 'carecubkids@gmail.com'

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-warm, #FFF6E6)',
      fontFamily: 'var(--font-heihei, sans-serif)',
    }}>
      {/* Nav bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#F2B84B',
        borderBottom: '2px solid #2B1810',
        padding: '0 24px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          fontWeight: 800, fontSize: 15,
          color: 'var(--ink-hex)', textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}>
          ← CareCub
        </Link>
        <span style={{ fontSize: 13, color: 'var(--ink-hex)', opacity: 0.6 }}>
          服務條款
        </span>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 720, margin: '0 auto',
        padding: '48px 24px 80px',
      }}>
        <h1 style={{
          fontSize: 28, fontWeight: 900,
          color: 'var(--ink-hex)', letterSpacing: '-0.04em',
          marginBottom: 8,
        }}>
          服務條款
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-hex)', opacity: 0.5, marginBottom: 40 }}>
          最後更新：{LAST_UPDATED}
        </p>

        <Section title="1. 接受條款">
          <p>
            使用 CareCub（child-safety-radar.vercel.app，以下簡稱「本服務」）即表示你同意本條款。
            如不同意，請停止使用本服務。
          </p>
          <p>
            本服務由 Oscar（minehoooo，以下簡稱「開發者」）個人開發與維護。
          </p>
        </Section>

        <Section title="2. 服務說明">
          <p>
            CareCub 是一款 AI 輔助分析工具，透過 YouTube Data API 擷取公開頻道資訊，
            再由 Gemini AI 進行內容風險摘要，幫助家長快速評估 YouTube 頻道是否適合兒童觀看。
          </p>
          <Callout emoji="⚠️">
            AI 分析結果僅供參考，不構成任何保證。最終判斷請家長自行決定。
            本服務不對因使用分析結果而產生的任何損失負責
          </Callout>
        </Section>

        <Section title="3. 免費方案與付費方案">
          <ul>
            <li>
              <strong>免費方案</strong>：每個 IP 位址每 30 天可免費掃描 2 次。
              次數依 IP 計算，清除 Cookie 不會重置次數
            </li>
            <li>
              <strong>付費解鎖</strong>：透過 Lemon Squeezy 一次性付費（目前定價以首頁顯示為準），
              解鎖後可無限次掃描，付款後授予 <code>cc_unlocked</code> Cookie 作為憑證
            </li>
            <li>
              <strong>退款政策</strong>：購買後如有問題，請在 7 天內寄信至
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--cc-gold-deep, #D99422)', fontWeight: 700 }}>
                {' '}{CONTACT_EMAIL}
              </a>，我們將依實際情況處理
            </li>
          </ul>
        </Section>

        <Section title="4. 禁止行為">
          <p>使用本服務時，你同意不得：</p>
          <ul>
            <li>使用自動化工具（爬蟲、腳本）大量呼叫掃描功能</li>
            <li>試圖繞過免費次數限制（包括偽造 IP、批量請求等）</li>
            <li>對本服務進行逆向工程或試圖取得 API 金鑰</li>
            <li>將本服務分析結果用於商業目的後再次轉售，未經授權不得以任何形式轉售服務</li>
            <li>惡意提交大量無效網址以消耗伺服器資源</li>
          </ul>
        </Section>

        <Section title="5. 智慧財產權">
          <ul>
            <li>本服務的程式碼、設計、品牌元素（CareCub、小析、熊熊守護）均為開發者所有</li>
            <li>本服務分析所使用的 YouTube 影片資訊，其版權歸屬原頻道作者</li>
            <li>AI 生成的摘要結果版權屬於本服務，不得未授權轉載或商用</li>
          </ul>
        </Section>

        <Section title="6. 免責聲明">
          <Callout emoji="📋">
            本服務以「現狀」提供，不對以下情況負責：
            (1) AI 分析錯誤或遺漏導致的判斷偏差；
            (2) YouTube API 資料更新延遲；
            (3) 服務中斷或暫停；
            (4) 因使用分析結果而做出的任何育兒決定
          </Callout>
          <p>
            開發者會盡力維持服務穩定，但個人開發專案可能有維護中斷期，
            請理解並做好備案（如直接查看 YouTube 頻道）
          </p>
        </Section>

        <Section title="7. 服務變更與終止">
          <ul>
            <li>開發者保留隨時修改、暫停或終止服務的權利</li>
            <li>如有重大變更（如定價調整），將提前在首頁公告</li>
            <li>若因不可抗力（伺服器費用無力負擔、API 政策變更等）停止服務，
            已付費用戶可聯絡要求退款</li>
          </ul>
        </Section>

        <Section title="8. 隱私權">
          <p>
            本服務的資料收集與處理方式，詳見
            <Link href="/privacy" style={{ color: 'var(--cc-gold-deep, #D99422)', fontWeight: 700, marginLeft: 4 }}>
              隱私權政策
            </Link>
          </p>
        </Section>

        <Section title="9. 準據法">
          <p>
            本條款依中華民國（台灣）法律解釋與執行。
            如有爭議，雙方同意以台中地方法院為第一審管轄法院
          </p>
        </Section>

        <Section title="10. 聯絡我們">
          <p>
            對本條款有任何問題，請寄信至：
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--cc-gold-deep, #D99422)', fontWeight: 700 }}>
              {' '}{CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        {/* Back link */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px dashed rgba(var(--ink-rgb), 0.14)' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 700,
            color: 'var(--ink-hex)', textDecoration: 'none',
            padding: '10px 16px',
            border: '2px solid #2B1810',
            borderRadius: 12,
          }}>
            ← 回首頁掃描
          </Link>
          <Link href="/privacy" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 700,
            color: 'var(--ink-hex)', textDecoration: 'none',
            padding: '10px 16px',
            border: '2px solid rgba(var(--ink-rgb), 0.3)',
            borderRadius: 12,
            marginLeft: 12,
          }}>
            隱私權政策 →
          </Link>
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 17, fontWeight: 800,
        color: 'var(--ink-hex)', letterSpacing: '-0.02em',
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: '2px solid rgba(var(--ink-rgb), 0.1)',
      }}>
        {title}
      </h2>
      <div style={{
        fontSize: 14.5, lineHeight: 1.75,
        color: 'var(--ink-hex)',
      }}>
        {children}
      </div>
    </section>
  )
}

function Callout({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(242,184,75,0.15)',
      border: '1.5px solid rgba(242,184,75,0.6)',
      borderRadius: 12,
      padding: '12px 16px',
      fontSize: 14, lineHeight: 1.7,
      color: 'var(--ink-hex)',
      marginTop: 12,
      display: 'flex', gap: 10,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
      <span>{children}</span>
    </div>
  )
}
