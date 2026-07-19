import { ME } from '../data/seed'

const PROFILE_KEY = 'luyo:profile:v1'
const PREFS_KEY = 'luyo:prefs:v1'

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

export const getMe = () => {
  const p = getProfile()
  return { ...ME, name: p.name || ME.name, avatar: p.avatar || '' }
}
