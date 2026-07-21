import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { PREP_PRIORITY, PACK_CATS } from '../data/seed'
import { money, decimalInput } from '../lib/format'

const TABS = [
  { key: 'todo', label: '待辦', icon: 'check' },
  { key: 'packing', label: '打包', icon: 'bag' },
  { key: 'shopping', label: '購物', icon: 'gift' },
]

function Progress({ list }) {
  const done = list.filter((i) => i.done).length
  const p = list.length ? Math.round((done / list.length) * 100) : 0
  return (
    <div className="prep-progress">
      <div className="track" style={{ height: 8 }}><i style={{ width: `${p}%`, background: 'var(--accent)' }} /></div>
      <span className="n">{done}/{list.length}</span>
    </div>
  )
}

function Row({ item, label, onToggle, onRemove, drag }) {
  return (
    <div className={`check-row ${item.done ? 'done' : ''}`} {...(drag?.attrs || {})}>
      <button className={`check ${item.done ? 'on' : ''}`} onClick={onToggle} aria-label={item.done ? '取消完成' : '標記完成'}>
        {item.done && <Icon name="check" size={15} stroke={2.5} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>{label}</div>
      {drag && <span style={{ color: 'var(--line-strong)', cursor: 'grab', padding: '0 2px' }} title="拖曳排序"><Icon name="dots" size={16} /></span>}
      <button className="del" onClick={onRemove} aria-label="刪除" style={{ fontSize: 20, lineHeight: 1 }}>×</button>
    </div>
  )
}

export default function PrepScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getPrep, togglePrep, addPrep, removePrep, reorderPrep } = useStore()
  const [dragId, setDragId] = useState(null)
  const trip = getTrip(id)
  const [tab, setTab] = useState('todo')
  const [draft, setDraft] = useState('')
  const [packCat, setPackCat] = useState('documents')
  const [priority, setPriority] = useState('mid')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')

  if (!trip) return null
  const prep = getPrep(id)

  const onDrop = (kind, list, targetId) => {
    if (!dragId || dragId === targetId) return
    const arr = [...list]
    const from = arr.findIndex((i) => i.id === dragId)
    const to = arr.findIndex((i) => i.id === targetId)
    if (from < 0 || to < 0) return
    const [m] = arr.splice(from, 1)
    arr.splice(to, 0, m)
    reorderPrep(id, kind, arr)
    setDragId(null)
  }
  const dragProps = (kind, list, item) => ({
    attrs: {
      draggable: true,
      onDragStart: () => setDragId(item.id),
      onDragOver: (e) => e.preventDefault(),
      onDrop: () => onDrop(kind, list, item.id),
      onDragEnd: () => setDragId(null),
      style: { opacity: dragId === item.id ? 0.4 : 1 },
    },
  })

  const submit = () => {
    const text = draft.trim()
    if (tab === 'shopping') {
      if (!text) return
      addPrep(id, 'shopping', { name: text, qty: Number(qty) || 1, price: Number(price) || 0 })
      setQty('1'); setPrice('')
    } else if (tab === 'packing') {
      if (!text) return
      addPrep(id, 'packing', { cat: packCat, text })
    } else {
      if (!text) return
      addPrep(id, 'todo', { text, priority, due: '' })
    }
    setDraft('')
  }

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.name} · {trip.sym} {trip.currency}</div>
          <h1>行前準備</h1>
        </div>
      </header>

      <div className="pad" style={{ marginTop: 6 }}>
        <div className="chips">
          {TABS.map((t) => (
            <button key={t.key} className={`chip ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pad section" style={{ marginTop: 16 }}>
        <Progress list={prep[tab]} />

        {/* 新增列（進度條下方） */}
        {tab === 'packing' && (
          <div className="chips" style={{ marginTop: 14 }}>
            {Object.entries(PACK_CATS).map(([ck, c]) => (
              <button key={ck} className={`chip ${packCat === ck ? 'active' : ''}`} onClick={() => setPackCat(ck)}>{c.label}</button>
            ))}
          </div>
        )}
        {tab === 'todo' && (
          <div className="chips" style={{ marginTop: 14 }}>
            {Object.entries(PREP_PRIORITY).map(([pk2, pr]) => (
              <button key={pk2} className={`chip ${priority === pk2 ? 'active' : ''}`} onClick={() => setPriority(pk2)}>
                <span style={{ color: priority === pk2 ? 'inherit' : pr.color }}>●</span> {pr.label}優先
              </button>
            ))}
          </div>
        )}
        <div className="addbar" style={{ marginTop: 12 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={tab === 'shopping' ? '想買的品項' : tab === 'packing' ? `新增到「${PACK_CATS[packCat].label}」` : '新增待辦'}
          />
          {tab === 'shopping' && (
            <>
              <input className="addbar-num" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))} placeholder="數" aria-label="數量" />
              <input className="addbar-num addbar-price" inputMode="decimal" value={price} onChange={(e) => setPrice(decimalInput(e.target.value))} placeholder="單價" aria-label="單價" />
            </>
          )}
          <button className="add-btn" onClick={submit} disabled={!draft.trim()} aria-label="新增"><Icon name="plus" size={22} /></button>
        </div>

        {/* 待辦 */}
        {tab === 'todo' && (
          <div className="card" style={{ padding: '4px 14px', marginTop: 12 }}>
            {prep.todo.map((it) => {
              const pr = PREP_PRIORITY[it.priority]
              return (
                <Row key={it.id} item={it} drag={dragProps('todo', prep.todo, it)} onToggle={() => togglePrep(id, 'todo', it.id)} onRemove={() => removePrep(id, 'todo', it.id)}
                  label={
                    <div>
                      <div className="ct">{it.text}</div>
                      <div className="row" style={{ gap: 8, marginTop: 3 }}>
                        <span className="tag" style={{ background: 'transparent', color: pr.color, padding: 0, fontSize: 11 }}>● {pr.label}優先</span>
                        {it.due && <span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}><Icon name="calendar" size={11} /> {it.due.slice(5)}</span>}
                      </div>
                    </div>
                  } />
              )
            })}
            {prep.todo.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>還沒有待辦，下方輸入新增</div>}
          </div>
        )}

        {/* 打包 */}
        {tab === 'packing' && (
          <div style={{ marginTop: 4 }}>
            {Object.entries(PACK_CATS).map(([ck, c]) => {
              const items = prep.packing.filter((i) => i.cat === ck)
              if (!items.length) return null
              return (
                <div key={ck}>
                  <div className="cat-head"><Icon name={c.icon} size={13} /> {c.label}</div>
                  <div className="card" style={{ padding: '2px 14px' }}>
                    {items.map((it) => (
                      <Row key={it.id} item={it} label={<span className="ct">{it.text}</span>}
                        onToggle={() => togglePrep(id, 'packing', it.id)} onRemove={() => removePrep(id, 'packing', it.id)} />
                    ))}
                  </div>
                </div>
              )
            })}
            {prep.packing.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>還沒有打包項目，下方輸入新增</div>}
          </div>
        )}

        {/* 購物 */}
        {tab === 'shopping' && (
          <div style={{ marginTop: 4 }}>
            <div className="card" style={{ padding: '4px 14px' }}>
              {prep.shopping.map((it) => (
                <Row key={it.id} item={it} drag={dragProps('shopping', prep.shopping, it)} onToggle={() => togglePrep(id, 'shopping', it.id)} onRemove={() => removePrep(id, 'shopping', it.id)}
                  label={
                    <div className="between">
                      <span className="ct">{it.name} <span className="muted" style={{ fontSize: 12 }}>×{it.qty}</span></span>
                      {it.price > 0 && <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>{money(it.price * it.qty, '')}</span>}
                    </div>
                  } />
              ))}
              {prep.shopping.length === 0 && <div className="muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>還沒有想買的，下方輸入新增</div>}
            </div>
            {prep.shopping.length > 0 && (
              <div className="between" style={{ marginTop: 10, fontSize: 13, fontWeight: 700 }}>
                <span className="muted">預估總額</span>
                <span>{money(prep.shopping.reduce((s, i) => s + i.price * i.qty, 0), '')}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
