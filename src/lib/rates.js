import { useEffect, useState } from 'react'

export const HOME = 'TWD'
const CACHE_KEY = 'luyo:rates:v1'
const ENDPOINT = `https://open.er-api.com/v6/latest/${HOME}`
const MAX_AGE = 24 * 60 * 60 * 1000

// App 內開放選用的幣別；API 會回上百種，只取這幾種避免選單爆掉
export const CURRENCY_LIST = ['TWD', 'JPY', 'KRW', 'USD', 'AUD', 'EUR', 'THB', 'CNY', 'HKD']

// 抓不到匯率時的備援值（1 外幣 = N 台幣）。數字會過時，僅作為離線與 API 失效時的下限
const FALLBACK = { TWD: 1, JPY: 0.21, KRW: 0.024, USD: 32.1, AUD: 21.3, EUR: 34.8, THB: 0.92, CNY: 4.45, HKD: 4.11 }

let rates = { ...FALLBACK }
let meta = { at: 0, source: 'fallback' }

const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

const isValid = (r) => r && CURRENCY_LIST.every((c) => Number.isFinite(r[c]) && r[c] > 0)

// 啟動時先套用快取，讓首次 render 就有值可用（fetch 是非同步的）
try {
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
  if (cached && isValid(cached.rates)) {
    rates = cached.rates
    meta = { at: cached.at || 0, source: 'cache' }
  }
} catch {
  // 快取毀損 → continue with fallback
}

export const getRates = () => rates
export const getRatesMeta = () => meta

export async function refreshRates({ force = false } = {}) {
  if (!force && meta.source !== 'fallback' && Date.now() - meta.at < MAX_AGE) return false
  try {
    const res = await fetch(ENDPOINT)
    if (!res.ok) return false
    const data = await res.json()
    if (data?.result !== 'success' || !data.rates) return false

    // API 回的是 1 TWD = N 外幣，本表要的是 1 外幣 = N 台幣
    const next = {}
    for (const c of CURRENCY_LIST) {
      const v = Number(data.rates[c])
      if (Number.isFinite(v) && v > 0) next[c] = 1 / v
    }
    if (!isValid(next)) return false

    rates = next
    meta = { at: Date.now(), source: 'live' }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: next, at: meta.at })) } catch {}
    notify()
    return true
  } catch {
    return false
  }
}

// 匯率是模組層狀態，靠訂閱讓畫面在更新完成後重繪
export function useRates() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const fn = () => setTick((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  return meta
}

// from 幣別金額 → to 幣別金額
export const convert = (amt, from, to = HOME) => {
  const rf = rates[from] ?? 1
  const rt = rates[to] ?? 1
  return (amt * rf) / rt
}

export const toHome = (amt, from) => convert(amt, from, HOME)

export const symbolOf = (code) =>
  ({ TWD: 'NT$', JPY: '¥', KRW: '₩', USD: '$', AUD: 'A$', EUR: '€', THB: '฿', CNY: '¥', HKD: 'HK$' }[code] || code + ' ')
