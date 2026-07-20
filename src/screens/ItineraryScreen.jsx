import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { ITIN_CAT } from '../data/seed'
import { useStore } from '../store'
import { money, parseYMD } from '../lib/format'
import { generatePlan, getPlan, savePlan } from '../lib/ai'

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const fmtGap = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60
  if (h && m) return `空檔 ${h} 小時 ${m} 分`
  if (h) return `空檔 ${h} 小時`
  return `空檔 ${m} 分`
}

function AIPlanCard({ trip }) {
  const { getPlaces, getItinerary, addItin } = useStore()
  const [items, setItems] = useState(() => getPlan(trip.id)?.items || [])
  const [source, setSource] = useState(() => getPlan(trip.id)?.source || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(() => new Set())

  useEffect(() => {
    const saved = getPlan(trip.id)
    setItems(saved?.items || [])
    setSource(saved?.source || '')
    setApplied(new Set())
    setError('')
  }, [trip.id])

  const generate = async () => {
    setLoading(true); setError(''); setApplied(new Set())
    try {
      const places = getPlaces(trip.id)
      const itin = getItinerary(trip.id)
      const doneCount = Object.values(itin).reduce((a, d) => a + d.length, 0)
      const summary = doneCount ? `目前已有 ${doneCount} 項行程` : ''
      const res = await generatePlan(trip, places, summary, {})
      setItems(res.items); setSource(res.source)
      savePlan(trip.id, { items: res.items, source: res.source, at: Date.now() })
    } catch (err) {
      setError(err.message || '生成失敗')
    } finally {
      setLoading(false)
    }
  }

  const applyOne = (idx) => {
    const it = items[idx]
    addItin(trip.id, it.day, { title: it.title, cat: it.cat, start: it.start, end: it.end, loc: it.loc, note: it.note, est: 0, act: 0, rating: 0 })
    setApplied((prev) => new Set(prev).add(idx))
  }

  const applyAll = () => {
    items.forEach((it, idx) => { if (!applied.has(idx)) applyOne(idx) })
  }

  const grouped = {}
  items.forEach((it, idx) => { (grouped[it.day] ||= []).push({ ...it, idx }) })
  const dayKeys = Object.keys(grouped).sort((a, b) => a - b)

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div className="section-title row" style={{ fontSize: 16, gap: 6 }}>
          <Icon name="sparkles" size={17} /> AI 行程規劃
        </div>
        {source && !loading && (
          <span className="tag" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            {source === 'claude' ? 'Claude 生成' : '範例生成'}
          </span>
        )}
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      {items.length === 0 && !loading && (
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>依旅程資料與地點庫生成每日行程草稿，可逐項或整批加入時間軸。未設定 API key 時使用範例生成。</p>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {dayKeys.map((d) => (
            <div key={d} style={{ marginBottom: 8 }}>
              <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, margin: '8px 0 4px' }}>DAY {d}</div>
              {grouped[d].map((it) => {
                const c = ITIN_CAT[it.cat] || ITIN_CAT.sight
                const isApplied = applied.has(it.idx)
                return (
                  <div key={it.idx} className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="tag" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color, marginRight: 6 }}>
                        <Icon name={c.icon} size={11} /> {c.label}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{it.title}</span>
                      <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{it.start}–{it.end}{it.loc ? `・${it.loc}` : ''}</div>
                    </div>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '6px 12px', fontSize: 12.5, flexShrink: 0 }}
                      onClick={() => applyOne(it.idx)}
                      disabled={isApplied}
                      aria-label={isApplied ? '已加入行程' : `加入「${it.title}」`}
                    >
                      {isApplied ? <Icon name="check" size={15} /> : '加入'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        {items.length > 0 && (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyAll}>
            <Icon name="check" size={17} /> 套用全部
          </button>
        )}
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={generate} disabled={loading}>
          <Icon name={loading ? 'clock' : 'sparkles'} size={17} />
          {loading ? ' 生成中…' : items.length ? ' 重新生成' : ' 生成草稿'}
        </button>
      </div>
    </div>
  )
}

export default function ItineraryScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getItinerary, openItin, copyItinDay } = useStore()
  const trip = getTrip(id)
  const [day, setDay] = useState(() => Math.min(trip?.currentDay || 1, trip?.days || 1))

  useEffect(() => {
    setDay(Math.min(trip?.currentDay || 1, trip?.days || 1))
  }, [id])

  if (!trip) return null
  const data = getItinerary(id)
  const items = [...(data[day] || [])].sort((a, b) => toMin(a.start) - toMin(b.start))

  // 衝突偵測：時間區間重疊
  const conflicts = new Set()
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (toMin(items[i].start) < toMin(items[j].end) && toMin(items[j].start) < toMin(items[i].end)) {
        conflicts.add(items[i].id); conflicts.add(items[j].id)
      }

  const dayCost = items.reduce((s, it) => s + (it.act || it.est || 0), 0)
  const dayNums = Array.from({ length: trip.days }, (_, i) => i + 1)

  const copyDay = () => {
    if (day >= trip.days) { alert('已經是最後一天'); return }
    copyItinDay(id, day, day + 1)
    setDay(day + 1)
  }

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.city}</div>
          <h1>行程規劃</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => openItin(id, day)} aria-label="新增行程"><Icon name="plus" size={20} /></button>
      </header>

      <div className="pad" style={{ marginTop: 6 }}>
        <div className="daybar">
          {dayNums.map((d) => {
            const dt = parseYMD(trip.start); dt.setDate(dt.getDate() + d - 1)
            const n = (data[d] || []).length
            return (
              <button key={d} className={`daypill ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>
                <div className="d">DAY {d}</div>
                <div className="n">{dt.getMonth() + 1}/{dt.getDate()}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* AI 行程規劃暫時隱藏（保留 AIPlanCard 實作，之後要開啟時取消註解即可）
      <div className="pad section">
        <AIPlanCard trip={trip} />
      </div>
      */}

      <div className="pad section" style={{ marginTop: 16 }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{items.length} 個行程</div>
          <div className="row" style={{ gap: 6, fontSize: 13, fontWeight: 700 }}>
            <Icon name="wallet" size={15} style={{ color: 'var(--muted)' }} />
            當日預估 {money(dayCost, trip.sym)}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
            <Icon name="calendar" size={30} style={{ color: 'var(--line-strong)' }} />
            <div style={{ marginTop: 8, fontSize: 13.5 }}>還沒有行程，點下方「加行程」新增</div>
          </div>
        ) : (
          <div className="timeline">
            {items.map((it, idx) => {
              const c = ITIN_CAT[it.cat]
              const next = items[idx + 1]
              const gap = next ? toMin(next.start) - toMin(it.end) : 0
              const hasConflict = conflicts.has(it.id)
              return (
                <div key={it.id}>
                  <div className="tl-item fade-up" style={{ animationDelay: `${idx * 0.04}s` }}>
                    <div className="tl-time">{it.start}<small>{it.end}</small></div>
                    {idx < items.length - 1 && <div className="tl-line" />}
                    <div className="tl-dot" style={{ background: c.color }} />
                    <div className="tl-card" style={{ borderLeftColor: c.color }} onClick={() => openItin(id, day, it.id)}>
                      <div className="between">
                        <span className="tag" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}>
                          <Icon name={c.icon} size={12} /> {c.label}
                        </span>
                        {it.rating > 0 && (
                          <span className="row" style={{ gap: 2, color: 'var(--amber)' }}>
                            {Array.from({ length: it.rating }).map((_, i) => <Icon key={i} name="star" size={12} fill />)}
                          </span>
                        )}
                      </div>
                      <div className="t" style={{ marginTop: 8 }}>{it.title}</div>
                      {it.loc && <div className="loc"><Icon name="mapPin" size={13} /> {it.loc}</div>}
                      {it.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{it.note}</div>}
                      {hasConflict && (
                        <div className="conflict"><Icon name="alert" size={14} /> 時間與其他行程重疊，建議調整</div>
                      )}
                      <div className="foot">
                        <span className="row" style={{ gap: 5, color: 'var(--primary)', fontSize: 12.5, fontWeight: 700 }}>
                          <Icon name="mapPin" size={14} /> Google Maps
                        </span>
                        <span className="cost">{it.act ? money(it.act, trip.sym) : it.est ? `預估 ${money(it.est, trip.sym)}` : '—'}</span>
                      </div>
                    </div>
                  </div>
                  {next && gap > 0 && (
                    <div className="gap-note" style={{ marginLeft: 0 }}>
                      <span className="ln" /> <Icon name="clock" size={13} /> {fmtGap(gap)} <span className="ln" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={copyDay} disabled={items.length === 0}>
            <Icon name="copy" size={17} /> 複製到隔天
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => openItin(id, day)}>
            <Icon name="plus" size={18} /> 加行程
          </button>
        </div>
      </div>
    </div>
  )
}
