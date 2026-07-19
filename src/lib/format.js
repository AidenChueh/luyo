export const money = (n, sym = '¥') =>
  sym + Math.round(n).toLocaleString('en-US')

export const parseYMD = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const dateRange = (start, end) => {
  const f = (s) => {
    const d = parseYMD(s)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  return `${f(start)} – ${f(end)}`
}

const TODAY = new Date('2026-06-14')

export const countdown = (start) => {
  const d = new Date(start)
  const diff = Math.ceil((d - TODAY) / 86400000)
  if (diff > 0) return { type: 'before', text: `倒數 ${diff} 天` }
  if (diff === 0) return { type: 'today', text: '今天出發' }
  return { type: 'during', text: '旅程進行中' }
}

export const pct = (a, b) => (b ? Math.min(999, Math.round((a / b) * 100)) : 0)
