import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { CATEGORIES, BUDGET_ALERTS } from '../data/seed'
import { useStore } from '../store'
import { money, pct } from '../lib/format'
import { HOME, toHome } from '../lib/rates'
import { generateBudgetAnalysis, getBudgetAnalysis, saveBudgetAnalysis } from '../lib/ai'

function Ring({ value }) {
  const R = 80, C = 2 * Math.PI * R
  const filled = Math.min(100, value) / 100 * C
  const color = value >= 85 ? 'var(--danger)' : value >= 50 ? 'var(--amber)' : 'var(--accent)'
  return (
    <div className="ring">
      <svg width="184" height="184" viewBox="0 0 184 184">
        <circle cx="92" cy="92" r={R} fill="none" stroke="var(--sand)" strokeWidth="16" />
        <g transform="rotate(-90 92 92)">
          <circle cx="92" cy="92" r={R} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${filled} ${C - filled}`} style={{ transition: 'stroke-dasharray .6s ease' }} />
        </g>
      </svg>
      <div className="center">
        <div className="pct" style={{ color }}>{value}%</div>
        <div className="lab">已使用</div>
      </div>
    </div>
  )
}

function AIBudgetCard({ trip, stats }) {
  const [text, setText] = useState(() => getBudgetAnalysis(trip.id)?.text || '')
  const [source, setSource] = useState(() => getBudgetAnalysis(trip.id)?.source || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = getBudgetAnalysis(trip.id)
    setText(saved?.text || '')
    setSource(saved?.source || '')
    setError('')
    setLoading(false)
  }, [trip.id])

  const generate = async () => {
    setLoading(true); setError(''); setText(''); setSource('')
    try {
      const res = await generateBudgetAnalysis(trip, stats, { onDelta: (t) => setText((prev) => prev + t) })
      setText(res.text); setSource(res.source)
      saveBudgetAnalysis(trip.id, { text: res.text, source: res.source, at: Date.now() })
    } catch (err) {
      setError(err.message || '生成失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="between" style={{ marginBottom: 10 }}>
        <div className="section-title row" style={{ fontSize: 16, gap: 6 }}>
          <Icon name="sparkles" size={17} /> AI 預算分析
        </div>
        {source && !loading && (
          <span className="tag" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            {source === 'claude' ? 'Claude 生成' : '範例生成'}
          </span>
        )}
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      {text ? (
        <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{text}</p>
      ) : (
        !loading && <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>依總預算、花費與分類彙總生成分析建議。未設定 API key 時使用範例生成。</p>
      )}

      <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={generate} disabled={loading}>
        <Icon name={loading ? 'clock' : 'sparkles'} size={17} />
        {loading ? ' 生成中…' : text ? ' 重新生成' : ' 生成分析'}
      </button>
    </div>
  )
}

export default function BudgetScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { trips, getTrip, getExpenses, getSpent } = useStore()
  const trip = getTrip(id) || trips.find((t) => t.status === 'ongoing') || trips[0]
  if (!trip) return null
  const list = getExpenses(trip.id) || []
  const spent = getSpent(trip)
  const p = pct(spent, trip.budget)
  const remaining = trip.budget - spent
  const dailyBudget = Math.round(trip.budget / trip.days)
  const over = remaining < 0

  // 分類花費對預算（簡化：以總額占比示意）
  const catTotals = {}
  for (const e of list) catTotals[e.cat] = (catTotals[e.cat] || 0) + e.amt
  const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // AI 預算分析用的彙整數字
  const elapsed = trip.status === 'completed' ? trip.days : trip.status === 'ongoing' ? Math.min(trip.currentDay || 1, trip.days) : 0
  const dailyAvg = elapsed > 0 ? spent / elapsed : 0
  const aiStats = {
    spent, budget: trip.budget, remaining, p, dailyBudget,
    elapsed, remainingDays: trip.days - elapsed, days: trip.days,
    dailyAvg, projected: dailyAvg * trip.days,
    topCats: cats.map(([k, v]) => ({ ...CATEGORIES[k], amt: v })),
  }

  return (
    <div className="scroll">
      <header className="topbar solid">
        {id ? <button className="iconbtn ghost" onClick={() => nav(`/trip/${trip.id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button> : null}
        <div>
          <div className="greeting">{trip.name}</div>
          <h1>預算管理</h1>
        </div>
      </header>

      <div className="pad section" style={{ marginTop: 4 }}>
        <div className="card" style={{ padding: '20px 16px' }}>
          <div className="ring-wrap"><Ring value={p} /></div>
          <div className="stat-grid" style={{ marginTop: 8 }}>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>總預算</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, marginTop: 3 }}>{money(trip.budget, trip.sym)}</div>
              {trip.currency !== HOME && <div className="muted" style={{ fontSize: 11 }}>≈ NT${Math.round(toHome(trip.budget, trip.currency)).toLocaleString()}</div>}
            </div>
            <div style={{ textAlign: 'center', padding: 8 }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{over ? '超出' : '剩餘'}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, marginTop: 3, color: over ? 'var(--danger)' : 'var(--accent)' }}>
                {money(Math.abs(remaining), trip.sym)}
              </div>
            </div>
          </div>
          <div className="divider" style={{ margin: '14px 0' }} />
          <div className="between" style={{ fontSize: 13.5, fontWeight: 600 }}>
            <span className="muted">每日預算</span>
            <span>{money(dailyBudget, trip.sym)} / 天</span>
          </div>
        </div>
      </div>

      {/* AI 預算分析暫時關閉（保留 AIBudgetCard 實作，之後要開啟時取消註解即可）
      <div className="pad section">
        <AIBudgetCard trip={trip} stats={aiStats} />
      </div>
      */}

      {/* Tiered alerts */}
      <div className="pad section">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>預算警示</div>
        <div className="card" style={{ padding: 6 }}>
          {BUDGET_ALERTS.map((a, i) => {
            const reached = p >= a.level
            return (
              <div className="alert-row" key={a.level} style={{ background: reached ? `${a.color === 'var(--accent)' ? 'var(--accent-soft)' : a.color === 'var(--amber)' ? 'var(--amber-soft)' : 'var(--danger-soft)'}` : 'transparent', borderBottom: i < BUDGET_ALERTS.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="dot" style={{ background: reached ? a.color : 'var(--line-strong)' }} />
                <div>
                  <div className="t">{a.level}%　{a.label}</div>
                  <div className="s">{money(trip.budget * a.level / 100, trip.sym)}</div>
                </div>
                <span className="badge" style={{ color: reached ? a.color : 'var(--muted)' }}>
                  {reached ? <span className="row" style={{ gap: 4 }}><Icon name="bell" size={14} /> 已觸發</span> : '未達'}
                </span>
              </div>
            )
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
          達各級距會發送推播提醒。目前使用 {p}%，已觸發「{p >= 100 ? '已超支' : p >= 85 ? '即將超支' : p >= 50 ? '已使用一半' : '尚未達標'}」級距。
        </p>
      </div>

      {/* Category budgets */}
      <div className="pad section">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>分類支出</div>
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cats.map(([k, v]) => {
            const c = CATEGORIES[k]
            const cp = Math.round((v / Math.max(1, spent)) * 100)
            return (
              <div key={k}>
                <div className="between" style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: `color-mix(in srgb, ${c.color} 10%, transparent)`, color: c.color, display: 'grid', placeItems: 'center' }}>
                      <Icon name={c.icon} size={15} />
                    </span>
                    {c.label}
                  </span>
                  <span>{money(v, trip.sym)}</span>
                </div>
                <div className="track" style={{ height: 7 }}><i style={{ width: `${cp}%`, background: c.color }} /></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
