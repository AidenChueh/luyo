import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { decimalInput } from '../lib/format'
import { ITIN_CAT } from '../data/seed'

export default function ItinSheet() {
  const { itinSheet, closeItin, getItinerary, addItin, editItin, removeItin } = useStore()
  const { open, tripId, day, editId, prefill } = itinSheet

  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('sight')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [loc, setLoc] = useState('')
  const [note, setNote] = useState('')
  const [est, setEst] = useState('')
  const [maps, setMaps] = useState('')

  useEffect(() => {
    if (!open) return
    const it = editId ? (getItinerary(tripId)[day] || []).find((x) => x.id === editId) : null
    if (it) {
      setTitle(it.title); setCat(it.cat); setStart(it.start); setEnd(it.end)
      setLoc(it.loc || ''); setNote(it.note || ''); setEst(String(it.est || '')); setMaps(it.maps || '')
    } else {
      setTitle(prefill?.title || ''); setCat(prefill?.cat || 'sight')
      setStart('09:00'); setEnd('10:00')
      setLoc(prefill?.loc || ''); setNote(prefill?.note || ''); setEst(''); setMaps('')
    }
  }, [open, editId, day, tripId])

  if (!open) return null

  const valid = title.trim() && start && end
  const submit = () => {
    if (!valid) return
    const fields = { title: title.trim(), cat, start, end, loc: loc.trim(), note: note.trim(), est: Number(est) || 0, maps: maps.trim() }
    if (editId) editItin(tripId, day, editId, fields)
    else addItin(tripId, day, { ...fields, act: 0, rating: 0 })
    closeItin()
  }
  const del = () => {
    if (confirm('刪除這個行程？')) { removeItin(tripId, day, editId); closeItin() }
  }

  return (
    <div className="sheet-overlay" onClick={closeItin}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeItin} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯行程' : `Day ${day} 新增行程`}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>標題</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：清水寺散步" autoFocus />
        </div>

        <div className="field">
          <label>分類</label>
          <div className="cat-grid">
            {Object.entries(ITIN_CAT).map(([k, c]) => (
              <button key={k} className={`cat-cell ${cat === k ? 'on' : ''}`}
                style={cat === k ? { color: c.color, background: `color-mix(in srgb, ${c.color} 8%, transparent)` } : undefined}
                onClick={() => setCat(k)}>
                <span className="ci" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}><Icon name={c.icon} size={18} /></span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>開始</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>結束</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>地點</label>
          <input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="地點名稱" />
        </div>

        <div className="field">
          <label>備註</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="（可留空）" />
        </div>

        <div className="field">
          <label>預估花費</label>
          <input type="text" inputMode="decimal" value={est} onChange={(e) => setEst(decimalInput(e.target.value))} placeholder="0" />
        </div>

        <div className="field">
          <label>Google Maps 連結（可留空）</label>
          <input type="text" inputMode="url" value={maps} onChange={(e) => setMaps(e.target.value)} placeholder="https://maps.google.com/..." />
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 18, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '新增行程'}
        </button>
        {editId && (
          <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}>
            <Icon name="trash" size={17} /> 刪除行程
          </button>
        )}
      </div>
    </div>
  )
}
