import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { PLACE_TYPE, PLACE_TAG } from '../data/seed'
import { pickImage } from '../lib/image'

export default function PlaceSheet() {
  const { placeSheet, closePlace, getPlaces, addPlace, editPlace, removePlace } = useStore()
  const { open, tripId, editId } = placeSheet

  const [name, setName] = useState('')
  const [type, setType] = useState('sight')
  const [tag, setTag] = useState('must')
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [maps, setMaps] = useState('')
  const [photo, setPhoto] = useState('')

  useEffect(() => {
    if (!open) return
    const p = editId ? getPlaces(tripId).find((x) => x.id === editId) : null
    if (p) {
      setName(p.name); setType(p.type); setTag(p.tag); setRating(p.rating || 0); setNote(p.note || ''); setMaps(p.maps || ''); setPhoto(p.photo || '')
    } else {
      setName(''); setType('sight'); setTag('must'); setRating(0); setNote(''); setMaps(''); setPhoto('')
    }
  }, [open, editId, tripId])

  if (!open) return null

  const valid = name.trim()
  const submit = () => {
    if (!valid) return
    const fields = { name: name.trim(), type, tag, rating, note: note.trim(), maps: maps.trim(), photo }
    if (editId) editPlace(tripId, editId, fields)
    else addPlace(tripId, fields)
    closePlace()
  }
  const del = () => { if (confirm('刪除這個地點？')) { removePlace(tripId, editId); closePlace() } }

  return (
    <div className="sheet-overlay" onClick={closePlace}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closePlace} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯地點' : '收藏地點'}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>名稱</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：清水寺" autoFocus />
        </div>

        <div className="field">
          <label>類型</label>
          <div className="chips">
            {Object.entries(PLACE_TYPE).map(([k, c]) => (
              <button key={k} className={`chip ${type === k ? 'active' : ''}`} onClick={() => setType(k)}>
                <Icon name={c.icon} size={14} /> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>標籤</label>
          <div className="chips">
            {Object.entries(PLACE_TAG).map(([k, c]) => (
              <button key={k} className="chip" onClick={() => setTag(k)}
                style={tag === k ? { background: c.color, color: '#fff', borderColor: c.color } : undefined}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>評分</label>
          <div className="row" style={{ gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n === rating ? 0 : n)} aria-label={`評分 ${n} 星`} style={{ color: n <= rating ? 'var(--amber)' : 'var(--line-strong)' }}>
                <Icon name="star" size={28} fill={n <= rating} />
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>備註</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="（可留空）" />
        </div>

        <div className="field">
          <label>Google Maps 連結</label>
          <input type="text" value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="https://maps.google.com/..." />
        </div>

        <div className="field">
          <label>照片</label>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => pickImage(setPhoto)}>
              <Icon name="image" size={17} /> {photo ? '重新上傳' : '從裝置上傳'}
            </button>
            {photo && (
              <div style={{ width: 54, height: 54, borderRadius: 12, backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', flex: 'none', position: 'relative' }}>
                <button onClick={() => setPhoto('')} aria-label="移除圖片" className="img-remove" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 13 }}>×</button>
              </div>
            )}
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 18, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '收藏'}
        </button>
        {editId && (
          <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}>
            <Icon name="trash" size={17} /> 刪除地點
          </button>
        )}
      </div>
    </div>
  )
}
