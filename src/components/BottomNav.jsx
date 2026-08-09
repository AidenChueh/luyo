import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'

const TABS = [
  { key: 'home', label: '首頁', icon: 'home', path: '/' },
  { key: 'trips', label: '旅程', icon: 'map', path: '/trips' },
  { key: 'itin', label: '行程', icon: 'route', path: '/itinerary' },
  { key: 'expenses', label: '記帳', icon: 'wallet', path: '/expenses' },
  { key: 'profile', label: '我的', icon: 'user', path: '/profile' },
]

export default function BottomNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  // 底部導覽一律走跨旅程的全域入口；單一旅程的行程／記帳只從旅程內的快速入口進，
  // 兩邊 context 分開才不會搞混「這趟」與「全部」
  const isActive = (t) => {
    if (t.path === '/') return pathname === '/'
    if (t.key === 'itin') return pathname === '/itinerary'
    if (t.key === 'expenses') return pathname === '/expenses'
    if (t.key === 'trips') return pathname.startsWith('/trips') || pathname.startsWith('/trip/')
    return pathname.startsWith(t.path)
  }

  return (
    <nav className="bottomnav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`navitem ${isActive(t) ? 'active' : ''}`}
          onClick={() => nav(t.path)}
        >
          <Icon className="glyph" name={t.icon} size={30} fill={isActive(t) && t.icon === 'home'} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
