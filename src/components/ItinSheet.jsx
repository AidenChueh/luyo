import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { decimalInput, groupNum } from '../lib/format'
import { ITIN_CAT } from '../data/seed'

const EMPTY = { title: '', cat: 'sight', start: '09:00', end: '10:00', loc: '', note: '', est: '', act: '', maps: '' }

const isMapsUrl = (s) => {
  try {
    const u = new URL(s.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    return /(^|\.)(google\.[a-z.]+|goo\.gl|g\.co)$/i.test(u.hostname)
  } catch { return false }
}

export default function ItinSheet() {
  const { itinSheet, closeItin, getTrip, getItinerary, addItin, editItin, removeItin, askConfirm } = useStore()
  const { open, tripId, day, editId, prefill } = itinSheet

  const [form, setForm] = useState(EMPTY)
  const [base, setBase] = useState(EMPTY)
  const [mapsEdit, setMapsEdit] = useState(false)
  const [mapsErr, setMapsErr] = useState(false)
  const [done, setDone] = useState(false)

  const titleRef = useRef(null)
  const locRef = useRef(null)
  const noteRef = useRef(null)
  const estRef = useRef(null)
  const actRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const it = editId ? (getItinerary(tripId)[day] || []).find((x) => x.id === editId) : null
    const next = it
      ? {
          title: it.title, cat: it.cat, start: it.start, end: it.end,
          loc: it.loc || '', note: it.note || '',
          est: String(it.est || ''), act: String(it.act || ''), maps: it.maps || '',
        }
      : { ...EMPTY, title: prefill?.title || '', cat: prefill?.cat || 'sight', loc: prefill?.loc || '', note: prefill?.note || '' }
    setForm(next); setBase(next)
    setMapsEdit(false); setMapsErr(false); setDone(false)
  }, [open, editId, day, tripId])

  if (!open) return null

  const trip = getTrip(tripId)
  const sym = trip?.sym || ''
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const timeErr = form.end <= form.start
  const dirty = Object.keys(EMPTY).some((k) => form[k] !== base[k])
  const canSave = form.title.trim() && !timeErr && !mapsErr && (!editId || dirty)

  const onFocusScroll = (e) => {
    const el = e.target
    setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 260)
  }
  const goNext = (e, ref) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (ref?.current) ref.current.focus()
    else e.target.blur()
  }
  const dismissKeyboard = (e) => {
    if (e.target.closest?.('input, select, textarea, button')) return
    document.activeElement?.blur?.()
  }

  const leave = () => {
    if (!dirty) { closeItin(); return }
    askConfirm({
      title: '尚未儲存變更',
      message: '你有尚未儲存的內容，要離開嗎？',
      confirmText: '放棄變更',
      confirmIcon: 'alert',
      cancelText: '繼續編輯',
      onConfirm: closeItin,
    })
  }

  const submit = () => {
    if (!canSave) return
    const fields = {
      title: form.title.trim(), cat: form.cat, start: form.start, end: form.end,
      loc: form.loc.trim(), note: form.note.trim(),
      est: Number(form.est) || 0, act: Number(form.act) || 0, maps: form.maps.trim(),
    }
    if (editId) editItin(tripId, day, editId, fields)
    else addItin(tripId, day, { ...fields, rating: 0 })
    setDone(true)
    setTimeout(() => { setDone(false); closeItin() }, 900)
  }

  const del = () => {
    askConfirm({
      title: `刪除「${form.title.trim() || '這個行程'}」？`,
      message: '刪除後將無法復原。',
      confirmText: '刪除行程',
      onConfirm: () => { removeItin(tripId, day, editId); closeItin() },
    })
  }

  const applyMaps = (v) => {
    set({ maps: v })
    setMapsErr(!!v.trim() && !isMapsUrl(v))
  }

  return (
    <>
    <div className="sheet-overlay" onClick={leave}>
      <div className="sheet form-sheet trip-form itin-form" onClick={(e) => e.stopPropagation()} onMouseDown={dismissKeyboard}>
        <div className="grabber" />
        <div className="sheet-head">
          <button className="iconbtn" onClick={leave} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div className="t">{editId ? '編輯行程' : `Day ${day} 新增行程`}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field tight">
          <label>標題</label>
          <input
            ref={titleRef} type="text" value={form.title} enterKeyHint="next"
            onChange={(e) => set({ title: e.target.value })}
            onFocus={onFocusScroll}
            onKeyDown={(e) => goNext(e, locRef)}
            placeholder="例如：清水寺散步"
          />
        </div>

        <div className="field">
          <label>分類</label>
          <div className="cat-grid">
            {Object.entries(ITIN_CAT).map(([k, c]) => (
              <button key={k} className={`cat-cell ${form.cat === k ? 'on' : ''}`} onClick={() => set({ cat: k })}>
                <span className="ci" style={{ background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color }}>
                  <Icon name={c.icon} size={17} />
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className={`field ${timeErr ? 'err' : ''}`} style={{ flex: 1 }}>
            <label>開始</label>
            <input type="time" value={form.start} onChange={(e) => set({ start: e.target.value })} onFocus={onFocusScroll} />
          </div>
          <div className={`field ${timeErr ? 'err' : ''}`} style={{ flex: 1 }}>
            <label>結束</label>
            <input type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} onFocus={onFocusScroll} />
          </div>
        </div>
        {timeErr && (
          <div className="field-err">
            <Icon name="alert" size={13} /> 結束時間需晚於開始時間，跨日請拆成兩筆行程
          </div>
        )}

        <div className="field">
          <label>地點</label>
          <input
            ref={locRef} type="text" value={form.loc} enterKeyHint="next"
            onChange={(e) => set({ loc: e.target.value })}
            onFocus={onFocusScroll}
            onKeyDown={(e) => goNext(e, noteRef)}
            placeholder="地點名稱"
          />
        </div>

        <div className="field">
          <label>備註 <span className="opt">（可選）</span></label>
          <textarea
            ref={noteRef} className="note-area" value={form.note} rows={3}
            onChange={(e) => set({ note: e.target.value })}
            onFocus={onFocusScroll}
            placeholder="行程細節、訂位資訊…"
          />
        </div>

        <div className="form-row">
          <div className="field" style={{ flex: 1 }}>
            <label>預估花費</label>
            <div className="money-input">
              <span className="pfx">{sym}</span>
              <input
                ref={estRef} type="text" inputMode="decimal" enterKeyHint="next"
                value={groupNum(form.est)}
                onChange={(e) => set({ est: decimalInput(e.target.value.replace(/,/g, '')) })}
                onFocus={onFocusScroll}
                onKeyDown={(e) => goNext(e, actRef)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>實際花費</label>
            <div className="money-input">
              <span className="pfx">{sym}</span>
              <input
                ref={actRef} type="text" inputMode="decimal" enterKeyHint="done"
                value={groupNum(form.act)}
                onChange={(e) => set({ act: decimalInput(e.target.value.replace(/,/g, '')) })}
                onFocus={onFocusScroll}
                onKeyDown={(e) => goNext(e, null)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <div className="field-hint">填了實際花費會自動同步到記帳</div>

        <div className={`field section-gap ${mapsErr ? 'err' : ''}`}>
          <label>Google Maps {!form.maps && <span className="opt">（可選）</span>}</label>
          {form.maps && !mapsEdit ? (
            <>
              <a className="link-row" href={form.maps} target="_blank" rel="noreferrer">
                <Icon name="mapPin" size={16} style={{ color: 'var(--primary)' }} />
                <span className="lk">已連結 Google Maps</span>
                <Icon name="arrowUpRight" size={16} className="go" />
              </a>
              <div className="link-acts">
                <button onClick={() => setMapsEdit(true)}>更換連結</button>
                <button className="warn" onClick={() => { set({ maps: '' }); setMapsErr(false); setMapsEdit(false) }}>移除</button>
              </div>
            </>
          ) : form.maps || mapsEdit ? (
            <>
              <input
                type="text" inputMode="url" enterKeyHint="done" autoFocus
                value={form.maps}
                onChange={(e) => applyMaps(e.target.value)}
                onFocus={onFocusScroll}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); if (!mapsErr && form.maps.trim()) setMapsEdit(false) } }}
                placeholder="https://maps.app.goo.gl/..."
              />
              {mapsErr && <div className="field-err"><Icon name="alert" size={13} /> 請輸入有效的 Google Maps 連結</div>}
              {!mapsErr && form.maps.trim() && (
                <div className="link-acts"><button onClick={() => setMapsEdit(false)}>完成</button></div>
              )}
            </>
          ) : (
            <button className="upload-btn" onClick={() => setMapsEdit(true)}>
              <Icon name="mapPin" size={16} /> 貼上 Google Maps 連結
            </button>
          )}
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={submit} disabled={!canSave}>
          {editId ? '儲存變更' : '新增行程'}
        </button>
        {editId && (
          <button className="btn btn-block" style={{ marginTop: 24, color: 'var(--danger)' }} onClick={del}>
            <Icon name="trash" size={17} /> 刪除行程
          </button>
        )}
      </div>
    </div>

    {done && (
      <div className="form-done">
        <div className="box">
          <span className="ok"><Icon name="check" size={24} /></span>
          {editId ? '已儲存' : '已新增行程'}
          {Number(form.act) > 0 && <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>已同步至記帳</span>}
        </div>
      </div>
    )}
    </>
  )
}
