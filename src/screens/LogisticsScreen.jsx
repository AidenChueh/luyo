import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { money } from '../lib/format'
import { useDragSort } from '../lib/dragsort'

const nights = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000))

// 無時區資料，僅能以起降時刻差計算；跨午夜視為隔日抵達
const duration = (dep, arr) => {
  const m = (t) => {
    const [h, mi] = (t || '').split(':').map(Number)
    return Number.isFinite(h) && Number.isFinite(mi) ? h * 60 + mi : null
  }
  const a = m(dep), b = m(arr)
  if (a == null || b == null) return ''
  const d = (b - a + 1440) % 1440
  return `${Math.floor(d / 60)}h ${String(d % 60).padStart(2, '0')}m`
}

function FlightCard({ f, onClick, item, handle }) {
  const dur = duration(f.dep, f.arr)
  return (
    <div className="flight-card" onClick={onClick} {...item} style={{ cursor: 'pointer', ...item.style }}>
      <div className="fc-top">
        <span className="row" style={{ gap: 8, fontWeight: 700, fontSize: 14 }}>
          <Icon name="plane" size={17} style={{ color: 'var(--cat-hotel)' }} /> {f.airline} {f.no}
        </span>
        <span className="row" style={{ gap: 8 }}>
          <span className="tag" style={{ background: f.dir === 'outbound' ? 'var(--primary-soft)' : 'var(--accent-soft)', color: f.dir === 'outbound' ? 'var(--primary)' : 'var(--accent)' }}>
            {f.dir === 'outbound' ? '去程' : '回程'}
          </span>
          <span {...handle} title="拖曳排序" aria-label="拖曳排序" style={{ color: 'var(--line-strong)', padding: '2px 0', ...handle.style }}><Icon name="dots" size={16} /></span>
        </span>
      </div>
      <div className="flight-route">
        <div className="pt">
          <div className="code">{(f.depAp || '').split(' ')[0]}</div>
          <div className="time">{f.dep}</div>
          <div className="ap">{(f.depAp || '').split(' ').slice(1).join(' ')}</div>
        </div>
        <div className="mid">
          <span className="row" style={{ gap: 5, justifyContent: 'center' }}>
            <Icon name="plane" size={16} />
            {dur && <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{dur}</span>}
          </span>
          <div className="ln" style={{ margin: '6px 0' }} />
          <div style={{ fontSize: 10.5, fontWeight: 600 }}>{f.date?.slice(5)}</div>
        </div>
        <div className="pt">
          <div className="code">{(f.arrAp || '').split(' ')[0]}</div>
          <div className="time">{f.arr}</div>
          <div className="ap">{(f.arrAp || '').split(' ').slice(1).join(' ')}</div>
        </div>
      </div>
      <div className="fc-foot">
        {f.terminal && <span className="fc-chip">航廈 {f.terminal}</span>}
        {f.seat && <span className="fc-chip">座位 {f.seat}</span>}
        {f.baggage && <span className="fc-chip">行李 {f.baggage}</span>}
      </div>
    </div>
  )
}

export default function LogisticsScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { getTrip, getFlights, getStays, openFlight, openStay, reorderFlights } = useStore()
  const trip = getTrip(id)
  const [tab, setTab] = useState(sp.get('tab') === 'stay' ? 'stay' : 'flight')
  const fl = getFlights(id)
  const drag = useDragSort(fl.map((f) => f.id), (order) => reorderFlights(id, order.map((fid) => fl.find((f) => f.id === fid))))
  if (!trip) return null

  const st = getStays(id)

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.name} · {trip.sym} {trip.currency}</div>
          <h1>交通與住宿</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => (tab === 'flight' ? openFlight(id) : openStay(id))} aria-label={tab === 'flight' ? '新增航班' : '新增住宿'}><Icon name="plus" size={20} /></button>
      </header>

      <div className="pad" style={{ marginTop: 6 }}>
        <div className="chips">
          <button className={`chip ${tab === 'flight' ? 'active' : ''}`} onClick={() => setTab('flight')}><Icon name="plane" size={14} /> 機票</button>
          <button className={`chip ${tab === 'stay' ? 'active' : ''}`} onClick={() => setTab('stay')}><Icon name="bed" size={14} /> 住宿</button>
        </div>
      </div>

      <div className="pad section" style={{ marginTop: 16 }}>
        {tab === 'flight' && (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fl.map((f) => (
              <FlightCard
                key={f.id}
                f={f}
                item={drag.item(f.id)}
                handle={drag.handle(f.id)}
                onClick={() => { if (!drag.justDragged()) openFlight(id, f.id) }}
              />
            ))}
            {fl.length === 0 && <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>還沒有航班，右上＋ 新增</div>}
          </div>
        )}

        {tab === 'stay' && (
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {st.map((s) => (
              <article key={s.id} className="card" style={{ padding: 16 }} onClick={() => openStay(id, s.id)}>
                <div className="between">
                  <span className="row" style={{ gap: 8, fontWeight: 600, fontSize: 15.5 }}>
                    <Icon name="bed" size={18} style={{ color: 'var(--cat-hotel)' }} /> {s.name}
                  </span>
                  <span className="tag" style={{ background: 'var(--sand)', color: 'var(--ink-2)' }}>{nights(s.checkin, s.checkout)} 晚</span>
                </div>
                {s.address && <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}><Icon name="mapPin" size={12} /> {s.address}</div>}
                <div style={{ marginTop: 12 }}>
                  <div className="kv"><span className="k">入住 / 退房</span><span className="v">{s.checkin?.slice(5)} → {s.checkout?.slice(5)}</span></div>
                  <div className="kv"><span className="k">訂房編號</span><span className="v">{s.bookingNo || '—'}</span></div>
                  <div className="kv"><span className="k">電話</span><span className="v">{s.phone || '—'}</span></div>
                  <div className="kv"><span className="k">價格</span><span className="v">{money(s.price, '')}</span></div>
                </div>
                <div className="foot" style={{ marginTop: 12 }}>
                  {s.url
                    ? <a href={s.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="row" style={{ gap: 5, color: 'var(--primary)', fontSize: 12.5, fontWeight: 700 }}><Icon name="arrowUpRight" size={14} /> 官網</a>
                    : <span className="muted" style={{ fontSize: 12.5 }}>無官網</span>}
                </div>
              </article>
            ))}
            {st.length === 0 && <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>還沒有住宿，右上＋ 新增</div>}
          </div>
        )}
      </div>
    </div>
  )
}
