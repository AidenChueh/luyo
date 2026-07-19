import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { PLACE_TYPE, PLACE_TAG, PLACE_TO_ITIN } from '../data/seed'

const TYPE_FILTERS = [{ key: 'all', label: '全部' }, ...Object.entries(PLACE_TYPE).map(([k, c]) => ({ key: k, label: c.label }))]
const TAG_FILTERS = [{ key: 'all', label: '全部標籤' }, ...Object.entries(PLACE_TAG).map(([k, c]) => ({ key: k, label: c.label }))]

export default function PlacesScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getPlaces, openPlace, openItin } = useStore()
  const trip = getTrip(id)
  const [type, setType] = useState('all')
  const [tag, setTag] = useState('all')

  if (!trip) return null
  const all = getPlaces(id)

  const list = useMemo(
    () => all.filter((p) => (type === 'all' || p.type === type) && (tag === 'all' || p.tag === tag)),
    [all, type, tag],
  )

  const addToItin = (p) => {
    const day = trip.currentDay || 1
    openItin(id, day, null, { title: p.name, cat: PLACE_TO_ITIN[p.type], loc: p.name, note: p.note })
  }

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.city}</div>
          <h1>地點庫</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => openPlace(id)} aria-label="新增地點"><Icon name="plus" size={20} /></button>
      </header>

      <div className="pad" style={{ marginTop: 6 }}>
        <div className="chips">
          {TYPE_FILTERS.map((f) => (
            <button key={f.key} className={`chip ${type === f.key ? 'active' : ''}`} onClick={() => setType(f.key)}>{f.label}</button>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 8 }}>
          {TAG_FILTERS.map((f) => (
            <button key={f.key} className={`chip ${tag === f.key ? 'active' : ''}`} onClick={() => setTag(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="pad section" style={{ marginTop: 16 }}>
        <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{list.length} 個地點</div>
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((p) => {
            const t = PLACE_TYPE[p.type]
            const g = PLACE_TAG[p.tag]
            return (
              <article key={p.id} className="card" style={{ padding: 14 }} onClick={() => openPlace(id, p.id)}>
                <div className="row" style={{ gap: 12 }}>
                  {p.photo
                    ? <span className="exp-ic" style={{ backgroundImage: `url(${p.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    : <span className="exp-ic" style={{ background: `color-mix(in srgb, ${t.color} 10%, transparent)`, color: t.color }}><Icon name={t.icon} size={21} /></span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="between">
                      <span style={{ fontWeight: 600, fontSize: 15.5 }}>{p.name}</span>
                      <span className="tag" style={{ background: g.soft, color: g.color }}>{g.label}</span>
                    </div>
                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                      <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</span>
                      {p.rating > 0 && (
                        <span className="row" style={{ gap: 1, color: 'var(--amber)' }}>
                          {Array.from({ length: p.rating }).map((_, i) => <Icon key={i} name="star" size={12} fill />)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {p.note && <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>{p.note}</div>}
                <div className="foot" style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {p.maps
                    ? <a href={p.maps} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="row" style={{ gap: 5, color: 'var(--primary)', fontSize: 12.5, fontWeight: 700 }}><Icon name="mapPin" size={14} /> Google Maps</a>
                    : <span className="muted" style={{ fontSize: 12.5 }}>無地圖連結</span>}
                  <button className="row" style={{ gap: 5, color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); addToItin(p) }}>
                    <Icon name="plus" size={15} /> 加入行程
                  </button>
                </div>
              </article>
            )
          })}
          {list.length === 0 && (
            <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
              <Icon name="mapPin" size={30} style={{ color: 'var(--line-strong)' }} />
              <div style={{ marginTop: 8, fontSize: 13.5 }}>還沒有地點，右上＋ 新增</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
