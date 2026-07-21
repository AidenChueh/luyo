import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import Cover from '../components/Cover'
import { useStore } from '../store'
import { PLACE_TYPE, CATEGORIES, MOODS } from '../data/seed'
import { money, dateRange } from '../lib/format'
import { exportExpensesCSV, exportItineraryCSV, printHTML } from '../lib/exporters'
import { generateRecap, getRecap, saveRecap } from '../lib/ai'
import { esc } from '../lib/markdown'

export default function SummaryScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getSpent, getExpenses, getItinerary, getPlaces, getJournal } = useStore()
  const [expMenu, setExpMenu] = useState(false)
  const savedRecap = getRecap(id)
  const [recap, setRecap] = useState(savedRecap?.text || '')
  const [recapSource, setRecapSource] = useState(savedRecap?.source || '')
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState('')
  const trip = getTrip(id)

  useEffect(() => {
    const saved = getRecap(id)
    setRecap(saved?.text || '')
    setRecapSource(saved?.source || '')
    setRecapError('')
    setRecapLoading(false)
  }, [id])

  const doRecap = async () => {
    setRecapLoading(true); setRecapError(''); setRecap(''); setRecapSource('')
    try {
      const res = await generateRecap(trip, s, { onDelta: (t) => setRecap((prev) => prev + t) })
      setRecap(res.text); setRecapSource(res.source)
      saveRecap(id, { text: res.text, source: res.source, at: Date.now() })
    } catch (err) {
      setRecapError(err.message || '生成失敗')
    } finally {
      setRecapLoading(false)
    }
  }

  if (!trip) return null

  const s = useMemo(() => {
    const spent = getSpent(trip)
    const exp = getExpenses(id) || []
    const places = getPlaces(id)
    const itin = getItinerary(id)
    const journal = getJournal(id)
    const itinCount = Object.values(itin).reduce((a, d) => a + d.length, 0)

    const catTotals = {}
    for (const e of exp) catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amt
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]

    const moodAvg = journal.length ? journal.reduce((a, j) => a + j.mood, 0) / journal.length : 0
    const moodObj = MOODS.find((m) => m.v === Math.round(moodAvg))

    return {
      spent,
      dailyAvg: Math.round(spent / Math.max(1, trip.days)),
      sights: places.filter((p) => p.type === 'sight').length,
      restaurants: places.filter((p) => p.type === 'food' || p.type === 'cafe').length,
      malls: places.filter((p) => p.type === 'mall').length,
      placeCount: places.length,
      favorites: places.filter((p) => p.rating >= 5),
      itinCount,
      journalCount: journal.length,
      photos: trip.stats?.photos || 0,
      topCat: topCat ? { ...CATEGORIES[topCat[0]], amt: topCat[1] } : null,
      moodObj,
    }
  }, [id, trip])

  const share = async () => {
    const text = `${trip.name}｜${trip.country}${trip.city} ${trip.days}天\n總花費 ${money(s.spent, trip.sym)}（日均 ${money(s.dailyAvg, trip.sym)}）\n景點 ${s.sights}・餐廳 ${s.restaurants}・照片 ${s.photos}\n— 由 luyo 生成`
    if (navigator.share) {
      try { await navigator.share({ title: trip.name, text }) } catch {}
    } else if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(text); alert('已複製分享文字到剪貼簿') } catch { alert(text) }
    } else alert(text)
  }

  const exportPDF = () => {
    setExpMenu(false)
    const exp = getExpenses(id) || []
    const favHtml = s.favorites.map((p) => `<li>${esc(p.name)}（${PLACE_TYPE[p.type].label}・${p.rating}★）</li>`).join('') || '<li>—</li>'
    const expRows = exp.map((e) => `<tr><td>${e.date}</td><td>${CATEGORIES[e.cat]?.label || e.cat}</td><td>${esc(e.title)}</td><td style="text-align:right">${trip.sym}${e.amt.toLocaleString()}</td></tr>`).join('')
    printHTML(`${trip.name} 旅程報告`, `
      <h1>${esc(trip.name)}</h1>
      <div class="sub">${esc(trip.country)}·${esc(trip.city)} ｜ ${dateRange(trip.start, trip.end)} ｜ ${trip.days} 天</div>
      <div class="grid">
        <div>總花費<b>${money(s.spent, trip.sym)}</b></div>
        <div>每日平均<b>${money(s.dailyAvg, trip.sym)}</b></div>
        <div>造訪地點<b>${s.placeCount}</b></div>
        <div>日誌<b>${s.journalCount} 篇</b></div>
      </div>
      <h2>最愛地點</h2><ul>${favHtml}</ul>
      <h2>支出明細</h2>
      <table><thead><tr><th>日期</th><th>分類</th><th>項目</th><th>金額</th></tr></thead><tbody>${expRows || '<tr><td colspan="4">無紀錄</td></tr>'}</tbody></table>
      <p style="color:#78716C;font-size:12px;margin-top:24px">由 luyo 產生 · ${new Date().toLocaleDateString('zh-TW')}</p>
    `)
  }

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.status === 'completed' ? '行程已結束' : '即時回顧'}</div>
          <h1>旅程總結</h1>
        </div>
      </header>

      {/* 報告卡（可分享） */}
      <div className="pad section" style={{ marginTop: 6 }}>
        <div className="report fade-up">
          <div style={{ position: 'absolute', inset: 0, zIndex: -2 }}><Cover src={trip.cover} gradient={trip.gradient} /></div>
          <div className="r-brand">
            <span className="row" style={{ gap: 6 }}><Icon name="sparkles" size={14} /> LUYO 旅程回顧</span>
            <span>{trip.start.slice(0, 4)}</span>
          </div>
          <div className="r-name">{trip.name}</div>
          <div className="r-sub">
            <span><Icon name="mapPin" size={12} /> {trip.country}·{trip.city}</span>
            <span>{dateRange(trip.start, trip.end)}</span>
            <span>{trip.days} 天</span>
          </div>

          <div className="r-hero">
            <div className="big">{money(s.spent, trip.sym)}</div>
            <div className="cap">總花費 · 每日平均 {money(s.dailyAvg, trip.sym)}</div>
          </div>

          <div className="r-grid">
            <div className="r-cell"><div className="v">{s.sights}</div><div className="k">景點</div></div>
            <div className="r-cell"><div className="v">{s.restaurants}</div><div className="k">餐廳</div></div>
            <div className="r-cell"><div className="v">{s.photos}</div><div className="k">照片</div></div>
            <div className="r-cell"><div className="v">{s.journalCount}</div><div className="k">日誌</div></div>
          </div>

          {s.favorites.length > 0 && (
            <div className="r-block">
              <div className="h">最愛地點</div>
              {s.favorites.slice(0, 3).map((p) => (
                <div key={p.id} className="r-fav"><Icon name={PLACE_TYPE[p.type].icon} size={15} /> {p.name}</div>
              ))}
            </div>
          )}

          <div className="r-foot">
            <span>{s.topCat ? `最常花在 ${s.topCat.label} · ${money(s.topCat.amt, trip.sym)}` : '— '}</span>
            <span>{s.moodObj ? `心情 ${s.moodObj.emoji}` : ''}</span>
          </div>
        </div>
      </div>

      {/* 操作 */}
      <div className="pad section" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary btn-block" style={{ flex: 1 }} onClick={share}>
            <Icon name="share" size={18} /> 分享報告卡
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setExpMenu(true)}>
            <Icon name="download" size={17} /> 匯出
          </button>
        </div>
      </div>

      {/* AI 旅程回顧暫時關閉。doRecap 與 lib/ai.js 的 generateRecap 都保留，要開啟時把這段註解拿掉即可。
      <div className="pad section">
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <div className="section-title row" style={{ fontSize: 16, gap: 6 }}>
              <Icon name="sparkles" size={17} /> AI 旅程回顧
            </div>
            {recapSource && !recapLoading && (
              <span className="tag" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                {recapSource === 'claude' ? 'Claude 生成' : '範例生成'}
              </span>
            )}
          </div>

          {recapError && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{recapError}</p>
          )}

          {recap ? (
            <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{recap}</p>
          ) : (
            !recapLoading && <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>依這趟的花費、地點、日誌生成一段回顧文案。未設定 API key 時使用範例生成。</p>
          )}

          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 12 }}
            onClick={doRecap}
            disabled={recapLoading}
          >
            <Icon name={recapLoading ? 'clock' : 'sparkles'} size={17} />
            {recapLoading ? ' 生成中…' : recap ? ' 重新生成' : ' 生成回顧'}
          </button>
        </div>
      </div>
      */}

      {/* 詳細統計 */}
      <div className="pad section">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>詳細數據</div>
        <div className="stat-grid">
          <div className="stat"><div className="k"><Icon name="calendar" size={14} /> 總天數</div><div className="v">{trip.days}</div><div className="s">{dateRange(trip.start, trip.end)}</div></div>
          <div className="stat"><div className="k"><Icon name="wallet" size={14} /> 總花費</div><div className="v">{money(s.spent, trip.sym)}</div><div className="s">日均 {money(s.dailyAvg, trip.sym)}</div></div>
          <div className="stat"><div className="k"><Icon name="check" size={14} /> 完成行程</div><div className="v">{s.itinCount}</div><div className="s">跨 {trip.days} 天</div></div>
          <div className="stat"><div className="k"><Icon name="mapPin" size={14} /> 造訪地點</div><div className="v">{s.placeCount}</div><div className="s">景點 {s.sights}·餐廳 {s.restaurants}·商場 {s.malls}</div></div>
          <div className="stat"><div className="k"><Icon name="image" size={14} /> 照片</div><div className="v">{s.photos}</div><div className="s">已分日整理</div></div>
          <div className="stat"><div className="k"><Icon name="journal" size={14} /> 日誌</div><div className="v">{s.journalCount}</div><div className="s">{s.moodObj ? `平均心情 ${s.moodObj.emoji}` : '尚無'}</div></div>
        </div>
      </div>

      {s.favorites.length > 0 && (
        <div className="pad section">
          <div className="section-title" style={{ fontSize: 16, marginBottom: 10 }}>最愛地點</div>
          <div className="card" style={{ padding: '4px 14px' }}>
            {s.favorites.map((p, i) => (
              <div key={p.id} className="exp-item" style={{ borderBottom: i < s.favorites.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="exp-ic" style={{ background: `color-mix(in srgb, ${PLACE_TYPE[p.type].color} 10%, transparent)`, color: PLACE_TYPE[p.type].color }}><Icon name={PLACE_TYPE[p.type].icon} size={19} /></span>
                <div>
                  <div className="t">{p.name}</div>
                  <div className="s">{PLACE_TYPE[p.type].label}{p.note ? ` · ${p.note}` : ''}</div>
                </div>
                <span className="row" style={{ gap: 1, marginLeft: 'auto', color: 'var(--amber)' }}>
                  {Array.from({ length: p.rating }).map((_, k) => <Icon key={k} name="star" size={12} fill />)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="pad muted" style={{ fontSize: 11.5, lineHeight: 1.6, paddingBottom: 8 }}>
        報告卡資料由各模組自動彙整。分享使用系統分享面板（無則複製文字）。匯出 PDF 走瀏覽器列印（可選「另存為 PDF」）。
      </p>

      {expMenu && (
        <div className="sheet-overlay" onClick={() => setExpMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', paddingBottom: 6 }}>匯出</div>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10, justifyContent: 'flex-start' }} onClick={() => { setExpMenu(false); exportExpensesCSV(trip, getExpenses(id) || []) }}>
              <Icon name="wallet" size={18} /> 記帳明細（Excel / CSV）
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10, justifyContent: 'flex-start' }} onClick={() => { setExpMenu(false); exportItineraryCSV(trip, getItinerary(id)) }}>
              <Icon name="calendar" size={18} /> 行程（Excel / CSV）
            </button>
            <button className="btn btn-ghost btn-block" style={{ marginTop: 10, justifyContent: 'flex-start' }} onClick={exportPDF}>
              <Icon name="journal" size={18} /> 旅程報告（PDF / 列印）
            </button>
            <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--muted)' }} onClick={() => setExpMenu(false)}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
