import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { CATEGORIES } from '../data/seed'
import { getMe } from '../lib/settings'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del']

export default function AddExpenseSheet() {
  const { add, closeAdd, addExpense, editExpense, removeExpense, getExpenses, trips, getTrip, getCompanions, askConfirm } = useStore()
  const editId = add.editId
  const tripId = add.tripId || trips.find((t) => t.status === 'ongoing')?.id
  const trip = getTrip(tripId)
  const companions = tripId ? getCompanions(tripId) : []
  const members = [getMe(), ...companions]

  const [amt, setAmt] = useState('')
  const [cat, setCat] = useState('food')
  const [title, setTitle] = useState('')
  const [loc, setLoc] = useState('')
  const [date, setDate] = useState('2026-06-14')
  const [payer, setPayer] = useState('me')
  const [split, setSplit] = useState(['me'])

  // 開啟時：編輯帶入既有資料，新增則重置
  useEffect(() => {
    if (!add.open) return
    const ex = editId ? (getExpenses(tripId) || []).find((e) => e.id === editId) : null
    if (ex) {
      setAmt(String(ex.amt || '')); setCat(ex.cat || 'food'); setTitle(ex.title || '')
      setLoc(ex.loc || ''); setDate(ex.date || '2026-06-14'); setPayer(ex.payer || 'me'); setSplit(ex.split?.length ? ex.split : ['me'])
    } else {
      setAmt(''); setCat('food'); setTitle(''); setLoc(''); setDate('2026-06-14'); setPayer('me'); setSplit(['me'])
    }
  }, [add.open, editId])

  if (!add.open || !trip) return null

  const toggleSplit = (mid) => setSplit((s) => (s.includes(mid) ? s.filter((x) => x !== mid) : [...s, mid]))
  const allIds = members.map((m) => m.id)
  const splitAll = () => setSplit(split.length === allIds.length ? ['me'] : allIds)

  const press = (k) => {
    if (k === 'del') setAmt((a) => a.slice(0, -1))
    else if (amt.length < 9) setAmt((a) => (a === '' && k === '00' ? '' : a + k))
  }

  const valid = Number(amt) > 0
  const submit = () => {
    if (!valid) return
    const fields = {
      date,
      cat,
      title: title.trim() || CATEGORIES[cat].label,
      amt: Number(amt),
      loc: loc.trim() || trip.city,
      payer,
      split: split.length ? split : ['me'],
    }
    if (editId) editExpense(tripId, editId, fields)
    else addExpense(tripId, fields)
    closeAdd()
  }
  const doDelete = () => {
    askConfirm({ message: '刪除這筆支出？', onConfirm: () => { removeExpense(tripId, editId); closeAdd() } })
  }

  return (
    <div className="sheet-overlay" onClick={closeAdd}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeAdd} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯支出' : '記一筆'} · {trip.name}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="amount-display">
          <span className="cur">{trip.sym}</span>
          <span className={`num ${amt ? '' : 'empty'}`}>{amt ? Number(amt).toLocaleString('en-US') : '0'}</span>
        </div>

        <div className="field">
          <label>分類</label>
          <div className="cat-grid">
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <button
                key={k}
                className={`cat-cell ${cat === k ? 'on' : ''}`}
                style={cat === k ? { color: c.color, background: `color-mix(in srgb, ${c.color} 8%, transparent)` } : undefined}
                onClick={() => setCat(k)}
              >
                <span className="ci" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}><Icon name={c.icon} size={18} /></span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>項目</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`例如：${CATEGORIES[cat].label}（可留空）`} />
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>地點</label>
            <input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder={trip.city} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {members.length > 1 && (
          <>
            <div className="field">
              <label>誰付的</label>
              <div className="chips">
                {members.map((m) => (
                  <button key={m.id} className={`chip ${payer === m.id ? 'active' : ''}`} onClick={() => setPayer(m.id)}>{m.name}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="between" style={{ display: 'flex' }}>
                <span>分給誰（{split.length} 人均分）</span>
                <button onClick={splitAll} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{split.length === allIds.length ? '只算我' : '均分全部'}</button>
              </label>
              <div className="chips">
                {members.map((m) => (
                  <button key={m.id} className="chip" onClick={() => toggleSplit(m.id)}
                    style={split.includes(m.id) ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : undefined}>
                    {split.includes(m.id) && <Icon name="check" size={12} />} {m.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="keypad">
          {KEYS.map((k) => (
            <button key={k} className={`key ${k === 'del' ? 'fn' : ''}`} onClick={() => press(k)} aria-label={k === 'del' ? '退格' : undefined}>
              {k === 'del' ? <Icon name="chevronLeft" size={20} /> : k}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 16, opacity: valid ? 1 : 0.5 }}
          onClick={submit}
          disabled={!valid}
        >
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '新增支出'} {valid ? `· ${trip.sym}${Number(amt).toLocaleString('en-US')}` : ''}
        </button>
        {editId && (
          <button className="btn btn-block" style={{ marginTop: 10, background: 'var(--danger-soft)', color: 'var(--danger)' }} onClick={doDelete}>
            <Icon name="trash" size={18} /> 刪除這筆支出
          </button>
        )}
      </div>
    </div>
  )
}
