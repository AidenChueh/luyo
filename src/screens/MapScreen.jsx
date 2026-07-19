import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { PLACE_TYPE, ITIN_CAT } from '../data/seed'

// 由字串決定一個穩定的座標（百分比），作為示意地圖位置
const posOf = (str) => {
  let h = 0
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return { x: 12 + (h % 76), y: 18 + (Math.floor(h / 76) % 62) }
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export default function MapScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { trips, getTrip, getPlaces, getItinerary } = useStore()
  const trip = (id && getTrip(id)) || trips.find((t) => t.status === 'ongoing') || trips[0]
  const [view, setView] = useState('all') // 'all' | day number

  if (!trip) return null
  const places = getPlaces(trip.id)
  const itin = getItinerary(trip.id)
  const dayNums = Array.from({ length: trip.days }, (_, i) => i + 1)

  const dayStops = useMemo(() => {
    if (view === 'all') return []
    const items = [...(itin[view] || [])].sort((a, b) => a.start.localeCompare(b.start))
    return items.map((it) => ({ ...it, ...posOf(it.title) }))
  }, [view, itin])

  const markers = view === 'all'
    ? places.map((p) => ({ ...p, ...posOf(p.id), color: PLACE_TYPE[p.type].color, icon: PLACE_TYPE[p.type].icon }))
    : dayStops.map((s, i) => ({ ...s, color: ITIN_CAT[s.cat].color, icon: ITIN_CAT[s.cat].icon, n: i + 1 }))

  const routeLen = useMemo(() => {
    let d = 0
    for (let i = 1; i < dayStops.length; i++) d += dist(dayStops[i - 1], dayStops[i])
    return d
  }, [dayStops])
  const km = (routeLen * 0.16).toFixed(1)
  const mins = Math.round(routeLen * 0.9)

  return (
    <div className="scroll">
      <header className="topbar solid">
        <div>
          <div className="greeting">{trip.country} · {trip.city}</div>
          <h1>地圖</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => nav(`/trip/${trip.id}`)} aria-label="旅程總覽"><Icon name="arrowUpRight" size={19} /></button>
      </header>

      <div className="pad" style={{ marginTop: 6 }}>
        <div className="chips">
          <button className={`chip ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>全部地點</button>
          {dayNums.map((d) => (
            <button key={d} className={`chip ${view === d ? 'active' : ''}`} onClick={() => setView(d)}>Day {d}</button>
          ))}
        </div>
      </div>

      <div className="pad section" style={{ marginTop: 14 }}>
        <div className="mapview">
          <div className="grid" />
          {view !== 'all' && dayStops.length > 1 && (
            <svg className="map-route" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={dayStops.map((s) => `${s.x},${s.y}`).join(' ')}
                fill="none" stroke="var(--primary)" strokeWidth="0.7"
                strokeDasharray="2 1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {markers.map((m) => (
            <div key={m.id} className="map-pin" style={{ left: `${m.x}%`, top: `${m.y}%`, background: m.color }} title={m.name || m.title}>
              <Icon name={m.icon} size={16} />
              {m.n && <span className="map-num">{m.n}</span>}
            </div>
          ))}
          {markers.length === 0 && (
            <div className="placeholder" style={{ position: 'absolute', inset: 0 }}>
              <div style={{ fontSize: 13 }}>這天還沒有行程</div>
            </div>
          )}
        </div>

        {view === 'all' ? (
          <div className="map-legend">
            {Object.entries(PLACE_TYPE).map(([k, c]) => (
              <span key={k}><i style={{ background: c.color }} /> {c.label}</span>
            ))}
          </div>
        ) : (
          dayStops.length > 0 && (
            <div className="row" style={{ gap: 14, marginTop: 12, fontSize: 13, fontWeight: 700 }}>
              <span className="row" style={{ gap: 5 }}><Icon name="route" size={15} style={{ color: 'var(--muted)' }} /> 約 {km} km</span>
              <span className="row" style={{ gap: 5 }}><Icon name="clock" size={15} style={{ color: 'var(--muted)' }} /> 約 {mins} 分</span>
              <span className="muted" style={{ fontWeight: 600, fontSize: 11.5 }}>移動估算</span>
            </div>
          )
        )}
      </div>

      {/* 清單 */}
      <div className="pad section">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 10 }}>{view === 'all' ? '收藏地點' : `Day ${view} 路線`}</div>
        <div className="card" style={{ padding: '4px 14px' }}>
          {(view === 'all' ? markers : markers).map((m, i) => (
            <div key={m.id} className="exp-item" style={{ borderBottom: i < markers.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span className="exp-ic" style={{ background: `color-mix(in srgb, ${m.color} 10%, transparent)`, color: m.color }}>
                {m.n ? <b style={{ fontFamily: 'var(--font-display)' }}>{m.n}</b> : <Icon name={m.icon} size={19} />}
              </span>
              <div>
                <div className="t">{m.name || m.title}</div>
                <div className="s">{view === 'all' ? PLACE_TYPE[m.type].label : `${m.start}–${m.end} · ${ITIN_CAT[m.cat].label}`}{(m.note || m.loc) ? ` · ${m.note || m.loc}` : ''}</div>
              </div>
            </div>
          ))}
          {markers.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>沒有可顯示的項目</div>}
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>
          示意地圖：標記位置與距離為原型估算。正式版會接 Google Maps / Mapbox 顯示真實座標與路線。
        </p>
      </div>
    </div>
  )
}
