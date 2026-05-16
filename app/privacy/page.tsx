import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隱私權政策',
  description: 'CareCub 隱私權政策 — 說清楚我們收集哪些資料、為什麼收集、怎麼保護',
  robots: { index: true, follow: true },
}

const LAST_UPDATED = '2026-04-30'
const CONTACT_EMAIL = 'carecubkids@gmail.com'

export default function PrivacyPage() {
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
          隱私權政策
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
          隱私權政策
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-hex)', opacity: 0.5, marginBottom: 40 }}>
          最後更新：{LAST_UPDATED}
        </p>

        <Section title="1. 我們是誰">
          <p>
            CareCub（以下簡稱「本服務」）是由 Oscar（minehoooo）個人開發的 AI 兒童頻道安全分析工具，
            服務對象是家長與照護者，協助快速評估 YouTube 頻道是否適合兒童觀看。
          </p>
          <p>
            本政策說明我們收集哪些資料、為何收集、如何使用，以及你的權利。
          </p>
        </Section>

        <Section title="2. 我們收集什麼">
          <Table rows={[
            ['資料類型', '具體內容', '儲存位置', '保留期限'],
            ['連線資訊', 'IP 位址、User-Agent', 'Upstash Redis', '30 天自動刪除'],
            ['使用次數', '免費掃描次數計數器', 'Upstash Redis', '30 天自動刪除'],
            ['解鎖憑證', 'Cookie cc_unlocked（付費標記）', '使用者瀏覽器', '依 cookie 有效期'],
            ['輸入網址', '你貼入的 YouTube 頻道網址', '不儲存，僅用於當次 API 查詢', '—'],
          ]} />
          <Callout emoji="🚫">
            我們不收集：帳號、密碼、姓名、電話、兒童個資、行為追蹤、
            社群帳號資訊，也不對外銷售任何資料
          </Callout>
        </Section>

        <Section title="3. 為何收集這些資料">
          <ul>
            <li><strong>IP + User-Agent</strong> — 防止濫用、執行每人免費 2 次配額限制</li>
            <li><strong>掃描次數計數器</strong> — 追蹤免費配額用量，超額後引導付費解鎖</li>
            <li><strong>Cloudflare Turnstile（機器人偵測）</strong> — 防止惡意程式大量呼叫 API，保護服務穩定</li>
            <li><strong>cc_unlocked Cookie</strong> — 記住你已付費，不需重複驗證</li>
          </ul>
        </Section>

        <Section title="4. 第三方服務">
          <p>本服務使用以下第三方服務，資料可能依其各自隱私政策處理：</p>
          <Table rows={[
            ['服務', '用途', '隱私政策'],
            ['YouTube Data API v3', '擷取頻道影片資訊', 'google.com/policies/privacy'],
            ['Google Gemini API', 'AI 分析摘要生成', 'ai.google.dev/terms'],
            ['Cloudflare Turnstile', '機器人偵測', 'cloudflare.com/privacypolicy'],
            ['Upstash Redis', 'IP 計數器 / 配額儲存', 'upstash.com/trust/privacy'],
            ['Lemon Squeezy', '付費解鎖處理', 'lemonsqueezy.com/privacy'],
            ['Vercel', '網站託管 / Edge Network', 'vercel.com/legal/privacy-policy'],
          ]} />
        </Section>

        <Section title="5. 兒童隱私保護">
          <Callout emoji="🐻">
            本服務設計對象為家長與照護者，不直接向 13 歲以下兒童提供服務，
            也不主動收集兒童個人資料。熊熊守護模式（Bear Mode）的所有操作，
            均由家長帳戶執行，兒童個人資訊不會進入我們的系統
          </Callout>
        </Section>

        <Section title="6. 資料保留與刪除">
          <ul>
            <li>IP / 使用次數記錄：<strong>30 天後由 Upstash Redis 自動清除</strong></li>
            <li>付費 Cookie：儲存於你的瀏覽器，可自行清除，或透過瀏覽器設定刪除</li>
            <li>你可以寄信要求刪除與你的 IP 相關的所有記錄，我們會在 7 個工作天內處理</li>
          </ul>
        </Section>

        <Section title="7. 你的權利">
          <ul>
            <li>查閱：要求查看我們儲存的與你 IP 相關的資料</li>
            <li>刪除：要求刪除你的 IP 相關記錄</li>
            <li>更正：若有錯誤，要求更正</li>
            <li>反對：反對特定資料處理用途</li>
          </ul>
          <p>
            如要行使以上權利，請寄信至：
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--cc-gold-deep, #D99422)', fontWeight: 700 }}>
              {' '}{CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <Section title="8. Cookie 說明">
          <Table rows={[
            ['Cookie 名稱', '用途', '類型'],
            ['cc_unlocked', '記錄付費解鎖狀態', '功能性 Cookie'],
            ['cf_clearance', 'Cloudflare 機器人偵測通過憑證', '必要性 Cookie'],
          ]} />
          <p>本服務不使用廣告追蹤 Cookie，不設置第三方行銷 Cookie</p>
        </Section>

        <Section title="9. 安全措施">
          <ul>
            <li>所有傳輸透過 HTTPS / TLS 加密</li>
            <li>Redis 資料庫存取僅限伺服器端（不暴露 API Key 給前端）</li>
            <li>Cloudflare Turnstile 保護 API 端點免受惡意呼叫</li>
            <li>Vercel Edge Network 提供 DDoS 防護</li>
          </ul>
        </Section>

        <Section title="10. 政策更新">
          <p>
            若有重大變更，我們會在本頁面頂端更新日期，並在首頁顯示提醒。
            繼續使用本服務即視為接受最新版本政策
          </p>
        </Section>

        <Section title="11. 聯絡我們">
          <p>
            對本政策有任何問題，歡迎寄信至：
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
          <Link href="/terms" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontWeight: 700,
            color: 'var(--ink-hex)', textDecoration: 'none',
            padding: '10px 16px',
            border: '2px solid rgba(var(--ink-rgb), 0.3)',
            borderRadius: 12,
            marginLeft: 12,
          }}>
            服務條款 →
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

function Table({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows
  return (
    <div style={{ overflowX: 'auto', marginTop: 12, marginBottom: 12 }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 13.5, lineHeight: 1.6,
      }}>
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '8px 12px',
                background: '#2B1810', color: '#FFF6E6',
                fontWeight: 700, fontSize: 12,
                letterSpacing: '0.04em',
                borderRadius: i === 0 ? '8px 0 0 0' : i === header.length - 1 ? '0 8px 0 0' : undefined,
              }}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'rgba(var(--ink-rgb), 0.04)' : 'transparent' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(var(--ink-rgb), 0.08)',
                  color: 'var(--ink-hex)',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
