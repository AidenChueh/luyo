import { getMe } from './settings'

// 由支出計算每人淨額與最少筆數的還款建議
export function settle(expenses, companions) {
  const people = [getMe(), ...companions]
  const ids = people.map((p) => p.id)
  const paid = Object.fromEntries(ids.map((i) => [i, 0]))
  const owed = Object.fromEntries(ids.map((i) => [i, 0]))

  for (const e of expenses) {
    const payer = e.payer || 'me'
    const split = e.split && e.split.length ? e.split : [payer]
    if (paid[payer] === undefined) continue
    paid[payer] += e.amt
    const share = e.amt / split.length
    for (const s of split) if (owed[s] !== undefined) owed[s] += share
  }

  const net = ids.map((id) => ({ id, name: people.find((p) => p.id === id).name, color: people.find((p) => p.id === id).color, value: Math.round(paid[id] - owed[id]) }))

  // 貪婪結算：欠款者付給被欠者
  const debtors = net.filter((n) => n.value < 0).map((n) => ({ ...n, v: -n.value })).sort((a, b) => b.v - a.v)
  const creditors = net.filter((n) => n.value > 0).map((n) => ({ ...n, v: n.value })).sort((a, b) => b.v - a.v)
  const transfers = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v)
    if (amt > 0) transfers.push({ from: debtors[i], to: creditors[j], amt: Math.round(amt) })
    debtors[i].v -= amt; creditors[j].v -= amt
    if (debtors[i].v <= 1) i++
    if (creditors[j].v <= 1) j++
  }
  return { net, transfers, people }
}
