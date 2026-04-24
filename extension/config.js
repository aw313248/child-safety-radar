// PeekKids Extension 設定
const PEEKKIDS_CONFIG = {
  // 生產 API（上線後改成 peekkids.tw）
  API_BASE: 'https://child-safety-radar.vercel.app',

  // 預設共用 key（給沒設自己 key 的使用者，低額度 fallback）
  // 使用者可在 options 頁覆寫自己的 key
  DEFAULT_API_KEY: '',

  // 快取時間（毫秒）：同頻道 30 分內不重查
  CACHE_TTL: 30 * 60 * 1000,

  // 網站連結（分析報告詳情 + 取得 API key）
  SITE_URL: 'https://child-safety-radar.vercel.app',
}

if (typeof module !== 'undefined') module.exports = PEEKKIDS_CONFIG
