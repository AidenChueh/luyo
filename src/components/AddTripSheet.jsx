import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { useStore } from '../store'
import { pickImage } from '../lib/image'
import { getPrefs } from '../lib/settings'
import { parseYMD } from '../lib/format'

const CURRENCIES = [
  { code: 'TWD', sym: 'NT$' },
  { code: 'JPY', sym: '¥' },
  { code: 'KRW', sym: '₩' },
  { code: 'USD', sym: '$' },
  { code: 'AUD', sym: 'A$' },
  { code: 'EUR', sym: '€' },
  { code: 'THB', sym: '฿' },
]

const GRADIENTS = [
  'linear-gradient(150deg, #C2410C 0%, #E8743B 55%, #D9A03A 100%)',
  'linear-gradient(150deg, #2F6E8F 0%, #3E7C5A 60%, #7FAE8F 100%)',
  'linear-gradient(150deg, #8C6BB1 0%, #C2410C 70%, #E8743B 100%)',
  'linear-gradient(150deg, #B5557E 0%, #E8743B 70%, #D9A03A 100%)',
  'linear-gradient(150deg, #3E7C5A 0%, #C77B1E 65%, #D9A03A 100%)',
]

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TODAY = ymd(new Date())
const addDays = (s, n) => {
  const d = parseYMD(s); d.setDate(d.getDate() + n)
  return ymd(d)
}
const diffDays = (a, b) => Math.round((parseYMD(b) - parseYMD(a)) / 86400000) + 1

const statusOf = (start, end) => {
  const today = parseYMD(TODAY)
  if (parseYMD(end) < today) return 'completed'
  if (parseYMD(start) <= today && today <= parseYMD(end)) return 'ongoing'
  return 'planning'
}

export default function AddTripSheet() {
  const { tripSheet, closeTripSheet, addTrip, editTrip, getTrip } = useStore()
  const nav = useNavigate()
  const editing = tripSheet.editId

  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [start, setStart] = useState(TODAY)
  const [end, setEnd] = useState(addDays(TODAY, 4))
  const [cur, setCur] = useState(getPrefs().currency)
  const [budget, setBudget] = useState('')
  const [grad, setGrad] = useState(GRADIENTS[0])
  const [cover, setCover] = useState('')

  useEffect(() => {
    if (!tripSheet.open) return
    const t = editing ? getTrip(editing) : null
    if (t) {
      setName(t.name); setCountry(t.country === '—' ? '' : t.country); setCity(t.city === '—' ? '' : t.city)
      setStart(t.start); setEnd(t.end); setCur(t.currency); setBudget(String(t.budget || ''))
      setGrad(GRADIENTS.includes(t.gradient) ? t.gradient : GRADIENTS[0]); setCover(t.cover || '')
    } else {
      setName(''); setCountry(''); setCity(''); setStart(TODAY); setEnd(addDays(TODAY, 4))
      setCur(getPrefs().currency); setBudget(''); setGrad(GRADIENTS[0]); setCover('')
    }
  }, [tripSheet.open, tripSheet.editId])

  if (!tripSheet.open) return null

  const days = Math.max(1, diffDays(start, end))
  const valid = name.trim() && new Date(end) >= new Date(start)
  const sym = CURRENCIES.find((c) => c.code === cur).sym

  const submit = () => {
    if (!valid) return
    const status = statusOf(start, end)
    const fields = {
      name: name.trim(),
      country: country.trim() || '—', city: city.trim() || '—',
      gradient: grad, cover, start, end, days, status,
      currentDay: status === 'ongoing' ? diffDays(start, TODAY) : undefined,
      currency: cur, sym, budget: Number(budget) || 0,
    }
    if (editing) {
      editTrip(editing, fields)
      closeTripSheet()
      return
    }
    const id = 'trip-' + Date.now()
    addTrip({
      id, cover: '', favorite: false, archived: false, spent: 0, companions: 1,
      weather: { tmp: 24, cond: '—', hi: 26, lo: 18, icon: 'cloudSun' },
      stats: { doneItin: 0, places: 0, photos: 0 },
      ...fields,
    })
    closeTripSheet()
    nav(`/trip/${id}`)
  }

  return (
    <div className="sheet-overlay" onClick={closeTripSheet}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeTripSheet} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editing ? '編輯旅程' : '新增旅程'}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <label>旅程名稱</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：京都・大阪輕旅行" autoFocus />
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>國家</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="日本" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>城市</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="京都・大阪" />
          </div>
        </div>

        <div className="row date-row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>開始日</label>
            <input type="date" value={start} onChange={(e) => { setStart(e.target.value); if (new Date(e.target.value) > new Date(end)) setEnd(e.target.value) }} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>結束日</label>
            <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>
          <Icon name="calendar" size={13} /> 共 {days} 天 · {statusOf(start, end) === 'ongoing' ? '進行中' : statusOf(start, end) === 'completed' ? '已結束' : '規劃中'}
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ width: 120 }}>
            <label>主幣別</label>
            <select
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              style={{ width: '100%', padding: '13px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 15, color: 'var(--ink)' }}
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>總預算（{sym}）</label>
            <input type="text" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
          </div>
        </div>

        <div className="field">
          <label>封面照片（可選）</label>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => pickImage(setCover)}>
              <Icon name="image" size={17} /> {cover ? '重新上傳' : '從裝置上傳'}
            </button>
            {cover && (
              <div style={{ width: 46, height: 46, borderRadius: 12, backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center', flex: 'none', position: 'relative' }}>
                <button onClick={() => setCover('')} aria-label="移除圖片" className="img-remove" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 13 }}>×</button>
              </div>
            )}
          </div>
        </div>

        <div className="field">
          <label>{cover ? '封面備用色' : '封面色'}</label>
          <div className="row" style={{ gap: 10 }}>
            {GRADIENTS.map((g) => (
              <button
                key={g}
                onClick={() => setGrad(g)}
                style={{
                  flex: 1, height: 46, borderRadius: 'var(--r-md)', background: g,
                  border: grad === g ? '2.5px solid var(--ink)' : '2.5px solid transparent',
                  boxShadow: 'var(--sh-1)',
                }}
              />
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 20, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editing ? '儲存變更' : '建立旅程'}
        </button>
      </div>
    </div>
  )
}
