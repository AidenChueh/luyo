import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { CATEGORIES } from '../data/seed'
import { useStore } from '../store'
import { money, parseYMD, pct } from '../lib/format'
import { HOME, CURRENCY_LIST, convert, toHome, symbolOf } from '../lib/rates'

function Converter({ defaultFrom, onClose }) {
  const [amt, setAmt] = useState('1000')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(HOME)
  const result = convert(Number(amt) || 0, from, to)
  const Sel = ({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: '12px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 15, color: 'var(--ink)' }}>
      {CURRENCY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  )
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={onClose} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>匯率換算</div>
          <span style={{ width: 40 }} />
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label>金額</label>
          <input type="text" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
        <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1 }}><label>從</label><Sel value={from} onChange={setFrom} /></div>
          <button className="iconbtn ghost" style={{ marginBottom: 4 }} onClick={() => { setFrom(to); setTo(from) }} aria-label="交換幣別"><Icon name="route" size={18} /></button>
          <div className="field" style={{ flex: 1 }}><label>到</label><Sel value={to} onChange={setTo} /></div>
        </div>
        <div className="card" style={{ padding: 18, textAlign: 'center', marginTop: 8 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{symbolOf(from)}{(Number(amt) || 0).toLocaleString()} =</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, marginTop: 4 }}>{symbolOf(to)}{Math.round(result).toLocaleString()}</div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>1 {from} ≈ {symbolOf(to)}{convert(1, from, to).toFixed(2)} · 原型固定匯率</div>
        </div>
      </div>
    </div>
  )
}

function Donut({ slices, total, sym }) {
  const R = 52, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div style={{ position: 'relative', width: 150, height: 150, flex: 'none' }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <g transform="rotate(-90 75 75)">
          {slices.map((s) => {
            const len = (s.value / total) * C
            const el = (
              <circle key={s.key} cx="75" cy="75" r={R} fill="none" stroke={s.color}
                strokeWidth="20" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            )
            offset += len
            return el
          })}
        </g>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 11, fontWeight: 700 }}>總支出</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>{money(total, sym)}</div>
      </div>
    </div>
  )
}

const TABS = [
  { key: 'pie', label: '分類' },
  { key: 'bar', label: '每日' },
  { key: 'trend', label: '趨勢' },
]

export default function ExpensesScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { trips, getTrip, getExpenses, openAdd } = useStore()
  const trip = getTrip(id) || trips.find((t) => t.status === 'ongoing') || trips[0]
  if (!trip) return null
  const list = getExpenses(trip.id) || []
  const [tab, setTab] = useState('pie')
  const [conv, setConv] = useState(false)

  const { byCat, total, byDay } = useMemo(() => {
    const cat = {}, day = {}
    let tot = 0
    for (const e of list) {
      cat[e.cat] = (cat[e.cat] || 0) + e.amt
      day[e.date] = (day[e.date] || 0) + e.amt
      tot += e.amt
    }
    const slices = Object.entries(cat)
      .map(([key, value]) => ({ key, value, color: CATEGORIES[key].color, label: CATEGORIES[key].label }))
      .sort((a, b) => b.value - a.value)
    const days = Object.entries(day).sort((a, b) => new Date(a[0]) - new Date(b[0]))
    return { byCat: slices, total: tot, byDay: days }
  }, [list])

  const maxDay = Math.max(...byDay.map((d) => d[1]), 1)
  const onTripDays = byDay.filter((d) => new Date(d[0]) >= new Date(trip.start))
  const dailyAvg = Math.round(total / Math.max(1, trip.currentDay || trip.days))
  const perPerson = Math.round(total / Math.max(1, trip.companions))
  const remaining = trip.budget - total

  // 趨勢累積
  let acc = 0
  const trend = byDay.map(([d, v]) => { acc += v; return { d, v: acc } })
  const trendMax = acc || 1

  const budgetPct = pct(total, trip.budget)
  const budgetColor = budgetPct >= 85 ? 'var(--danger)' : budgetPct >= 50 ? 'var(--amber)' : 'var(--accent)'

  return (
    <>
    <div className="scroll">
      <header className="topbar solid">
        {id ? <button className="iconbtn ghost" onClick={() => nav(`/trip/${trip.id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button> : null}
        <div>
          <div className="greeting">{trip.name} · {trip.currency}</div>
          <h1>記帳</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => setConv(true)} title="匯率換算" aria-label="匯率換算"><Icon name="route" size={20} /></button>
      </header>

      {/* Budget */}
      <div className="pad section" style={{ marginTop: 6 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="between">
            <div className="section-title" style={{ fontSize: 16 }}>預算進度</div>
            <button className="row" style={{ gap: 4, color: 'var(--primary)', fontSize: 13, fontWeight: 700 }} onClick={() => nav(`/trip/${trip.id}/budget`)}>
              詳情 <Icon name="chevronRight" size={15} />
            </button>
          </div>
          <div className="row" style={{ alignItems: 'baseline', gap: 8, margin: '12px 0 10px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600 }}>{money(total, trip.sym)}</span>
            <span className="muted" style={{ fontWeight: 600 }}>/ {money(trip.budget, trip.sym)}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: budgetColor }}>{budgetPct}%</span>
          </div>
          <div className="track"><i style={{ width: `${Math.min(100, budgetPct)}%`, background: budgetColor }} /></div>
          <div className="between" style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600 }}>
            <span className="muted">每日平均 {money(dailyAvg, trip.sym)}</span>
            <span style={{ color: 'var(--accent)' }}>剩餘 {money(remaining, trip.sym)}</span>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="pad section">
        <div className="stat-grid">
          <div className="stat"><div className="k"><Icon name="wallet" size={14} /> 總支出</div><div className="v">{money(total, trip.sym)}</div><div className="s">{trip.currency !== HOME ? `≈ NT$${Math.round(toHome(total, trip.currency)).toLocaleString()}` : `${list.length} 筆紀錄`}</div></div>
          <div className="stat"><div className="k"><Icon name="calendar" size={14} /> 每日平均</div><div className="v">{money(dailyAvg, trip.sym)}</div><div className="s">第 {trip.currentDay || trip.days} 天</div></div>
          <div className="stat"><div className="k"><Icon name="users" size={14} /> 每人平均</div><div className="v">{money(perPerson, trip.sym)}</div><div className="s">{trip.companions} 人分攤</div></div>
          <div className="stat"><div className="k"><Icon name="chart" size={14} /> 剩餘預算</div><div className="v" style={{ color: 'var(--accent)' }}>{money(remaining, trip.sym)}</div><div className="s">總 {money(trip.budget, trip.sym)}</div></div>
        </div>
      </div>

      {/* Charts */}
      <div className="pad section">
        <div className="card" style={{ padding: 16 }}>
          <div className="chips" style={{ marginBottom: 14 }}>
            {TABS.map((t) => (
              <button key={t.key} className={`chip ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>

          {tab === 'pie' && (
            <div className="row" style={{ gap: 16, alignItems: 'center' }}>
              <Donut slices={byCat} total={total} sym={trip.sym} />
              <ul className="legend" style={{ gridTemplateColumns: '1fr', flex: 1 }}>
                {byCat.map((s) => (
                  <li key={s.key}>
                    <span className="sw" style={{ background: s.color }} />
                    {s.label}
                    <span className="amt">{Math.round((s.value / total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'bar' && (
            <div className="bars">
              {onTripDays.map(([d, v]) => (
                <div className="col" key={d}>
                  <div className="bm" style={{ height: `${(v / maxDay) * 100}%` }} title={money(v, trip.sym)} />
                  <div className="bl">{parseYMD(d).getMonth() + 1}/{parseYMD(d).getDate()}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'trend' && (
            <svg className="trend" viewBox="0 0 300 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {(() => {
                const pts = trend.map((p, i) => [ (i / (trend.length - 1)) * 300, 116 - (p.v / trendMax) * 104 ])
                const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
                const area = `${line} L300 120 L0 120 Z`
                return (<>
                  <path d={area} fill="url(#tg)" />
                  <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </>)
              })()}
            </svg>
          )}
        </div>
      </div>

      {/* List */}
      <div className="pad section">
        <div className="between" style={{ marginBottom: 6 }}>
          <div className="section-title" style={{ fontSize: 16 }}>支出明細</div>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600, display: 'flex', gap: 4, alignItems: 'center' }}>
            <Icon name="wifi" size={13} /> 多幣別已換算
          </span>
        </div>
        <div>
          {[...list].reverse().map((e) => {
            const c = CATEGORIES[e.cat]
            return (
              <div className="exp-item" key={e.id} onClick={() => openAdd(trip.id, e.id)}>
                <span className="exp-ic" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}><Icon name={c.icon} size={20} /></span>
                <div>
                  <div className="t">{e.title}</div>
                  <div className="s">{c.label} · {e.loc} · {parseYMD(e.date).getMonth() + 1}/{parseYMD(e.date).getDate()}</div>
                </div>
                <span className="exp-amt">{money(e.amt, trip.sym)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <button className="fab" onClick={() => openAdd(trip.id)} aria-label="新增支出"><Icon name="plus" size={26} /></button>
    </div>

      {conv && <Converter defaultFrom={trip.currency} onClose={() => setConv(false)} />}
    </>
  )
}
