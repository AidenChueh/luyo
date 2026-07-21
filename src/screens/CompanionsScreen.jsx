import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { getMe } from '../lib/settings'
import { settle } from '../lib/settle'
import { money } from '../lib/format'

const Avatar = ({ name, color, avatar, size = 40 }) => (
  <span style={{ width: size, height: size, borderRadius: '50%', background: avatar ? `center/cover url(${avatar})` : color, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.4, flex: 'none' }}>
    {!avatar && (name?.[0] || '?')}
  </span>
)

export default function CompanionsScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const { getTrip, getCompanions, getExpenses, openCompanion } = useStore()
  const trip = getTrip(id)
  if (!trip) return null

  const me = getMe()
  const companions = getCompanions(id)
  const expenses = getExpenses(id) || []
  const { net, transfers } = useMemo(() => settle(expenses, companions), [expenses, companions])
  const splitCount = expenses.filter((e) => e.split && e.split.length > 1).length

  return (
    <div className="scroll">
      <header className="topbar solid">
        <button className="iconbtn ghost" onClick={() => nav(`/trip/${id}`)} aria-label="返回"><Icon name="chevronLeft" size={22} /></button>
        <div>
          <div className="greeting">{trip.name} · {trip.sym} {trip.currency}</div>
          <h1>同行者與分帳</h1>
        </div>
        <div className="grow" />
        <button className="iconbtn" onClick={() => openCompanion(id)} aria-label="新增同行者"><Icon name="plus" size={20} /></button>
      </header>

      {/* 同行者 */}
      <div className="pad section" style={{ marginTop: 6 }}>
        <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>成員 · {companions.length + 1} 人</div>
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="exp-item">
            <Avatar name={me.name} color={me.color} avatar={me.avatar} />
            <div><div className="t">{me.name}</div><div className="s">本人</div></div>
          </div>
          {companions.map((c, i) => (
            <div key={c.id} className="exp-item" style={{ borderBottom: i < companions.length - 1 ? '1px solid var(--line)' : 'none' }} onClick={() => openCompanion(id, c.id)}>
              <Avatar name={c.name} color={c.color} avatar={c.avatar} />
              <div><div className="t">{c.name}</div><div className="s">{c.contact || '無聯絡方式'}</div></div>
              <Icon name="chevronRight" size={17} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* 結算 */}
      <div className="pad section">
        <div className="section-title" style={{ fontSize: 16, marginBottom: 4 }}>分帳結算</div>
        <div className="muted" style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>{splitCount} 筆共同支出 · 正數代表別人欠你</div>
        <div className="card" style={{ padding: '4px 14px', marginBottom: 14 }}>
          {net.map((n, i) => (
            <div key={n.id} className="exp-item" style={{ borderBottom: i < net.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <Avatar name={n.name} color={n.color} size={36} />
              <div className="t">{n.name}</div>
              <span className="exp-amt" style={{ color: n.value > 0 ? 'var(--accent)' : n.value < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                {n.value > 0 ? '+' : ''}{money(n.value, '')}
              </span>
            </div>
          ))}
        </div>

        {transfers.length > 0 ? (
          <>
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>建議還款（最少筆數）</div>
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {transfers.map((t, i) => (
                <div key={i} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={t.from.name} color={t.from.color} size={34} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.from.name}</span>
                  <Icon name="arrowUpRight" size={16} style={{ color: 'var(--muted)', transform: 'rotate(45deg)' }} />
                  <Avatar name={t.to.name} color={t.to.color} size={34} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.to.name}</span>
                  <span className="exp-amt" style={{ marginLeft: 'auto', color: 'var(--primary)' }}>{money(t.amt, '')}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>已結清，沒有待還款項</div>
        )}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.6 }}>
          結算依記帳時設定的「付款人 / 分攤對象」自動計算。在記帳新增時可指定誰付、分給誰。
        </p>
      </div>
    </div>
  )
}
