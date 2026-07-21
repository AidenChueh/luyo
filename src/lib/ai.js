import Anthropic from '@anthropic-ai/sdk'
import { mockRecap, mockPlan, mockBudgetAnalysis } from './aiMock'

const AI_KEY = 'luyo:ai:v1'
const RECAP_KEY = 'luyo:airecap:v1'
const PLAN_KEY = 'luyo:aiplan:v1'
const BUDGET_KEY = 'luyo:aibudget:v1'

export const getApiKey = () => {
  try { return localStorage.getItem(AI_KEY) || '' } catch { return '' }
}
export const setApiKey = (key) => {
  try {
    if (key) localStorage.setItem(AI_KEY, key)
    else localStorage.removeItem(AI_KEY)
  } catch {}
}
export const hasApiKey = () => !!getApiKey()

const loadRecaps = () => {
  try { return JSON.parse(localStorage.getItem(RECAP_KEY) || '{}') } catch { return {} }
}
export const getRecap = (tripId) => loadRecaps()[tripId] || null
export const saveRecap = (tripId, recap) => {
  try {
    const all = loadRecaps()
    all[tripId] = recap
    localStorage.setItem(RECAP_KEY, JSON.stringify(all))
  } catch {}
}
export const removeRecap = (tripId) => {
  try {
    const all = loadRecaps()
    delete all[tripId]
    localStorage.setItem(RECAP_KEY, JSON.stringify(all))
  } catch {}
}

const loadJSON = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
const saveJSON = (key, tripId, value) => {
  try {
    const all = loadJSON(key)
    all[tripId] = value
    localStorage.setItem(key, JSON.stringify(all))
  } catch {}
}
const removeJSON = (key, tripId) => {
  try {
    const all = loadJSON(key)
    delete all[tripId]
    localStorage.setItem(key, JSON.stringify(all))
  } catch {}
}

export const getPlan = (tripId) => loadJSON(PLAN_KEY)[tripId] || null
export const savePlan = (tripId, plan) => saveJSON(PLAN_KEY, tripId, plan)
export const removePlan = (tripId) => removeJSON(PLAN_KEY, tripId)

export const getBudgetAnalysis = (tripId) => loadJSON(BUDGET_KEY)[tripId] || null
export const saveBudgetAnalysis = (tripId, analysis) => saveJSON(BUDGET_KEY, tripId, analysis)
export const removeBudgetAnalysis = (tripId) => removeJSON(BUDGET_KEY, tripId)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function generateRecap(trip, stats, { onDelta } = {}) {
  if (hasApiKey()) return generateWithClaude(trip, stats, { onDelta })
  const text = mockRecap(trip, stats)
  const chunks = text.match(/[\s\S]{1,6}/g) || [text]
  for (const c of chunks) { onDelta?.(c); await sleep(35) }
  return { text, source: 'mock' }
}

const SYSTEM = '你是旅遊回顧撰寫者。用繁體中文寫一段放鬆、第二人稱、3 到 5 句的旅程回顧。只根據我提供的資料，不要杜撰沒有的內容，不要用 emoji，不要加標題或前言，直接輸出文案。'

const buildUserPrompt = (trip, s) => {
  const lines = [
    `旅程：${trip.name}`,
    `地點：${trip.country}${trip.city}`,
    `天數：${trip.days} 天`,
    `狀態：${trip.status === 'completed' ? '已結束' : trip.status === 'ongoing' ? '進行中' : '規劃中'}`,
    `總花費：${trip.sym}${Math.round(s.spent || 0).toLocaleString('en-US')}`,
    `每日平均：${trip.sym}${Math.round(s.dailyAvg || 0).toLocaleString('en-US')}`,
  ]
  if (s.topCat) lines.push(`最常花費分類：${s.topCat.label}（${trip.sym}${Math.round(s.topCat.amt).toLocaleString('en-US')}）`)
  lines.push(`造訪地點：${s.placeCount}（景點 ${s.sights}、餐廳 ${s.restaurants}、商場 ${s.malls}）`)
  if (s.favorites?.length) lines.push(`最愛地點：${s.favorites.slice(0, 3).map((p) => p.name).join('、')}`)
  lines.push(`日誌：${s.journalCount} 篇`)
  if (s.moodObj) lines.push(`平均心情：${s.moodObj.emoji}`)
  return lines.join('\n')
}

async function generateWithClaude(trip, stats, { onDelta } = {}) {
  const client = new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true })
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildUserPrompt(trip, stats) }],
    })
    stream.on('text', (t) => onDelta?.(t))
    const final = await stream.finalMessage()
    const text = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    return { text, source: 'claude' }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('API key 無效，請到「我的」頁面檢查設定。')
    if (err instanceof Anthropic.RateLimitError) throw new Error('呼叫太頻繁，請稍後再試。')
    throw new Error('生成失敗，請稍後再試。')
  }
}

// ---- AI 行程規劃 ----

const PLAN_CATS = ['sight', 'food', 'transport', 'shopping', 'hotel']

const PLAN_SYSTEM = '你是旅遊行程規劃助手。根據我提供的旅程資料與地點庫，規劃每天 2 到 4 個行程項目，只根據我提供的資料安排，不要杜撰不存在的地點。只回傳一個 JSON 陣列，不要加任何說明文字、不要用 markdown code fence。陣列每個元素格式為 {"day":數字,"title":"文字","cat":"sight|food|transport|shopping|hotel","start":"HH:MM","end":"HH:MM","loc":"文字","note":"文字"}，時段之間不要重疊。'

const buildPlanPrompt = (trip, places, itinSummary) => {
  const lines = [
    `旅程：${trip.name}`,
    `地點：${trip.country}${trip.city}`,
    `天數：${trip.days} 天`,
    `預算：${trip.sym}${trip.budget}`,
  ]
  if (itinSummary) lines.push(`既有行程：${itinSummary}`)
  if (places.length) {
    lines.push('地點庫：')
    for (const p of places) {
      const tag = p.tag === 'must' ? '必去' : p.tag === 'alt' ? '替代' : '已完成'
      lines.push(`- [${tag}] ${p.name}（${p.type}）${p.note ? '：' + p.note : ''}`)
    }
  } else {
    lines.push('地點庫：無，請依城市常見行程安排合理項目。')
  }
  return lines.join('\n')
}

class PlanParseError extends Error {}

const parsePlanJSON = (text, maxDay) => {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) throw new PlanParseError('行程草稿解析失敗，請重新生成。')
  let raw
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new PlanParseError('行程草稿解析失敗，請重新生成。')
  }
  if (!Array.isArray(raw)) throw new PlanParseError('行程草稿解析失敗，請重新生成。')
  return raw
    .map((it) => ({
      day: Math.min(Math.max(1, Number(it.day) || 1), maxDay),
      title: String(it.title || '').slice(0, 60),
      cat: PLAN_CATS.includes(it.cat) ? it.cat : 'sight',
      start: /^\d{2}:\d{2}$/.test(it.start) ? it.start : '09:00',
      end: /^\d{2}:\d{2}$/.test(it.end) ? it.end : '10:00',
      loc: String(it.loc || '').slice(0, 60),
      note: String(it.note || '').slice(0, 200),
    }))
    .filter((it) => it.title)
}

export async function generatePlan(trip, places, itinSummary, { onDelta } = {}) {
  if (hasApiKey()) return generatePlanWithClaude(trip, places, itinSummary, { onDelta })
  const items = mockPlan(trip, places)
  for (let d = 1; d <= trip.days; d++) {
    onDelta?.(`第 ${d} 天規劃完成\n`)
    await sleep(120)
  }
  return { items, source: 'mock' }
}

async function generatePlanWithClaude(trip, places, itinSummary, { onDelta } = {}) {
  const client = new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true })
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: PLAN_SYSTEM,
      messages: [{ role: 'user', content: buildPlanPrompt(trip, places, itinSummary) }],
    })
    stream.on('text', (t) => onDelta?.(t))
    const final = await stream.finalMessage()
    const text = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    const items = parsePlanJSON(text, trip.days)
    return { items, source: 'claude' }
  } catch (err) {
    if (err instanceof PlanParseError) throw err
    if (err instanceof Anthropic.AuthenticationError) throw new Error('API key 無效，請到「我的」頁面檢查設定。')
    if (err instanceof Anthropic.RateLimitError) throw new Error('呼叫太頻繁，請稍後再試。')
    throw new Error('生成失敗，請稍後再試。')
  }
}

// ---- 機票截圖辨識 ----

class FlightScanError extends Error {}

const FLIGHT_FIELDS = ['dir', 'airline', 'no', 'date', 'dep', 'depAp', 'arr', 'arrAp', 'terminal', 'seat', 'baggage', 'price']

// structured outputs：由 API 保證回傳格式，不必從自由文字裡撈 JSON
const FLIGHT_SCHEMA = {
  type: 'object',
  properties: {
    legs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dir: { type: 'string', enum: ['outbound', 'return'] },
          airline: { type: 'string' },
          no: { type: 'string' },
          date: { type: 'string' },
          dep: { type: 'string' },
          depAp: { type: 'string' },
          arr: { type: 'string' },
          arrAp: { type: 'string' },
          terminal: { type: 'string' },
          seat: { type: 'string' },
          baggage: { type: 'string' },
          price: { type: 'string' },
        },
        required: FLIGHT_FIELDS,
        additionalProperties: false,
      },
    },
  },
  required: ['legs'],
  additionalProperties: false,
}

const FLIGHT_SYSTEM = `你是機票資訊辨識助手，從使用者提供的機票、電子票券或登機證截圖中擷取航班資訊。
規則：
- 轉機行程必須拆成多段，每一段航班各自一個物件，依實際搭乘順序排列。
- date 用 YYYY-MM-DD；dep、arr 用 24 小時制 HH:MM。
- depAp、arrAp 格式為「機場代碼 名稱」，例如「TPE 桃園」；只看得到代碼就只填代碼。
- price 只填阿拉伯數字，不含貨幣符號與千分位；看不到票價就填空字串。
- dir：回程／返程航班填 return，其餘填 outbound。
- 任何看不到或不確定的欄位一律填空字串。絕對不要猜測、不要自行補上截圖中沒有的資訊。`

const parseDataUrl = (dataUrl) => {
  const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i.exec(String(dataUrl || ''))
  return m ? { mediaType: m[1].toLowerCase(), data: m[2] } : null
}

const cleanLeg = (raw) => {
  const s = (k) => String(raw?.[k] ?? '').trim()
  const leg = {}
  for (const k of FLIGHT_FIELDS) leg[k] = s(k)
  leg.dir = leg.dir === 'return' ? 'return' : 'outbound'
  leg.price = leg.price.replace(/[^0-9]/g, '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(leg.date)) leg.date = ''
  if (!/^\d{2}:\d{2}$/.test(leg.dep)) leg.dep = ''
  if (!/^\d{2}:\d{2}$/.test(leg.arr)) leg.arr = ''
  return leg
}

export async function extractFlightsFromImage(dataUrl) {
  if (!hasApiKey()) throw new FlightScanError('請先到「我的」頁面設定 API key，才能辨識機票截圖。')
  const img = parseDataUrl(dataUrl)
  if (!img) throw new FlightScanError('這個圖片格式不支援，請改用 JPG 或 PNG。')

  const client = new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true })
  try {
    const res = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
      thinking: { type: 'adaptive' },
      system: FLIGHT_SYSTEM,
      output_config: { format: { type: 'json_schema', schema: FLIGHT_SCHEMA } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } },
          { type: 'text', text: '請擷取這張截圖裡的航班資訊。' },
        ],
      }],
    })
    if (res.stop_reason === 'refusal') throw new FlightScanError('無法處理這張圖片，請換一張再試。')
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    let parsed
    try { parsed = JSON.parse(text) } catch { throw new FlightScanError('辨識結果解析失敗，請重試。') }
    const legs = (Array.isArray(parsed?.legs) ? parsed.legs : [])
      .map(cleanLeg)
      .filter((l) => l.airline || l.no || l.depAp || l.arrAp)
    if (!legs.length) throw new FlightScanError('無法從這張圖辨識出航班資訊，請換一張更清楚的截圖。')
    return legs
  } catch (err) {
    if (err instanceof FlightScanError) throw err
    if (err instanceof Anthropic.AuthenticationError) throw new Error('API key 無效，請到「我的」頁面檢查設定。')
    if (err instanceof Anthropic.RateLimitError) throw new Error('呼叫太頻繁，請稍後再試。')
    throw new Error('辨識失敗，請稍後再試。')
  }
}

// ---- AI 預算分析 ----

const BUDGET_SYSTEM = '你是旅遊預算分析助手。用繁體中文寫 3 到 5 句分析文字，依序涵蓋：花費最高的分類、以目前日均花費推算到旅程結束是否會超支、達 50%／85%／100% 預算級距的風險提醒、以及 1 到 2 條具體建議。只根據我提供的數字分析，不要杜撰沒有的資訊，不要用 emoji，不要加標題或前言，直接輸出文案。'

const buildBudgetPrompt = (trip, s) => {
  const lines = [
    `旅程：${trip.name}`,
    `總預算：${trip.sym}${trip.budget}`,
    `已花費：${trip.sym}${Math.round(s.spent)}（${s.p}%）`,
    `天數：第 ${s.elapsed} / ${s.days} 天，剩餘 ${s.remainingDays} 天`,
  ]
  if (s.dailyAvg > 0) lines.push(`目前日均花費：${trip.sym}${Math.round(s.dailyAvg)}，推估總花費：${trip.sym}${Math.round(s.projected)}`)
  if (s.topCats.length) lines.push(`分類花費：${s.topCats.map((c) => `${c.label} ${trip.sym}${Math.round(c.amt)}`).join('、')}`)
  return lines.join('\n')
}

export async function generateBudgetAnalysis(trip, stats, { onDelta } = {}) {
  if (hasApiKey()) return generateBudgetWithClaude(trip, stats, { onDelta })
  const text = mockBudgetAnalysis(trip, stats)
  const chunks = text.match(/[\s\S]{1,6}/g) || [text]
  for (const c of chunks) { onDelta?.(c); await sleep(35) }
  return { text, source: 'mock' }
}

async function generateBudgetWithClaude(trip, stats, { onDelta } = {}) {
  const client = new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true })
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: BUDGET_SYSTEM,
      messages: [{ role: 'user', content: buildBudgetPrompt(trip, stats) }],
    })
    stream.on('text', (t) => onDelta?.(t))
    const final = await stream.finalMessage()
    const text = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    return { text, source: 'claude' }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('API key 無效，請到「我的」頁面檢查設定。')
    if (err instanceof Anthropic.RateLimitError) throw new Error('呼叫太頻繁，請稍後再試。')
    throw new Error('生成失敗，請稍後再試。')
  }
}
