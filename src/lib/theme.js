const KEY = 'luyo:theme'

export const getTheme = () => {
  try { return localStorage.getItem(KEY) || 'light' } catch { return 'light' }
}

export const applyTheme = (t) => {
  document.documentElement.setAttribute('data-theme', t)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', t === 'dark' ? '#1A1714' : '#FBF8F4')
  try { localStorage.setItem(KEY, t) } catch {}
}
