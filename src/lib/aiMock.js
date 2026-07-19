// 由旅程彙整資料組一段 3-5 句的繁中回顧。純函式，無外部相依。
import { PLACE_TO_ITIN } from '../data/seed'

const hash = (str) => {
  let h = 0
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}
const pick = (arr, seed) => arr[seed % arr.length]
const money = (n, sym) => sym + Math.round(n || 0).toLocaleString('en-US')

export function mockRecap(trip, s) {
  const seed = hash(trip.id || trip.name || '')
  const out = []

  const openings = [
    `${trip.name}，在${trip.country}${trip.city}的 ${trip.days} 天，回想起來還是很有畫面。`,
    `這趟${trip.name}走了 ${trip.days} 天，${trip.country}${trip.city}留下不少片段。`,
    `${trip.days} 天的${trip.name}，${trip.city}的步調剛剛好。`,
  ]
  out.push(pick(openings, seed))

  if (s.spent > 0) {
    const base = `總共花了 ${money(s.spent, trip.sym)}，平均一天 ${money(s.dailyAvg, trip.sym)}`
    out.push(s.topCat ? `${base}，最常花在${s.topCat.label}。` : `${base}。`)
  }

  if (s.placeCount > 0) {
    const parts = []
    if (s.sights) parts.push(`${s.sights} 個景點`)
    if (s.restaurants) parts.push(`${s.restaurants} 間吃的`)
    if (s.malls) parts.push(`${s.malls} 個購物點`)
    const detail = parts.length ? `（${parts.join('、')}）` : ''
    out.push(`你走訪了 ${s.placeCount} 個地方${detail}。`)
  }

  if (s.favorites && s.favorites.length) {
    const names = s.favorites.slice(0, 2).map((p) => p.name).join('、')
    out.push(`最難忘的大概是${names}。`)
  }

  if (s.journalCount > 0) {
    out.push(s.moodObj ? `你寫下 ${s.journalCount} 篇日誌，整體心情 ${s.moodObj.emoji}。` : `你寫下 ${s.journalCount} 篇日誌記錄這段路。`)
  }
  if (out.length < 3) out.push(`願下次出發，也一樣輕鬆自在。`)
  if (out.length < 3) out.push(`期待下一趟旅程。`)

  return out.slice(0, 5).join('')
}

// 依地點庫（優先必去、再替代）將地點分配到每天的上午／中午／下午／晚上時段。
// deterministic：地點不足時以城市通用占位項補滿。
const TAG_ORDER = { must: 0, alt: 1, done: 2 }

export function mockPlan(trip, places) {
  const byCat = { sight: [], food: [], shopping: [] }
  const sorted = [...places].sort((a, b) => (TAG_ORDER[a.tag] ?? 3) - (TAG_ORDER[b.tag] ?? 3))
  for (const p of sorted) {
    const cat = PLACE_TO_ITIN[p.type]
    if (cat && byCat[cat]) byCat[cat].push(p)
  }
  const used = new Set()
  const takeNext = (cat) => {
    const p = (byCat[cat] || []).find((x) => !used.has(x.id))
    if (p) used.add(p.id)
    return p || null
  }
  const placeholder = (cat) => {
    const labels = { sight: `${trip.city} 自由探索`, food: `${trip.city} 在地小吃`, shopping: `${trip.city} 街區逛逛` }
    return { name: labels[cat] || `${trip.city} 自由行程`, note: '依當天狀況彈性安排' }
  }

  const items = []
  for (let day = 1; day <= trip.days; day++) {
    const afternoonCat = day % 2 === 0 ? 'shopping' : 'sight'
    const slots = [
      { start: '09:00', end: '10:30', cat: 'sight' },
      { start: '12:00', end: '13:00', cat: 'food' },
      { start: '14:30', end: '16:30', cat: afternoonCat },
      { start: '18:30', end: '20:00', cat: 'food' },
    ]
    for (const slot of slots) {
      const p = takeNext(slot.cat) || (slot.cat === 'shopping' ? takeNext('sight') : null)
      const src = p || placeholder(slot.cat)
      items.push({
        day,
        title: p ? p.name : src.name,
        cat: slot.cat,
        start: slot.start,
        end: slot.end,
        loc: trip.city,
        note: p ? (p.note || '') : src.note,
      })
    }
  }
  return items
}

// 由預算彙整數字組一段 3-5 句的繁中預算分析。純函式，無外部相依。
export function mockBudgetAnalysis(trip, s) {
  const out = []
  const m = (n) => money(n, trip.sym)

  if (s.topCats.length) {
    const top = s.topCats[0]
    const share = Math.round((top.amt / Math.max(1, s.spent)) * 100)
    out.push(`目前花費最多的分類是${top.label}，共 ${m(top.amt)}，占已花費的 ${share}%。`)
  } else {
    out.push('目前尚無支出紀錄，還無法分析分類花費。')
  }

  if (s.elapsed > 0 && s.dailyAvg > 0) {
    const diff = s.projected - s.budget
    if (diff > 0) out.push(`以目前每天平均花費 ${m(s.dailyAvg)} 推算，整趟預估會花到 ${m(s.projected)}，比預算多出 ${m(diff)}，有超支風險。`)
    else out.push(`以目前每天平均花費 ${m(s.dailyAvg)} 推算，整趟預估花費 ${m(s.projected)}，落在預算範圍內。`)
  } else {
    out.push(`目前已使用預算的 ${s.p}%，天數還不夠估算每日花費趨勢。`)
  }

  if (s.p >= 100) out.push('已超出總預算，建議立即檢視非必要支出。')
  else if (s.p >= 85) out.push('已使用 85% 以上預算，接下來幾天建議控制花費。')
  else if (s.p >= 50) out.push('已使用超過一半預算，留意剩餘天數的支出步調。')
  else out.push('目前預算使用狀況健康，維持現有步調即可。')

  if (s.topCats.length) {
    out.push(`建議：可從${s.topCats[0].label}類別著手，尋找更划算的選項來控制整體花費。`)
  } else {
    out.push('建議：持續記錄每筆花費，方便掌握預算走向。')
  }

  return out.slice(0, 5).join('')
}
