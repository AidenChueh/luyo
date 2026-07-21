import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { pickImage } from '../lib/image'
import { extractFlightsFromImage } from '../lib/ai'
import { decimalInput } from '../lib/format'

export default function FlightSheet() {
  const { flightSheet, closeFlight, getFlights, addFlight, editFlight, removeFlight } = useStore()
  const { open, tripId, editId } = flightSheet
  const [v, setV] = useState({})
  const [scanning, setScanning] = useState(false)
  const [scanErr, setScanErr] = useState('')
  const [legs, setLegs] = useState([])

  useEffect(() => {
    if (!open) return
    const f = editId ? getFlights(tripId).find((x) => x.id === editId) : null
    setV(f || { dir: 'outbound', airline: '', no: '', date: '', dep: '', depAp: '', arr: '', arrAp: '', terminal: '', seat: '', baggage: '', price: '' })
    setScanning(false); setScanErr(''); setLegs([])
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

  // 截圖只在記憶體中傳給 API，不寫入 localStorage
  const scan = () => {
    setScanErr(''); setLegs([])
    pickImage(
      async (dataUrl) => {
        setScanning(true); setScanErr('')
        try {
          const found = await extractFlightsFromImage(dataUrl)
          if (found.length === 1) setV((p) => ({ ...p, ...found[0] }))
          else setLegs(found)
        } catch (e) {
          setScanErr(e.message || '辨識失敗')
        } finally {
          setScanning(false)
        }
      },
      { max: 1600, quality: 0.85, onError: (m) => setScanErr(m) },
    )
  }

  const createAll = () => {
    legs.forEach((l) => addFlight(tripId, l))
    closeFlight()
  }
  const legLabel = (l) => `${l.depAp || '—'} → ${l.arrAp || '—'}`
  const legSub = (l) => [`${l.airline} ${l.no}`.trim(), l.date, l.dep && `${l.dep}–${l.arr}`].filter(Boolean).join(' · ')

  return (
    <div className="sheet-overlay" onClick={closeFlight}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeFlight} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯航班' : '新增航班'}</div>
          <span style={{ width: 40 }} />
        </div>

        {/* 機票截圖辨識暫時關閉（需另外付費的 API 額度）。scan/createAll 與 lib/ai.js 的
            extractFlightsFromImage 都保留，要開啟時把這段註解拿掉即可。
        <div className="field" style={{ marginTop: 16 }}>
          <label>從截圖自動帶入</label>
          <button className="btn btn-ghost btn-block" onClick={scan} disabled={scanning}>
            <Icon name={scanning ? 'clock' : 'image'} size={17} /> {scanning ? '辨識中…' : '上傳機票截圖'}
          </button>
          {scanErr && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 6 }}>{scanErr}</div>}
          {!scanErr && !legs.length && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>辨識後會填入下方欄位，存檔前可自行修改</div>
          )}

          {legs.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                辨識到 {legs.length} 段航班（轉機），點單段可載入下方表單
              </div>
              <div className="card" style={{ padding: '4px 12px' }}>
                {legs.map((l, i) => (
                  <button
                    key={i}
                    onClick={() => { setV((p) => ({ ...p, ...l })); setLegs([]) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 2px', borderBottom: i < legs.length - 1 ? '1px solid var(--line)' : 'none' }}
                  >
                    <span className="exp-ic" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', flex: 'none' }}>
                      <b style={{ fontFamily: 'var(--font-display)' }}>{i + 1}</b>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{legLabel(l)}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{legSub(l) || '—'}</span>
                    </span>
                  </button>
                ))}
              </div>
              {!editId && (
                <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={createAll}>
                  <Icon name="check" size={18} /> 建立 {legs.length} 張機票卡片
                </button>
              )}
            </div>
          )}
        </div>
        */}

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
        <div className="field"><label>價格（會同步到記帳）</label><input type="text" inputMode="decimal" value={v.price ?? ''} onChange={(e) => setV((p) => ({ ...p, price: decimalInput(e.target.value) }))} placeholder="0" /></div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '新增航班'}
        </button>
        {editId && <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}><Icon name="trash" size={17} /> 刪除航班</button>}
      </div>
    </div>
  )
}
