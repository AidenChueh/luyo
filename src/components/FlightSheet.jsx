import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'

export default function FlightSheet() {
  const { flightSheet, closeFlight, getFlights, addFlight, editFlight, removeFlight } = useStore()
  const { open, tripId, editId } = flightSheet
  const [v, setV] = useState({})

  useEffect(() => {
    if (!open) return
    const f = editId ? getFlights(tripId).find((x) => x.id === editId) : null
    setV(f || { dir: 'outbound', airline: '', no: '', date: '', dep: '', depAp: '', arr: '', arrAp: '', terminal: '', seat: '', baggage: '', price: '' })
  }, [open, editId, tripId])

  if (!open) return null
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }))
  const valid = (v.airline || '').trim() && (v.no || '').trim()
  const submit = () => {
    if (!valid) return
    if (editId) editFlight(tripId, editId, v); else addFlight(tripId, v)
    closeFlight()
  }
  const del = () => { if (confirm('刪除這筆航班？')) { removeFlight(tripId, editId); closeFlight() } }

  return (
    <div className="sheet-overlay" onClick={closeFlight}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeFlight} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯航班' : '新增航班'}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field">
          <label>去程 / 回程</label>
          <div className="chips">
            <button className={`chip ${v.dir === 'outbound' ? 'active' : ''}`} onClick={() => setV((p) => ({ ...p, dir: 'outbound' }))}>去程</button>
            <button className={`chip ${v.dir === 'return' ? 'active' : ''}`} onClick={() => setV((p) => ({ ...p, dir: 'return' }))}>回程</button>
          </div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>航空公司</label><input type="text" value={v.airline || ''} onChange={set('airline')} placeholder="長榮航空" autoFocus /></div>
          <div className="field" style={{ width: 110 }}><label>航班編號</label><input type="text" value={v.no || ''} onChange={set('no')} placeholder="BR132" /></div>
        </div>
        <div className="field"><label>日期</label><input type="date" value={v.date || ''} onChange={set('date')} /></div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>起飛時間</label><input type="time" value={v.dep || ''} onChange={set('dep')} /></div>
          <div className="field" style={{ flex: 1 }}><label>起飛機場</label><input type="text" value={v.depAp || ''} onChange={set('depAp')} placeholder="TPE 桃園" /></div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>抵達時間</label><input type="time" value={v.arr || ''} onChange={set('arr')} /></div>
          <div className="field" style={{ flex: 1 }}><label>抵達機場</label><input type="text" value={v.arrAp || ''} onChange={set('arrAp')} placeholder="KIX 關西" /></div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ width: 90 }}><label>航廈</label><input type="text" value={v.terminal || ''} onChange={set('terminal')} placeholder="T1" /></div>
          <div className="field" style={{ flex: 1 }}><label>座位</label><input type="text" value={v.seat || ''} onChange={set('seat')} placeholder="34A / 34B" /></div>
        </div>
        <div className="field"><label>行李額度</label><input type="text" value={v.baggage || ''} onChange={set('baggage')} placeholder="23kg × 2" /></div>
        <div className="field"><label>價格（會同步到記帳）</label><input type="text" inputMode="numeric" value={v.price ?? ''} onChange={(e) => setV((p) => ({ ...p, price: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="0" /></div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '新增航班'}
        </button>
        {editId && <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}><Icon name="trash" size={17} /> 刪除航班</button>}
      </div>
    </div>
  )
}
