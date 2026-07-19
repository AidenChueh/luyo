import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'

const TABS = [
  { key: 'home', label: '首頁', icon: 'home', path: '/' },
  { key: 'trips', label: '旅程', icon: 'map', path: '/trips' },
  { key: 'map', label: '地圖', icon: 'route', path: '/map' },
  { key: 'expenses', label: '記帳', icon: 'wallet', path: '/expenses' },
  { key: 'profile', label: '我的', icon: 'user', path: '/profile' },
]

export default function BottomNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const isActive = (t) => {
    if (t.path === '/') return pathname === '/'
    if (t.key === 'map') return pathname === '/map' || /^\/trip\/[^/]+\/map/.test(pathname)
    if (t.key === 'expenses') return pathname === '/expenses' || /^\/trip\/[^/]+\/expenses/.test(pathname)
    if (t.key === 'trips') return (pathname.startsWith('/trips') || pathname.startsWith('/trip/')) && !/^\/trip\/[^/]+\/(map|expenses)/.test(pathname)
    return pathname.startsWith(t.path)
  }

  const tripId = pathname.match(/^\/trip\/([^/]+)/)?.[1]
  const targetOf = (t) => {
    if (tripId && t.key === 'map') return `/trip/${tripId}/map`
    if (tripId && t.key === 'expenses') return `/trip/${tripId}/expenses`
    return t.path
  }

  return (
    <nav className="bottomnav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`navitem ${isActive(t) ? 'active' : ''}`}
          onClick={() => nav(targetOf(t))}
        >
          <Icon className="glyph" name={t.icon} size={34} fill={isActive(t) && t.icon === 'home'} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
