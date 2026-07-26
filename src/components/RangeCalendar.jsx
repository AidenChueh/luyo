import { useEffect, useState } from 'react'
import Icon from './Icon'
import { parseYMD } from '../lib/format'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const TODAY = ymd(new Date())
const WD = ['日', '一', '二', '三', '四', '五', '六']

const diffDays = (a, b) => Math.round((parseYMD(b) - parseYMD(a)) / 86400000) + 1

export default function RangeCalendar({ open, start, end, onApply, onClose }) {
  const [s, setS] = useState('')
  const [e, setE] = useState('')
  const [view, setView] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    setS(start || '')
    setE(end || '')
    const base = start ? parseYMD(start) : new Date()
    setView(new Date(base.getFullYear(), base.getMonth(), 1))
  }, [open, start, end])

  if (!open) return null

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstWd = new Date(year, month, 1).getDay()
  const daysIn = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWd; i++) cells.push(null)
  for (let d = 1; d <= daysIn; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const pick = (val) => {
    if (!s || (s && e)) { setS(val); setE('') }
    else if (val >= s) setE(val)
    else { setS(val); setE('') }
  }

  const shiftMonth = (n) => setView(new Date(year, month + n, 1))
  const both = s && e
  const confirm = () => { if (both) { onApply(s, e); onClose() } }

  return (
    <div className="sheet-overlay" onClick={onClose} style={{ zIndex: 70 }}>
      <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={onClose} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>選擇日期範圍</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="cal-head">
          <button className="iconbtn ghost" onClick={() => shiftMonth(-1)} aria-label="上個月"><Icon name="chevronLeft" size={18} /></button>
          <div className="cal-title">{year} 年 {month + 1} 月</div>
          <button className="iconbtn ghost" onClick={() => shiftMonth(1)} aria-label="下個月"><Icon name="chevronRight" size={18} /></button>
        </div>

        <div className="cal-wd">{WD.map((w) => <span key={w}>{w}</span>)}</div>

        <div className="cal-grid">
          {cells.map((d, i) => {
            if (d == null) return <div key={i} className="cal-empty" />
            const val = `${year}-${pad(month + 1)}-${pad(d)}`
            const isStart = val === s
            const isEnd = val === e
            const inRange = both && val >= s && val <= e
            const single = isStart && isEnd
            const cls = ['cal-cell']
            if (inRange && !single) {
              cls.push('in-range')
              if (isStart) cls.push('range-start')
              if (isEnd) cls.push('range-end')
            }
            return (
              <div key={i} className={cls.join(' ')}>
                <button
                  className={`cal-day${isStart || isEnd ? ' sel' : ''}${val === TODAY ? ' today' : ''}`}
                  onClick={() => pick(val)}
                >
                  {d}
                </button>
              </div>
            )
          })}
        </div>

        <div className="cal-summary">
          {both
            ? <><Icon name="calendar" size={13} /> {s.slice(5).replace('-', '/')} – {e.slice(5).replace('-', '/')} · 共 {diffDays(s, e)} 天</>
            : s ? '請再選擇結束日' : '請選擇開始日'}
        </div>

        <div className="row" style={{ gap: 12, marginTop: 14 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setS(''); setE('') }}>重設</button>
          <button className="btn btn-primary" style={{ flex: 2, opacity: both ? 1 : 0.5 }} disabled={!both} onClick={confirm}>
            <Icon name="check" size={18} /> 完成
          </button>
        </div>
      </div>
    </div>
  )
}
