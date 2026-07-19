import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useStore } from '../store'
import { PHOTO_GRADIENTS } from '../data/seed'
import { pickImage } from '../lib/image'

const ARS = ['1 / 1', '3 / 4', '4 / 5', '5 / 4', '3 / 5']

export default function PhotoSheet() {
  const { photoSheet, closePhoto, addPhoto, getTrip } = useStore()
  const { open, tripId } = photoSheet
  const trip = getTrip(tripId)

  const [day, setDay] = useState(1)
  const [cap, setCap] = useState('')
  const [loc, setLoc] = useState('')
  const [url, setUrl] = useState('')
  const [grad, setGrad] = useState(PHOTO_GRADIENTS[0])

  useEffect(() => {
    if (open) { setDay(trip?.currentDay || 1); setCap(''); setLoc(''); setUrl(''); setGrad(PHOTO_GRADIENTS[Math.floor(Math.random() * PHOTO_GRADIENTS.length)]) }
  }, [open])

  if (!open || !trip) return null
  const dayNums = Array.from({ length: trip.days }, (_, i) => i + 1)

  const submit = () => {
    addPhoto(tripId, { day, cap: cap.trim(), loc: loc.trim(), url: url.trim(), gradient: grad, ar: ARS[Math.floor(Math.random() * ARS.length)] })
    closePhoto()
  }

  return (
    <div className="sheet-overlay" onClick={closePhoto}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <div className="between">
          <button className="iconbtn ghost" onClick={closePhoto} aria-label="關閉"><Icon name="chevronLeft" size={20} /></button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>新增照片</div>
          <span style={{ width: 40 }} />
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label>哪一天</label>
          <div className="chips">
            {dayNums.map((d) => (
              <button key={d} className={`chip ${day === d ? 'active' : ''}`} onClick={() => setDay(d)}>Day {d}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>照片</label>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => pickImage(setUrl)}>
              <Icon name="image" size={17} /> {url ? '重新上傳' : '從裝置上傳'}
            </button>
            {url && (
              <div style={{ width: 54, height: 54, borderRadius: 12, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', flex: 'none', position: 'relative' }}>
                <button onClick={() => setUrl('')} aria-label="移除圖片" className="img-remove" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 13 }}>×</button>
              </div>
            )}
          </div>
        </div>

        <div className="field"><label>說明</label><input type="text" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="這張照片的說明" /></div>
        <div className="field"><label>地點標籤</label><input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="例如：清水寺" /></div>
        <div className="field"><label>或貼圖片連結</label><input type="text" value={url.startsWith('data:') ? '' : url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...（已上傳則免填）" /></div>

        {!url && (
          <div className="field">
            <label>色塊</label>
            <div className="row" style={{ gap: 8 }}>
              {PHOTO_GRADIENTS.map((g) => (
                <button key={g} onClick={() => setGrad(g)} style={{ flex: 1, height: 40, borderRadius: 'var(--r-md)', background: g, border: grad === g ? '2.5px solid var(--ink)' : '2.5px solid transparent' }} />
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={submit}>
          <Icon name="check" size={19} /> 新增照片
        </button>
      </div>
    </div>
  )
}
