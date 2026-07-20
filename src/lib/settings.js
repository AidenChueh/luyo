import { ME } from '../data/seed'

const PROFILE_KEY = 'luyo:profile:v1'
const PREFS_KEY = 'luyo:prefs:v1'
const QUICK_KEY = 'luyo:quickorder:v1'

const DEFAULT_PROFILE = { name: '艾登', avatar: '' }
const DEFAULT_PREFS = { currency: 'TWD', notifications: true }

export const CURRENCY_OPTIONS = [
  { code: 'TWD', sym: 'NT$' },
  { code: 'JPY', sym: '¥' },
  { code: 'KRW', sym: '₩' },
  { code: 'USD', sym: '$' },
  { code: 'AUD', sym: 'A$' },
  { code: 'EUR', sym: '€' },
  { code: 'THB', sym: '฿' },
]

export const getProfile = () => {
  try { return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') } } catch { return { ...DEFAULT_PROFILE } }
}
export const setProfile = (patch) => {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...getProfile(), ...patch })) } catch {}
}

export const getPrefs = () => {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } } catch { return { ...DEFAULT_PREFS } }
}
export const setPrefs = (patch) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...getPrefs(), ...patch })) } catch {}
}

// 存 key 陣列而非索引，之後增刪入口時舊資料仍可用
export const getQuickOrder = () => {
  try {
    const v = JSON.parse(localStorage.getItem(QUICK_KEY) || 'null')
    return Array.isArray(v) ? v : null
  } catch { return null }
}
export const setQuickOrder = (keys) => {
  try { localStorage.setItem(QUICK_KEY, JSON.stringify(keys)) } catch {}
}

export const getMe = () => {
  const p = getProfile()
  return { ...ME, name: p.name || ME.name, avatar: p.avatar || '' }
}
