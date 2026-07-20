import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { MOODS } from '../data/seed'
import { renderMarkdown } from '../lib/markdown'
import { parseYMD } from '../lib/format'

const moodOf = (v) => MOODS.find((m) => m.v === v) || MOODS[3]
const fmt = (d) => {
  const dt = parseYMD(d)
  const wd = ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()]
  return `${dt.getMonth() + 1}月${dt.getDate()}日 週${wd}`
}

export default function JournalScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getJournal, openJournal } = useStore()
  const trip = getTrip(id)
  if (!trip) return null

  const entries = [...getJournal(id)].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.name}</div>
          <h1>旅遊日誌</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => openJournal(id)} aria-label="新增日誌"><Icon name="plus" size={20} /></button>
      </header>

      <div className="pad section" style={{ marginTop: 6 }}>
        <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{entries.length} 篇 · 依日期排列</div>
        {entries.length === 0 ? (
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', marginTop: 12 }}>
            <Icon name="journal" size={30} style={{ color: 'var(--line-strong)' }} />
            <div style={{ marginTop: 8, fontSize: 13.5 }}>還沒有日誌，右上＋ 新增</div>
          </div>
        ) : (
          <div className="stagger">
            {entries.map((e) => {
              const m = moodOf(e.mood)
              return (
                <article key={e.id} className="journal-card" onClick={() => openJournal(id, e.id)}>
                  <div className="mood" title={m.label}>{m.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="journal-date">{fmt(e.date)}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: '2px 0 6px' }}>{e.title}</div>
                    <div className="md clamp" dangerouslySetInnerHTML={{ __html: renderMarkdown(e.content) }} />
                  </div>
                  {e.photo && <img className="journal-photo" src={e.photo} alt="" loading="lazy" />}
                </article>
              )
            })}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => openJournal(id)} aria-label="新增日誌"><Icon name="plus" size={26} /></button>
    </div>
  )
}
