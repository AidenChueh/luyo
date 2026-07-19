import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import Cover from '../components/Cover'
import { STATUS } from '../data/seed'
import { useStore } from '../store'
import { money, dateRange, pct } from '../lib/format'

const FILTERS = [
  { key: 'fav', label: '收藏' },
  { key: 'all', label: '全部' },
  { key: 'planning', label: '規劃中' },
  { key: 'ongoing', label: '進行中' },
  { key: 'completed', label: '已完成' },
  { key: 'archived', label: '封存' },
]

export default function TripsScreen() {
  const nav = useNavigate()
  const { trips, getSpent, openTripSheet } = useStore()
  const [filter, setFilter] = useState('all')

  // 旅程 tab 直接進入：進行中 → 最近即將出發；皆無時才退回下方清單
  const target = useMemo(() => {
    const act = trips.filter((t) => !t.archived)
    return (
      act.find((t) => t.status === 'ongoing') ||
      act.filter((t) => t.status === 'planning').sort((a, b) => new Date(a.start) - new Date(b.start))[0] ||
      null
    )
  }, [trips])

  const active = useMemo(() => {
    let r = trips.filter((t) => (filter === 'archived' ? t.archived : !t.archived))
    if (filter === 'fav') r = r.filter((t) => t.favorite)
    else if (filter !== 'all' && filter !== 'archived') r = r.filter((t) => t.status === filter)
    return r
  }, [trips, filter])

  if (target) return <Navigate to={`/trip/${target.id}`} replace />

  return (
    <div className="scroll">
      <header className="topbar solid">
        <h1>旅程</h1>
        <div className="grow" />
        <button className="iconbtn" onClick={() => openTripSheet()} aria-label="新增旅程"><Icon name="plus" size={20} /></button>
      </header>

      <div className="pad" style={{ marginTop: 10 }}>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} aria-label={f.key === 'fav' ? '收藏' : undefined} onClick={() => setFilter(f.key)}>
              {f.key === 'fav' ? <Icon name="star" size={13} fill /> : f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pad section" style={{ marginTop: 16 }}>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map((t) => {
            const s = STATUS[t.status]
            const spent = getSpent(t)
            const p = pct(spent, t.budget)
            return (
              <article key={t.id} className="card" style={{ display: 'flex', gap: 0, overflow: 'hidden', padding: 0 }} onClick={() => nav(`/trip/${t.id}`)}>
                <div style={{ position: 'relative', width: 108, flex: 'none' }}>
                  <Cover src={t.cover} gradient={t.gradient} />
                </div>
                <div style={{ padding: 13, flex: 1, minWidth: 0 }}>
                  <span className="tag" style={{ background: s.soft, color: s.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color }} /> {s.label}
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '7px 0 3px' }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                    <span><Icon name="mapPin" size={12} /> {t.city}</span>
                    <span>{dateRange(t.start, t.end)}</span>
                  </div>
                  <div className="track" style={{ height: 6, marginTop: 10 }}>
                    <i style={{ width: `${Math.min(100, p)}%`, background: p >= 85 ? 'var(--danger)' : p >= 50 ? 'var(--amber)' : 'var(--accent)' }} />
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>{money(spent, t.sym)} / {money(t.budget, t.sym)}</div>
                </div>
              </article>
            )
          })}
          {active.length === 0 && (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
              找不到符合的旅程
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
