// 家長教育文本庫 — 11 段，來自 11 個獨立權威 source
// Oscar 鎖定：「真正正確的文本，不要揣測，也不要只是好的部分」
// 結尾統一用「，」（Oscar 文案風格，不加句號）

export interface EducationEntry {
  category: 'screenTime' | 'development' | 'practical'
  text: string
  source: string
  url: string
}

export const PARENT_EDUCATION_TEXTS: EducationEntry[] = [
  {
    category: 'screenTime',
    text: '1 歲以下嬰幼兒應完全避免螢幕，2 至 4 歲幼兒每日靜態螢幕時間不超過 1 小時，越少越好，與照顧者一起閱讀或說故事比螢幕更有益發展，',
    source: '世界衛生組織 WHO 2019 兒童身體活動指南',
    url: 'https://www.who.int/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more',
  },
  {
    category: 'screenTime',
    text: '18 至 24 個月的孩子若要看影片，請選擇高品質節目並陪同觀看，2 至 5 歲建議每日不超過 1 小時高品質內容，螢幕不該取代睡眠、運動、家庭時間與自由玩耍，',
    source: '美國兒科醫學會 AAP 螢幕時間指引',
    url: 'https://www.aap.org/en/patient-care/media-and-children/center-of-excellence-on-social-media-and-youth-mental-health/qa-portal/qa-portal-library/qa-portal-library-questions/screen-time-guidelines/',
  },
  {
    category: 'screenTime',
    text: 'Common Sense Media 與密西根大學研究發現，幼兒在 YouTube 上實際看的內容，只有 4% 屬於高教育價值，95% 含廣告、30% 出現某種程度的暴力畫面，孩子單獨刷影片風險不小，',
    source: 'Common Sense Media 家長 YouTube 指南',
    url: 'https://www.commonsensemedia.org/articles/parents-ultimate-guide-to-youtube',
  },
  {
    category: 'development',
    text: '加拿大卡爾加里大學 2019 年研究發現，2 歲時螢幕時間越多，3 歲時的發展篩檢分數越低，3 歲螢幕時間越多，5 歲分數越差，因為單向影音無法替代真實面對面互動，',
    source: '安兒康小兒專科診所整理',
    url: 'https://e-carebaby.com/health_education-75-314/',
  },
  {
    category: 'development',
    text: '加拿大研究指出每日螢幕超過 2 小時的學齡前幼童，注意力不集中問題發生率增加 5 倍，達 ADHD 程度者高達 7.7 倍，3 歲前大量看電視的孩子，5 歲後專心度只有其他孩子的一半，',
    source: '未來親子整理 JAMA 研究',
    url: 'https://futureparenting.cwgv.com.tw/family/content/index/15916',
  },
  {
    category: 'development',
    text: 'AAP 與多項研究指出，幼兒很難從螢幕中獨自學習，家長一起看、問問題、把內容連回真實生活，學習效果才會出現，與其只關注時間，不如關注「你有沒有一起看」，',
    source: 'Zero To Three 螢幕意義報告',
    url: 'https://www.zerotothree.org/resource/screen-time-can-be-quality-time-heres-how/',
  },
  {
    category: 'practical',
    text: '孩子在螢幕關掉時崩潰是非常正常的反應，螢幕設計就是用多巴胺勾住大腦，幼兒的前額葉還在學習如何切換、忍受挫折，要求他們瞬間離開螢幕等於是巨大的情緒任務，',
    source: 'Lovevery 兒童發展團隊',
    url: 'https://blog.lovevery.com/podcast/preventing-screen-time-meltdowns/',
  },
  {
    category: 'practical',
    text: '華盛頓大學研究發現「再兩分鐘」的倒數警告反而讓孩子準備好抗爭，建議用「這集播完就停」這種自然停止點作為訊號，比時間倒數更不容易引發崩潰，',
    source: 'HealthyChildren.org AAP 親子網',
    url: 'https://www.healthychildren.org/English/family-life/Media/Pages/screen-time-and-temper-tantrums-helpful-tips-for-parents.aspx',
  },
  {
    category: 'practical',
    text: '兒童心理師建議，比起命令孩子立刻離開虛擬世界，不如先進去陪他幾分鐘，問他剛剛在看什麼，再邊聊邊關螢幕、銜接下一個活動，過渡會順很多，',
    source: 'CNBC 引述兒童心理師建議',
    url: 'https://www.cnbc.com/2024/01/31/psychologist-4-simple-tips-for-managing-kids-screen-time.html',
  },
  {
    category: 'practical',
    text: '兒童職能治療師觀察，幼兒長時間看影片或玩遊戲後常出現假性過動，習慣聲光瞬間刺激後，挫折容忍度變低、無法等待、不能專注，睡眠不足是最常見的伴隨狀況，',
    source: '親子天下整理職能治療師建議',
    url: 'https://www.parenting.com.tw/article/5086271',
  },
  {
    category: 'practical',
    text: '心理師建議將螢幕時間綁進固定日程，例如「爸爸做晚餐時看 20 分鐘」，孩子知道接下來會發生什麼就比較不會抵抗，並提前準備積木、繪本、戶外活動等銜接選項，',
    source: 'Kidsburgh 心理師專欄',
    url: 'https://www.kidsburgh.org/how-to-prevent-meltdowns-and-tantrums-over-screen-time-limits/',
  },
]

const SESSION_KEY = 'cc_education_shown_indices'

/**
 * 每次呼叫從 11 段中抽一段，同 session 不重複
 * 用完 11 段自動 reset
 */
export function pickEducationText(): EducationEntry {
  const total = PARENT_EDUCATION_TEXTS.length
  let shown: number[] = []
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) shown = JSON.parse(raw)
  } catch {}

  // 用完 reset
  if (shown.length >= total) shown = []

  const remaining = Array.from({ length: total }, (_, i) => i).filter(i => !shown.includes(i))
  const idx = remaining[Math.floor(Math.random() * remaining.length)]

  shown.push(idx)
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(shown)) } catch {}

  return PARENT_EDUCATION_TEXTS[idx]
}
