import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { pickImage } from '../lib/image'

export default function CompanionSheet() {
  const { compSheet, closeCompanion, getCompanions, addCompanion, editCompanion, removeCompanion } = useStore()
  const { open, tripId, editId } = compSheet
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [avatar, setAvatar] = useState('')

  useEffect(() => {
    if (!open) return
    const c = editId ? getCompanions(tripId).find((x) => x.id === editId) : null
    setName(c?.name || ''); setContact(c?.contact || ''); setAvatar(c?.avatar || '')
  }, [open, editId, tripId])

  if (!open) return null
  const valid = name.trim()
  const submit = () => {
    if (!valid) return
    const fields = { name: name.trim(), contact: contact.trim(), avatar }
    if (editId) editCompanion(tripId, editId, fields); else addCompanion(tripId, fields)
    closeCompanion()
  }
  const del = () => { if (confirm('移除這位同行者？')) { removeCompanion(tripId, editId); closeCompanion() } }

  return (
    <div className="sheet-overlay" onClick={closeCompanion}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeCompanion} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯同行者' : '新增同行者'}</div>
          <span style={{ width: 40 }} />
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label>頭像</label>
          <div className="row" style={{ gap: 12 }}>
            <button onClick={() => pickImage(setAvatar)} aria-label="上傳頭像" style={{ width: 56, height: 56, borderRadius: '50%', flex: 'none', background: avatar ? `center/cover url(${avatar})` : 'var(--sand)', color: 'var(--muted)', display: 'grid', placeItems: 'center', border: '1px solid var(--line)' }}>
              {!avatar && <Icon name="image" size={20} />}
            </button>
            <span className="muted" style={{ fontSize: 12.5 }}>{avatar ? '點頭像可重新上傳' : '可上傳照片，留空用色塊'}</span>
            {avatar && <button onClick={() => setAvatar('')} style={{ marginLeft: 'auto', color: 'var(--danger)', fontSize: 12.5, fontWeight: 600 }}>移除</button>}
          </div>
        </div>
        <div className="field"><label>姓名</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="同行者姓名" autoFocus /></div>
        <div className="field"><label>聯絡方式</label><input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="電話 / LINE / Email（可留空）" /></div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 18, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '新增'}
        </button>
        {editId && <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}><Icon name="trash" size={17} /> 移除同行者</button>}
      </div>
    </div>
  )
}
