import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { MOODS } from '../data/seed'
import { renderMarkdown } from '../lib/markdown'

const TODAY = '2026-06-14'

export default function JournalSheet() {
  const { journalSheet, closeJournal, getJournal, addJournal, editJournal, removeJournal } = useStore()
  const { open, tripId, editId } = journalSheet

  const [date, setDate] = useState(TODAY)
  const [title, setTitle] = useState('')
  const [mood, setMood] = useState(4)
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!open) return
    const e = editId ? getJournal(tripId).find((x) => x.id === editId) : null
    if (e) { setDate(e.date); setTitle(e.title); setMood(e.mood); setContent(e.content || '') }
    else { setDate(TODAY); setTitle(''); setMood(4); setContent('') }
    setPreview(false)
  }, [open, editId, tripId])

  if (!open) return null

  const valid = title.trim()
  const submit = () => {
    if (!valid) return
    const fields = { date, title: title.trim(), mood, content }
    if (editId) editJournal(tripId, editId, fields)
    else addJournal(tripId, fields)
    closeJournal()
  }
  const del = () => { if (confirm('刪除這篇日誌？')) { removeJournal(tripId, editId); closeJournal() } }

  return (
    <div className="sheet-overlay" onClick={closeJournal}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closeJournal} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{editId ? '編輯日誌' : '寫日誌'}</div>
          <button className="iconbtn ghost" onClick={() => setPreview((p) => !p)} title="預覽" aria-label="預覽">
            <Icon name={preview ? 'journal' : 'image'} size={18} />
          </button>
        </div>

        <div className="row" style={{ gap: 12, marginTop: 16 }}>
          <div className="field" style={{ flex: 1, marginTop: 0 }}>
            <label>日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label>心情</label>
            <div className="mood-pick">
              {MOODS.map((m) => (
                <button key={m.v} className={mood === m.v ? 'on' : ''} onClick={() => setMood(m.v)} title={m.label}>{m.emoji}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <label>標題</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="今天的標題" autoFocus />
        </div>

        <div className="field">
          <label>內容（支援 Markdown）</label>
          {preview ? (
            <div className="md card" style={{ padding: 14, minHeight: 220 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<p style="color:var(--muted)">（沒有內容）</p>' }} />
          ) : (
            <textarea className="editor-area" value={content} onChange={(e) => setContent(e.target.value)} placeholder={'# 標題\n\n今天**最棒**的是…\n\n- 重點一\n- 重點二'} />
          )}
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: 8, opacity: valid ? 1 : 0.5 }} onClick={submit} disabled={!valid}>
          <Icon name="check" size={19} /> {editId ? '儲存變更' : '保存日誌'}
        </button>
        {editId && (
          <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={del}>
            <Icon name="trash" size={17} /> 刪除日誌
          </button>
        )}
      </div>
    </div>
  )
}
