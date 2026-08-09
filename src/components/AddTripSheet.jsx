import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import RangeCalendar from './RangeCalendar'
import { useStore } from '../store'
import { useAuth } from '../auth'
import { STATUS } from '../data/seed'
import { pickImage, uploadImage } from '../lib/image'
import { getPrefs } from '../lib/settings'
import { parseYMD, decimalInput, groupNum } from '../lib/format'

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
const fmtDate = (s) => { const d = parseYMD(s); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}` }

const statusOf = (start, end) => {
  const today = parseYMD(TODAY)
  if (parseYMD(end) < today) return 'completed'
  if (parseYMD(start) <= today && today <= parseYMD(end)) return 'ongoing'
  return 'planning'
}

export default function AddTripSheet() {
  const { tripSheet, closeTripSheet, addTrip, editTrip, getTrip } = useStore()
  const { user } = useAuth()
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
  const [calOpen, setCalOpen] = useState(false)
  const [touched, setTouched] = useState({})
  const [done, setDone] = useState(false)

  const nameRef = useRef(null)
  const countryRef = useRef(null)
  const cityRef = useRef(null)
  const budgetRef = useRef(null)

  useEffect(() => {
    if (!tripSheet.open) return
    const t = editing ? getTrip(editing) : null
    setTouched({}); setDone(false)
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
  const dateErr = parseYMD(end) < parseYMD(start)
  const required = { name, country, city }
  const missing = Object.keys(required).filter((k) => !required[k].trim())
  const valid = missing.length === 0 && !dateErr
  const sym = CURRENCIES.find((c) => c.code === cur).sym

  const errOf = (k) => (touched[k] && !required[k].trim() ? true : false)
  const markTouched = (k) => setTouched((p) => ({ ...p, [k]: true }))

  // 輸入框聚焦時把自己捲到可視中央，避免被鍵盤蓋住
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
  // 點表單空白處收鍵盤
  const dismissKeyboard = (e) => {
    if (e.target.closest?.('input, select, textarea, button')) return
    document.activeElement?.blur?.()
  }

  const submit = () => {
    if (!valid) {
      setTouched({ name: true, country: true, city: true })
      return
    }
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
      setDone(true)
      setTimeout(() => { setDone(false); closeTripSheet() }, 900)
      return
    }
    const id = 'trip-' + Date.now()
    addTrip({
      id, cover: '', favorite: false, archived: false, spent: 0, companions: 1,
      stats: { doneItin: 0, places: 0, photos: 0 },
      ...fields,
    })
    setDone(true)
    setTimeout(() => { setDone(false); closeTripSheet(); nav(`/trip/${id}`) }, 900)
  }

  return (
    <>
    <div className="sheet-overlay" onClick={closeTripSheet}>
      <div className="sheet form-sheet trip-form" onClick={(e) => e.stopPropagation()} onMouseDown={dismissKeyboard}>
        <div className="grabber" />
        <div className="sheet-head">
          <button className="iconbtn" onClick={closeTripSheet} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div className="t">{editing ? '編輯旅程' : '新增旅程'}</div>
          <span style={{ width: 40 }} />
        </div>

        <div className={`field tight ${errOf('name') ? 'err' : ''}`}>
          <label>旅程名稱</label>
          <input
            ref={nameRef} type="text" value={name} enterKeyHint="next"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => markTouched('name')}
            onFocus={onFocusScroll}
            onKeyDown={(e) => goNext(e, countryRef)}
            placeholder="例如：京都・大阪輕旅行"
          />
          {errOf('name') && <div className="field-err"><Icon name="alert" size={13} /> 請輸入旅程名稱</div>}
        </div>

        <div className="form-row">
          <div className={`field ${errOf('country') ? 'err' : ''}`} style={{ flex: 40 }}>
            <label>國家</label>
            <input
              ref={countryRef} type="text" value={country} enterKeyHint="next"
              onChange={(e) => setCountry(e.target.value)}
              onBlur={() => markTouched('country')}
              onFocus={onFocusScroll}
              onKeyDown={(e) => goNext(e, cityRef)}
              placeholder="日本"
            />
          </div>
          <div className={`field ${errOf('city') ? 'err' : ''}`} style={{ flex: 60 }}>
            <label>城市</label>
            <input
              ref={cityRef} type="text" value={city} enterKeyHint="next"
              onChange={(e) => setCity(e.target.value)}
              onBlur={() => markTouched('city')}
              onFocus={onFocusScroll}
              onKeyDown={(e) => goNext(e, budgetRef)}
              placeholder="京都・大阪"
            />
          </div>
        </div>
        {(errOf('country') || errOf('city')) && (
          <div className="field-err">
            <Icon name="alert" size={13} />
            {errOf('country') && errOf('city') ? '請填寫國家與城市' : errOf('country') ? '請輸入國家' : '請輸入城市'}
          </div>
        )}

        <div className="form-row">
          <div className={`field ${dateErr ? 'err' : ''}`} style={{ flex: 1 }}>
            <label>開始日</label>
            <button type="button" className="date-pick" onClick={() => setCalOpen(true)}>
              <Icon name="calendar" size={16} className="di" /> {fmtDate(start)}
            </button>
          </div>
          <div className={`field ${dateErr ? 'err' : ''}`} style={{ flex: 1 }}>
            <label>結束日</label>
            <button type="button" className="date-pick" onClick={() => setCalOpen(true)}>
              <Icon name="calendar" size={16} className="di" /> {fmtDate(end)}
            </button>
          </div>
        </div>
        {dateErr ? (
          <div className="field-err"><Icon name="alert" size={13} /> 結束日期不能早於開始日期</div>
        ) : (
          <div className="form-summary">
            <Icon name="calendar" size={13} /> 共 {days} 天 · {STATUS[statusOf(start, end)].label}
          </div>
        )}

        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="field" style={{ flex: 33 }}>
            <label>主幣別</label>
            <div className="select-wrap">
              <select value={cur} onChange={(e) => setCur(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <Icon name="chevronDown" size={16} />
            </div>
          </div>
          <div className="field" style={{ flex: 67 }}>
            <label>總預算 <span className="opt">（可選）</span></label>
            <div className="money-input">
              <span className="pfx">{sym}</span>
              <input
                ref={budgetRef} type="text" inputMode="decimal" enterKeyHint="done"
                value={groupNum(budget)}
                onChange={(e) => setBudget(decimalInput(e.target.value.replace(/,/g, '')))}
                onFocus={onFocusScroll}
                onKeyDown={(e) => goNext(e, null)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="field section-gap">
          <label>封面照片 <span className="opt">（可選）</span></label>
          {cover ? (
            <div className="cover-preview" style={{ backgroundImage: `url(${cover})` }}>
              <div className="acts">
                <button onClick={() => pickImage(async (d) => { try { setCover(await uploadImage(user.id, d)) } catch { setCover(d) } })}>
                  <Icon name="image" size={13} /> 更換
                </button>
                <button onClick={() => setCover('')} aria-label="移除封面照片"><Icon name="trash" size={13} /></button>
              </div>
            </div>
          ) : (
            <button className="upload-btn" onClick={() => pickImage(async (d) => { try { setCover(await uploadImage(user.id, d)) } catch { setCover(d) } })}>
              <Icon name="image" size={16} /> 從裝置上傳
            </button>
          )}
        </div>

        <div className="field section-gap">
          <label>預設封面色</label>
          <div className="grad-row">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                className={`grad-sw ${grad === g ? 'on' : ''}`}
                style={{ background: g }}
                aria-label="選擇封面色"
                aria-pressed={grad === g}
                onClick={() => setGrad(g)}
              >
                {grad === g && <Icon name="check" size={17} />}
              </button>
            ))}
          </div>
          <div className="field-hint">{cover ? '已上傳照片，優先使用照片作為封面' : '未上傳照片時使用'}</div>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={submit} disabled={!valid}>
          {editing ? '儲存變更' : '建立旅程'}
        </button>
      </div>
    </div>

    {done && (
      <div className="form-done">
        <div className="box">
          <span className="ok"><Icon name="check" size={24} /></span>
          {editing ? '旅程已更新' : '旅程建立完成'}
        </div>
      </div>
    )}
    <RangeCalendar
      open={calOpen}
      start={start}
      end={end}
      onClose={() => setCalOpen(false)}
      onApply={(s, en) => { setStart(s); setEnd(en) }}
    />
    </>
  )
}
