import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { decimalInput } from '../lib/format'

export default function StaySheet() {
  const { staySheet, closeStay, getStays, addStay, editStay, removeStay } = useStore()
  const { open, tripId, editId } = staySheet
  const [v, setV] = useState({})

  useEffect(() => {
    if (!open) return
    const s = editId ? getStays(tripId).find((x) => x.id === editId) : null
    setV(s || { name: '', address: '', phone: '', bookingNo: '', checkin: '', checkout: '', price: '', url: '' })
  }, [open, editId, tripId])

  if (!open) return null
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }))
  const valid = (v.name || '').trim()
  const submit = () => {
    if (!valid) return
    const fields = { ...v, price: Number(v.price) || 0 }
    if (editId) editStay(tripId, editId, fields); else addStay(tripId, fields)
    closeStay()
  }
  const del = () => { if (confirm('刪除這筆住宿？')) { removeStay(tripId, editId); closeStay() } }

  return (
    <div className="sheet-overlay" onClick={closeStay}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeStay} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯住宿' : '新增住宿'}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field" style={{ marginTop: 16 }}><label>名稱</label><input type="text" value={v.name || ''} onChange={set('name')} placeholder="飯店名稱" autoFocus /></div>
        <div className="field"><label>地址</label><input type="text" value={v.address || ''} onChange={set('address')} placeholder="地址" /></div>
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>電話</label><input type="text" value={v.phone || ''} onChange={set('phone')} placeholder="+81 ..." /></div>
          <div className="field" style={{ flex: 1 }}><label>訂房編號</label><input type="text" value={v.bookingNo || ''} onChange={set('bookingNo')} placeholder="BK-..." /></div>
        </div>
        <div className="row date-row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}><label>入住</label><input type="date" value={v.checkin || ''} onChange={set('checkin')} /></div>
          <div className="field" style={{ flex: 1 }}><label>退房</label><input type="date" value={v.checkout || ''} onChange={set('checkout')} /></div>
        </div>
        <div className="field"><label>價格（會同步到記帳）</label><input type="text" inputMode="decimal" value={v.price ?? ''} onChange={(e) => setV((p) => ({ ...p, price: decimalInput(e.target.value) }))} placeholder="0" /></div>
        <div className="field"><label>官網連結</label><input type="text" value={v.url || ''} onChange={set('url')} placeholder="https://..." /></div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '新增住宿'}
        </button>
        {editId && <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}><Icon name="trash" size={17} /> 刪除住宿</button>}
      </div>
    </div>
  )
}
