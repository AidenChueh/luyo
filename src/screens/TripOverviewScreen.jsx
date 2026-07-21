import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import Cover from '../components/Cover'
import { useStore } from '../store'
import { dateRange } from '../lib/format'
import { getQuickOrder, setQuickOrder } from '../lib/settings'
import { useDragSort } from '../lib/dragsort'

const QUICK = [
  { key: 'itinerary', label: '行程', icon: 'calendar', color: 'var(--cat-sight)', bg: 'var(--primary-soft)' },
  { key: 'map', label: '地圖', icon: 'route', color: 'var(--cat-transport)', bg: 'var(--accent-soft)' },
  { key: 'expenses', label: '記帳', icon: 'wallet', color: 'var(--cat-food)', bg: '#FBF0D6' },
  { key: 'journal', label: '日誌', icon: 'journal', color: 'var(--cat-shopping)', bg: '#EFE9F5' },
  { key: 'lists', label: '清單', icon: 'list', color: 'var(--cat-hotel)', bg: '#E2EEF4' },
  { key: 'places', label: '地點', icon: 'mapPin', color: 'var(--cat-souvenir, #B5557E)', bg: '#F8E6EE' },
  { key: 'flights', label: '機票', icon: 'plane', color: 'var(--cat-hotel)', bg: '#E2EEF4' },
  { key: 'stay', label: '住宿', icon: 'bed', color: 'var(--cat-transport)', bg: 'var(--accent-soft)' },
  { key: 'gallery', label: '相簿', icon: 'image', color: 'var(--cat-souvenir, #B5557E)', bg: '#F8E6EE' },
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
  const { getTrip, openTripSheet, deleteTrip, editTrip, askConfirm } = useStore()
  const [menu, setMenu] = useState(false)
  const [quick, setQuick] = useState(() => orderedQuick(getQuickOrder()))
  const drag = useDragSort(quick.map((q) => q.key), (order) => {
    setQuick(orderedQuick(order))
    setQuickOrder(order)
  })
  const trip = getTrip(id)
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
          <button className="iconbtn" onClick={() => nav(-1)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
          <div className="row" style={{ gap: 8 }}>
            <button className="iconbtn" onClick={doShare} aria-label="分享"><Icon name="share" size={19} /></button>
            <button className="iconbtn" onClick={() => setMenu(true)} aria-label="更多"><Icon name="dots" size={19} /></button>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="dest" style={{ color: '#fff' }}><Icon name="mapPin" size={14} /> {trip.country} · {trip.city}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: '4px 0 8px' }}>{trip.name}</h1>
          <div className="trip-meta" style={{ color: '#fff' }}>
            <span><Icon name="calendar" size={13} /> {dateRange(trip.start, trip.end)}</span>
            <span>{trip.days} 天</span>
            <span>{trip.status === 'ongoing' ? `第 ${trip.currentDay} 天` : trip.status === 'completed' ? '已結束' : '尚未出發'}</span>
          </div>
        </div>
      </section>

      <div className="pad section" style={{ marginTop: 18 }}>
        <div className="weather-card">
          <Icon name={trip.weather.icon === 'sun' ? 'sun' : trip.weather.icon === 'cloud' ? 'cloud' : 'cloudSun'} size={34} style={{ color: 'var(--amber)' }} />
          <div>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className="tmp">{trip.weather.tmp}°</span>
              <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{trip.weather.cond}</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>最高 {trip.weather.hi}° · 最低 {trip.weather.lo}° · {trip.city}</div>
          </div>
        </div>
      </div>

      {/* Quick entries */}
      <div className="pad section">
        <div className="between" style={{ marginBottom: 12 }}>
          <div className="section-title" style={{ fontSize: 16 }}>快速入口</div>
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>長按右上角圖示可拖曳排序</span>
        </div>
        <div className="quick-grid">
          {quick.map((q) => {
            const item = drag.item(q.key)
            const handle = drag.handle(q.key)
            return (
              <button key={q.key} className="quick" onClick={() => go(q.key)} {...item} style={item.style}>
                <span {...handle} className="quick-grip" aria-label={`拖曳排序：${q.label}`} style={handle.style}><Icon name="dots" size={14} /></span>
                <span className="ic" style={{ background: q.bg, color: q.color }}><Icon name={q.icon} size={21} /></span>
                <span className="lb">{q.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 同行者 */}
      <div className="pad section">
        <button
          className="card"
          onClick={() => nav(`/trip/${id}/companions`)}
          style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', border: '1px solid var(--line)' }}
        >
          <span className="ic" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="users" size={22} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 15, display: 'block' }}>同行者與分帳</span>
            <span className="muted" style={{ fontSize: 12.5 }}>{trip.companions} 位同行 · 共同支出自動結算</span>
          </span>
          <Icon name="chevronRight" size={18} style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      {/* 旅程總結 */}
      <div className="pad section">
        <button
          className="card"
          onClick={() => nav(`/trip/${id}/summary`)}
          style={{ width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', border: trip.status === 'completed' ? '1px solid var(--primary)' : '1px solid var(--line)' }}
        >
          <span className="ic" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="sparkles" size={22} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 15, display: 'block' }}>旅程總結報告卡</span>
            <span className="muted" style={{ fontSize: 12.5 }}>{trip.status === 'completed' ? '行程已結束，回顧已生成' : '即時彙整花費、地點、日誌'}</span>
          </span>
          <Icon name="chevronRight" size={18} style={{ color: 'var(--muted)' }} />
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
