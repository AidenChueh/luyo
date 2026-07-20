import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import Cover from '../components/Cover'
import { STATUS } from '../data/seed'
import { useStore } from '../store'
import { money, dateRange, countdown, pct } from '../lib/format'
import { getProfile, getPrefs } from '../lib/settings'

const SORTS = [
  { key: 'soon', label: '即將出發' },
  { key: 'name', label: '名稱' },
  { key: 'budget', label: '預算' },
]
const FILTERS = [
  { key: 'fav', label: '收藏' },
  { key: 'all', label: '全部' },
  { key: 'planning', label: '規劃中' },
  { key: 'ongoing', label: '進行中' },
  { key: 'completed', label: '已完成' },
  { key: 'archived', label: '封存' },
]

function StatusTag({ status }) {
  const s = STATUS[status]
  return (
    <span className="tag" style={{ background: s.soft, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color }} />
      {s.label}
    </span>
  )
}

function MiniBudget({ trip, spent }) {
  const p = pct(spent, trip.budget)
  const barColor = p >= 85 ? 'var(--danger)' : p >= 50 ? 'var(--amber)' : 'var(--accent)'
  return (
    <div className="mini-budget">
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        <span>已花 {money(spent, trip.sym)}</span>
        <span style={{ opacity: 0.9 }}>剩 {money(trip.budget - spent, trip.sym)}</span>
      </div>
      <div className="bar"><i style={{ width: `${Math.min(100, p)}%`, background: barColor }} /></div>
    </div>
  )
}

export default function HomeScreen() {
  const nav = useNavigate()
  const { trips: allTrips, byTrip, getSpent, openTripSheet, toggleFav } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('soon')
  const [filter, setFilter] = useState('all')
  const [notifOpen, setNotifOpen] = useState(false)
  const profile = getProfile()
  const notifsEnabled = getPrefs().notifications

  const notifs = useMemo(() => {
    const out = []
    allTrips.filter((t) => !t.archived).forEach((t) => {
      if (t.status === 'planning') {
        out.push({ id: t.id + '-go', icon: 'calendar', color: 'var(--planning)', soft: 'var(--planning-soft)', title: `${t.name} ${countdown(t.start).text}`, sub: `${dateRange(t.start, t.end)} 出發`, tripId: t.id })
      } else if (t.status === 'ongoing') {
        out.push({ id: t.id + '-on', icon: 'route', color: 'var(--ongoing)', soft: 'var(--ongoing-soft)', title: `${t.name} 進行中`, sub: `第 ${t.currentDay} 天 / 共 ${t.days} 天`, tripId: t.id })
      }
      const p = pct(getSpent(t), t.budget)
      if (p >= 50) {
        const lvl = p >= 100 ? '已超支' : p >= 85 ? '即將超支' : '已使用一半'
        out.push({ id: t.id + '-bud', icon: 'wallet', color: p >= 85 ? 'var(--danger)' : 'var(--amber)', soft: p >= 85 ? 'var(--danger-soft)' : 'var(--amber-soft)', title: `${t.name} 預算${lvl}`, sub: `已使用 ${p}%`, tripId: t.id })
      }
    })
    return out
  }, [allTrips, byTrip])

  const onFav = (e, id) => {
    e.stopPropagation()
    toggleFav(id)
  }

  const list = useMemo(() => {
    let r = allTrips.filter((t) => (filter === 'archived' ? t.archived : !t.archived))
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      r = r.filter((t) => (t.name + t.country + t.city).toLowerCase().includes(k))
    }
    if (filter === 'fav') r = r.filter((t) => t.favorite)
    else if (filter !== 'all' && filter !== 'archived') r = r.filter((t) => t.status === filter)
    r = [...r].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh-Hant')
      if (sort === 'budget') return b.budget - a.budget
      return new Date(a.start) - new Date(b.start)
    })
    return r
  }, [q, sort, filter, allTrips])

  const ongoing = allTrips.find((t) => t.status === 'ongoing' && !t.archived)
  const rest = list.filter((t) => t.id !== ongoing?.id || filter !== 'all')

  return (
    <>
    <div className="scroll">
      <header className="topbar">
        <div>
          <div className="greeting">早安，{profile.name} 👋</div>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => setNotifOpen(true)} aria-label="通知" style={{ position: 'relative' }}>
          <Icon name="bell" size={20} />
          {notifsEnabled && notifs.length > 0 && (
            <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{notifs.length}</span>
          )}
        </button>
      </header>

      <div className="pad">
        <div className="search">
          <Icon name="search" size={19} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋旅程、國家、城市" />
        </div>
      </div>

      <div className="pad section" style={{ marginTop: 16 }}>
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} aria-label={f.key === 'fav' ? '收藏' : undefined} onClick={() => setFilter(f.key)}>
              {f.key === 'fav' ? <Icon name="star" size={13} fill /> : f.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10, fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
          <Icon name="sliders" size={15} /> 排序
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              style={{ color: sort === s.key ? 'var(--primary)' : 'var(--muted)', fontWeight: sort === s.key ? 700 : 600 }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ongoing hero card */}
      {filter === 'all' && !q && ongoing && (
        <div className="pad section">
          <div className="eyebrow" style={{ marginBottom: 10 }}>進行中</div>
          <article className="trip-card big" onClick={() => nav(`/trip/${ongoing.id}`)}>
            <Cover src={ongoing.cover} gradient={ongoing.gradient} />
            <div className="countdown-pill">
              <span className="dot" style={{ background: 'var(--ongoing)' }} />
              第 {ongoing.currentDay} 天 / 共 {ongoing.days} 天
            </div>
            <button className={`fav ${ongoing.favorite ? 'on' : ''}`} onClick={(e) => onFav(e, ongoing.id)} aria-label="收藏">
              <Icon name="star" size={18} fill={ongoing.favorite} />
            </button>
            <div className="body">
              <div className="dest"><Icon name="mapPin" size={14} /> {ongoing.country} · {ongoing.city}</div>
              <div className="trip-name">{ongoing.name}</div>
              <div className="trip-meta">
                <span><Icon name="calendar" size={13} /> {dateRange(ongoing.start, ongoing.end)}</span>
                <span>{ongoing.days} 天</span>
                <span><Icon name="users" size={13} /> {ongoing.companions} 人</span>
              </div>
              <MiniBudget trip={ongoing} spent={getSpent(ongoing)} />
            </div>
          </article>
        </div>
      )}

      {/* Other trips */}
      <div className="pad section">
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="section-title">所有旅程</div>
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{list.length} 趟</span>
        </div>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(filter === 'all' && !q ? rest.filter((t) => t.id !== ongoing?.id) : list).map((t) => (
            <article key={t.id} className="trip-card small" onClick={() => nav(`/trip/${t.id}`)}>
              <Cover src={t.cover} gradient={t.gradient} />
              <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusTag status={t.status} />
                {t.status === 'planning' && (
                  <span className="tag" style={{ background: 'rgba(28,25,23,.34)', color: '#fff', backdropFilter: 'blur(6px)' }}>
                    {countdown(t.start).text}
                  </span>
                )}
              </div>
              <button className={`fav ${t.favorite ? 'on' : ''}`} onClick={(e) => onFav(e, t.id)} aria-label="收藏">
                <Icon name="star" size={17} fill={t.favorite} />
              </button>
              <div className="body">
                <div className="dest"><Icon name="mapPin" size={13} /> {t.country} · {t.city}</div>
                <div className="trip-name" style={{ fontSize: 19 }}>{t.name}</div>
                <div className="trip-meta">
                  <span>{dateRange(t.start, t.end)}</span>
                  <span>{t.days} 天</span>
                </div>
                <MiniBudget trip={t} spent={getSpent(t)} />
              </div>
            </article>
          ))}
          {list.length === 0 && (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
              找不到符合的旅程
            </div>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => openTripSheet()} aria-label="新增旅程"><Icon name="plus" size={26} /></button>
    </div>

      {notifOpen && (
        <div className="sheet-overlay" onClick={() => setNotifOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', paddingBottom: 6 }}>通知</div>
            {!notifsEnabled ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>通知已關閉，可到「我的」開啟</div>
            ) : notifs.length === 0 ? (
              <div style={{ padding: '28px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>目前沒有通知</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    className="card"
                    onClick={() => { setNotifOpen(false); nav(`/trip/${n.tripId}`) }}
                    style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', border: '1px solid var(--line)' }}
                  >
                    <span className="ic" style={{ width: 38, height: 38, borderRadius: 12, background: n.soft, color: n.color, display: 'grid', placeItems: 'center', flex: 'none' }}>
                      <Icon name={n.icon} size={19} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, display: 'block' }}>{n.title}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{n.sub}</span>
                    </span>
                    <Icon name="chevronRight" size={17} style={{ color: 'var(--muted)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
