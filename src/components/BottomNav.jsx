import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'

const TABS = [
  { key: 'home', label: '首頁', icon: 'home', path: '/' },
  { key: 'trips', label: '旅程', icon: 'map', path: '/trips' },
  { key: 'itin', label: '行程', icon: 'route', path: '/itinerary' },
  { key: 'expenses', label: '記帳', icon: 'wallet', path: '/expenses' },
  { key: 'profile', label: '我的', icon: 'user', path: '/profile' },
]

const SUB = /^\/trip\/[^/]+\/(itinerary|expenses)/

export default function BottomNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const isActive = (t) => {
    if (t.path === '/') return pathname === '/'
    if (t.key === 'itin') return pathname === '/itinerary' || /^\/trip\/[^/]+\/itinerary/.test(pathname)
    if (t.key === 'expenses') return pathname === '/expenses' || /^\/trip\/[^/]+\/expenses/.test(pathname)
    if (t.key === 'trips') return (pathname.startsWith('/trips') || pathname.startsWith('/trip/')) && !SUB.test(pathname)
    return pathname.startsWith(t.path)
  }

  const tripId = pathname.match(/^\/trip\/([^/]+)/)?.[1]
  const targetOf = (t) => {
    if (tripId && t.key === 'itin') return `/trip/${tripId}/itinerary`
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
