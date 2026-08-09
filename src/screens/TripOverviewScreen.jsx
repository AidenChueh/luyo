import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import Cover from '../components/Cover'
import { useStore } from '../store'
import { dateRange } from '../lib/format'
import { getQuickOrder, setQuickOrder } from '../lib/settings'
import { useDragSort } from '../lib/dragsort'
import { getWeather } from '../lib/weather'
import { geocode } from '../lib/geocode'

const QUICK = [
  { key: 'itinerary', label: '行程', icon: 'calendar', hue: 'orange' },
  { key: 'flights', label: '機票', icon: 'plane', hue: 'blue' },
  { key: 'stay', label: '住宿', icon: 'bed', hue: 'green' },
  { key: 'lists', label: '清單', icon: 'list', hue: 'blue' },
  { key: 'journal', label: '日誌', icon: 'journal', hue: 'purple' },
  { key: 'gallery', label: '相簿', icon: 'image', hue: 'pink' },
  { key: 'expenses', label: '記帳', icon: 'wallet', hue: 'yellow' },
  { key: 'places', label: '地點', icon: 'mapPin', hue: 'pink' },
  { key: 'map', label: '地圖', icon: 'route', hue: 'green' },
]

const orderedQuick = (order) => {
  if (!order) return QUICK
  const byKey = new Map(QUICK.map((q) => [q.key, q]))
  const kept = order.map((k) => byKey.get(k)).filter(Boolean)
  return [...kept, ...QUICK.filter((q) => !order.includes(q.key))]
}

export default function TripOverviewScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, openTripSheet, deleteTrip, editTrip, askConfirm, getPlaces, requestSync } = useStore()
  const [menu, setMenu] = useState(false)
  const [quick, setQuick] = useState(() => orderedQuick(getQuickOrder()))
  const drag = useDragSort(quick.map((q) => q.key), (order) => {
    setQuick(orderedQuick(order))
    setQuickOrder(order)
    requestSync()
  })
  const trip = getTrip(id)
  const [weather, setWeather] = useState(null)
  const [wxState, setWxState] = useState('loading') // loading | ok | far | error | nogeo

  useEffect(() => {
    if (!trip || trip.status === 'completed') return
    let alive = true
    setWxState('loading')
    ;(async () => {
      let lat = trip.lat, lng = trip.lng
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const p = getPlaces(trip.id).find((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
        if (p) { lat = p.lat; lng = p.lng }
        else {
          try {
            const hit = await geocode(`${trip.city} ${trip.country}`.trim())
            if (hit) { lat = hit.lat; lng = hit.lng }
          } catch { /* 下面統一處理 */ }
        }
        if (Number.isFinite(lat) && Number.isFinite(lng)) editTrip(trip.id, { lat, lng })
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { if (alive) setWxState('nogeo'); return }
      try {
        const target = trip.status === 'ongoing' ? null : trip.start
        const data = await getWeather(trip.id, lat, lng, target)
        if (!alive) return
        if (data) { setWeather(data); setWxState('ok') }
        else setWxState('far')
      } catch {
        if (alive) setWxState('error')
      }
    })()
    return () => { alive = false }
  }, [trip?.id, trip?.status, trip?.start])

  if (!trip) return null

  const doDelete = () => {
    setMenu(false)
    askConfirm({
      message: `刪除「${trip.name}」？此旅程與其記帳紀錄將一併移除。`,
      onConfirm: () => { deleteTrip(id); nav('/') },
    })
  }

  const doShare = async () => {
    const text = `${trip.name}\n${trip.country} · ${trip.city}\n${dateRange(trip.start, trip.end)} · ${trip.days} 天`
    const data = { title: trip.name, text, url: location.href }
    if (navigator.share) {
      try { await navigator.share(data) } catch {}
    } else {
      try { await navigator.clipboard.writeText(`${text}\n${location.href}`); alert('已複製旅程資訊到剪貼簿') } catch { alert(text) }
    }
  }

  const go = (k) => {
    if (drag.justDragged()) return
    if (k === 'itinerary') nav(`/trip/${id}/itinerary`)
    else if (k === 'expenses') nav(`/trip/${id}/expenses`)
    else if (k === 'journal') nav(`/trip/${id}/journal`)
    else if (k === 'lists') nav(`/trip/${id}/prep`)
    else if (k === 'places') nav(`/trip/${id}/places`)
    else if (k === 'flights') nav(`/trip/${id}/logistics?tab=flight`)
    else if (k === 'stay') nav(`/trip/${id}/logistics?tab=stay`)
    else if (k === 'gallery') nav(`/trip/${id}/gallery`)
    else if (k === 'map') nav(`/trip/${id}/map`)
    else alert(`${QUICK.find((q) => q.key === k).label}（原型示意）`)
  }

  return (
    <>
    <div className="scroll">
      <section className="hero">
        <Cover src={trip.cover} gradient={trip.gradient} />
        <div className="hero-top">
          <button className="iconbtn" onClick={() => nav(-1)} aria-label="返回"><Icon name="chevronLeft" size={20} /></button>
          <div className="row" style={{ gap: 8 }}>
            <button className="iconbtn" onClick={doShare} aria-label="分享"><Icon name="share" size={20} /></button>
            <button className="iconbtn" onClick={() => setMenu(true)} aria-label="更多"><Icon name="dots" size={20} /></button>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="dest" style={{ color: '#fff' }}><Icon name="mapPin" size={14} /> {trip.country} · {trip.city}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 0' }}>{trip.name}</h1>
          <div className="trip-meta" style={{ color: '#fff' }}>
            <span>
              {dateRange(trip.start, trip.end)} · {trip.days} 天 ·{' '}
              {trip.status === 'ongoing' ? `第 ${trip.currentDay} 天` : trip.status === 'completed' ? '已結束' : '尚未出發'}
            </span>
          </div>
        </div>
      </section>

      {trip.status !== 'completed' && (
        <div className="pad" style={{ marginTop: 16 }}>
          <div className="weather-card">
            <Icon name={wxState === 'ok' ? weather.icon : 'cloudSun'} size={30} style={{ color: 'var(--amber)' }} />
            <div>
              <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                <span className="tmp">{wxState === 'ok' ? `${weather.tmp}°` : '—'}</span>
                <span className="cond">
                  {wxState === 'ok' ? weather.cond
                    : wxState === 'loading' ? '取得天氣中…'
                    : wxState === 'far' ? '出發前兩週才有預報'
                    : wxState === 'nogeo' ? '無法定位這個城市'
                    : '天氣暫時取不到'}
                </span>
              </div>
              <div className="sub">
                {wxState === 'ok' ? `最高 ${weather.hi}° · 最低 ${weather.lo}° · ${trip.city}` : trip.city}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick entries */}
      <div className="pad" style={{ marginTop: 24 }}>
        <div className="quick-head">
          <div className="section-title" style={{ fontSize: 16 }}>快速入口</div>
          <span className="hint">長按拖曳排序</span>
        </div>
        <div className="quick-grid">
          {quick.map((q) => {
            const item = drag.item(q.key)
            const handle = drag.handle(q.key)
            return (
              <button key={q.key} className="quick" onClick={() => go(q.key)} {...item}>
                <span {...handle} className="quick-grip" aria-label={`拖曳排序：${q.label}`} style={handle.style}><Icon name="grip" size={14} /></span>
                <span className="ic" style={{ background: `var(--feat-${q.hue}-soft)`, color: `var(--feat-${q.hue})` }}>
                  <Icon name={q.icon} size={19} />
                </span>
                <span className="lb">{q.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 同行者 */}
      <div className="pad" style={{ marginTop: 24 }}>
        <button className="feature-card" onClick={() => nav(`/trip/${id}/companions`)}>
          <span className="ic" style={{ background: 'var(--feat-green-soft)', color: 'var(--feat-green)' }}>
            <Icon name="users" size={21} />
          </span>
          <span className="tx">
            <span className="t">同行者與分帳</span>
            <span className="s">{trip.companions} 位同行 · 共同支出自動結算</span>
          </span>
          <Icon name="chevronRight" size={18} className="cv" />
        </button>
      </div>

      {/* 旅程總結 */}
      <div className="pad" style={{ marginTop: 16 }}>
        <button
          className={`feature-card ${trip.status === 'completed' ? 'on' : ''}`}
          onClick={() => nav(`/trip/${id}/summary`)}
        >
          <span className="ic" style={{ background: 'var(--feat-orange-soft)', color: 'var(--primary)' }}>
            <Icon name="sparkles" size={21} />
          </span>
          <span className="tx">
            <span className="t">旅程總結</span>
            <span className="s">{trip.status === 'completed' ? '行程已結束，回顧已生成' : '即時彙整花費、地點與日誌'}</span>
          </span>
          <Icon name="chevronRight" size={18} className="cv" />
        </button>
      </div>
    </div>

      {menu && (
        <div className="sheet-overlay" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', paddingBottom: 6 }}>{trip.name}</div>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10, justifyContent: 'flex-start' }} onClick={() => { setMenu(false); openTripSheet(id) }}>
              <Icon name="sliders" size={18} /> 編輯旅程
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10, justifyContent: 'flex-start' }} onClick={() => { editTrip(id, { archived: !trip.archived }); setMenu(false); if (!trip.archived) nav('/') }}>
              <Icon name="list" size={18} /> {trip.archived ? '取消封存' : '封存旅程'}
            </button>
            <button className="btn btn-block" style={{ marginTop: 10, justifyContent: 'flex-start', background: 'var(--danger-soft)', color: 'var(--danger)' }} onClick={doDelete}>
              <Icon name="alert" size={18} /> 刪除旅程
            </button>
            <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--muted)' }} onClick={() => setMenu(false)}>
              取消
            </button>
          </div>
        </div>
      )}
    </>
  )
}
