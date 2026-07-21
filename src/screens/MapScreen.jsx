import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import MapView from '../components/MapView'
import { useStore } from '../store'
import { PLACE_TYPE, ITIN_CAT } from '../data/seed'

const hasCoord = (o) => Number.isFinite(o?.lat) && Number.isFinite(o?.lng)

// 兩點球面距離（km）
const haversine = (a, b) => {
  const R = 6371
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export default function MapScreen() {
  const nav = useNavigate()
  const { id } = useParams()
  const { trips, getTrip, getPlaces, getItinerary } = useStore()
  const trip = (id && getTrip(id)) || trips.find((t) => t.status === 'ongoing') || trips[0]
  const [view, setView] = useState('all') // 'all' | day number

  const places = trip ? getPlaces(trip.id) : []
  const itin = trip ? getItinerary(trip.id) : {}

  // 行程項目本身不存座標，靠名稱/地點對應到地點庫取得座標
  const dayStops = useMemo(() => {
    if (view === 'all') return []
    const items = [...(itin[view] || [])].sort((a, b) => a.start.localeCompare(b.start))
    return items.map((it) => {
      const match = places.find((p) => p.name === it.title || (it.loc && p.name === it.loc))
      return { ...it, lat: match?.lat, lng: match?.lng }
    })
  }, [view, itin, places])

  const markers = useMemo(() => {
    if (view === 'all') {
      return places.filter(hasCoord).map((p) => ({
        id: p.id, name: p.name, lat: p.lat, lng: p.lng,
        color: PLACE_TYPE[p.type].color, sub: PLACE_TYPE[p.type].label,
      }))
    }
    return dayStops.filter(hasCoord).map((s, i) => ({
      id: s.id, name: s.title, lat: s.lat, lng: s.lng,
      color: ITIN_CAT[s.cat].color, sub: `${s.start}–${s.end} · ${ITIN_CAT[s.cat].label}`, n: i + 1,
    }))
  }, [view, places, dayStops])

  const listItems = view === 'all' ? places : dayStops
  const missing = listItems.length - markers.length

  const routeKm = useMemo(() => {
    const pts = markers.filter(hasCoord)
    let d = 0
    for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
    return d
  }, [markers])

  if (!trip) return null
  const dayNums = Array.from({ length: trip.days }, (_, i) => i + 1)

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
        {markers.length === 0 ? (
          <div className="mapview map-empty">
            <div className="placeholder">
              <div className="pic"><Icon name="mapPin" size={30} /></div>
              <div style={{ fontSize: 13.5 }}>
                {listItems.length === 0
                  ? (view === 'all' ? '還沒有收藏地點' : '這天還沒有行程')
                  : '這些項目還沒有定位，到地點頁按「依名稱定位」後就會顯示在地圖上'}
              </div>
            </div>
          </div>
        ) : (
          <MapView markers={markers} route={view !== 'all'} />
        )}

        {view === 'all' ? (
          <div className="map-legend">
            {Object.entries(PLACE_TYPE).map(([k, c]) => (
              <span key={k}><i style={{ background: c.color }} /> {c.label}</span>
            ))}
          </div>
        ) : (
          markers.length > 1 && (
            <div className="row" style={{ gap: 14, marginTop: 12, fontSize: 13, fontWeight: 700 }}>
              <span className="row" style={{ gap: 5 }}><Icon name="route" size={15} style={{ color: 'var(--muted)' }} /> 約 {routeKm.toFixed(1)} km</span>
              <span className="muted" style={{ fontWeight: 600, fontSize: 11.5 }}>直線距離總和</span>
            </div>
          )
        )}

        {missing > 0 && markers.length > 0 && (
          <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
            另有 {missing} 個項目未定位，未顯示在地圖上
          </p>
        )}
      </div>

      {/* 清單 */}
      <div className="pad section">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 10 }}>{view === 'all' ? '收藏地點' : `Day ${view} 路線`}</div>
        <div className="card" style={{ padding: '4px 14px' }}>
          {listItems.map((m, i) => {
            const meta = view === 'all' ? PLACE_TYPE[m.type] : ITIN_CAT[m.cat]
            const n = view === 'all' ? null : i + 1
            return (
              <div key={m.id} className="exp-item" style={{ borderBottom: i < listItems.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="exp-ic" style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)`, color: meta.color }}>
                  {n ? <b style={{ fontFamily: 'var(--font-display)' }}>{n}</b> : <Icon name={meta.icon} size={19} />}
                </span>
                <div>
                  <div className="t">{m.name || m.title}</div>
                  <div className="s">
                    {view === 'all' ? meta.label : `${m.start}–${m.end} · ${meta.label}`}
                    {(m.note || m.loc) ? ` · ${m.note || m.loc}` : ''}
                    {!hasCoord(m) && ' · 未定位'}
                  </div>
                </div>
              </div>
            )
          })}
          {listItems.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>沒有可顯示的項目</div>}
        </div>
      </div>
    </div>
  )
}
