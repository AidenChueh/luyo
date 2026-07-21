import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { parseYMD } from '../lib/format'

function Tile({ p, onOpen }) {
  const [ok, setOk] = useState(!!p.url)
  return (
    <div className="photo" style={{ aspectRatio: p.ar || '1 / 1', background: p.gradient }} onClick={() => onOpen(p)}>
      {ok && p.url && <img className="pimg" src={p.url} alt={p.cap} onError={() => setOk(false)} />}
      {p.loc && <span className="ploc"><Icon name="mapPin" size={10} /> {p.loc}</span>}
      {p.cap && <span className="pcap">{p.cap}</span>}
    </div>
  )
}

export default function GalleryScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getPhotos, openPhoto, removePhoto, askConfirm } = useStore()
  const trip = getTrip(id)
  const [lb, setLb] = useState(null)
  if (!trip) return null

  const photos = getPhotos(id)
  const byDay = useMemo(() => {
    const m = {}
    for (const p of photos) (m[p.day || 0] ||= []).push(p)
    return Object.entries(m).sort((a, b) => a[0] - b[0])
  }, [photos])

  const dayDate = (d) => {
    const dt = parseYMD(trip.start); dt.setDate(dt.getDate() + Number(d) - 1)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  }

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.name}</div>
          <h1>相簿</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => openPhoto(id)} aria-label="新增照片"><Icon name="plus" size={20} /></button>
      </header>

      <div className="pad section" style={{ marginTop: 6 }}>
        <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{photos.length} 張 · 依日分組</div>
        {byDay.length === 0 && (
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>
            <Icon name="image" size={30} style={{ color: 'var(--line-strong)' }} />
            <div style={{ marginTop: 8, fontSize: 13.5 }}>還沒有照片，右上＋ 新增</div>
          </div>
        )}
        {byDay.map(([d, list]) => (
          <div key={d} style={{ marginTop: 20 }}>
            <div className="cat-head" style={{ margin: '0 0 10px' }}>DAY {d} · {dayDate(d)}</div>
            <div className="masonry">
              {list.map((p) => <Tile key={p.id} p={p} onOpen={setLb} />)}
            </div>
          </div>
        ))}
      </div>

      {lb && (
        <div className="lightbox" onClick={() => setLb(null)}>
          <div className="lb-top">
            <button className="iconbtn" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} onClick={() => setLb(null)} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
            <button className="iconbtn" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}
              onClick={(e) => { e.stopPropagation(); askConfirm({ message: '刪除這張照片？', onConfirm: () => { removePhoto(id, lb.id); setLb(null) } }) }} aria-label="刪除照片">
              <Icon name="trash" size={19} />
            </button>
          </div>
          <div className="lb-img" onClick={(e) => e.stopPropagation()}>
            <div style={{ aspectRatio: lb.ar || '3 / 4', background: lb.url ? `center / cover no-repeat url(${lb.url}), ${lb.gradient}` : lb.gradient }} />
          </div>
          <div className="lb-meta">
            <div className="c">{lb.cap || '未命名'}</div>
            <div className="l">
              {lb.loc && <span><Icon name="mapPin" size={12} /> {lb.loc}</span>}
              <span>DAY {lb.day} · {dayDate(lb.day)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
