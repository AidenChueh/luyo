// 靜態匯率表（以 TWD 為基準，1 外幣 = N 台幣）。原型用固定值，正式版可接 API。
export const HOME = 'TWD'
export const RATES = {
  TWD: 1,
  JPY: 0.21,
  KRW: 0.024,
  USD: 32.1,
  AUD: 21.3,
  EUR: 34.8,
  THB: 0.92,
  CNY: 4.45,
  HKD: 4.11,
}
export const CURRENCY_LIST = Object.keys(RATES)

// from 幣別金額 → to 幣別金額
export const convert = (amt, from, to = HOME) => {
  const rf = RATES[from] ?? 1
  const rt = RATES[to] ?? 1
  return (amt * rf) / rt
}

export const toHome = (amt, from) => convert(amt, from, HOME)

export const symbolOf = (code) =>
  ({ TWD: 'NT$', JPY: '¥', KRW: '₩', USD: '$', AUD: 'A$', EUR: '€', THB: '฿', CNY: '¥', HKD: 'HK$' }[code] || code + ' ')
