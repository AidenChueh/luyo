const CODE = {
  0: { cond: '晴', icon: 'sun' },
  1: { cond: '大致晴朗', icon: 'sun' },
  2: { cond: '多雲時晴', icon: 'cloudSun' },
  3: { cond: '陰', icon: 'cloud' },
  45: { cond: '霧', icon: 'cloud' }, 48: { cond: '霧', icon: 'cloud' },
  51: { cond: '毛毛雨', icon: 'rain' }, 53: { cond: '毛毛雨', icon: 'rain' }, 55: { cond: '毛毛雨', icon: 'rain' },
  56: { cond: '凍雨', icon: 'rain' }, 57: { cond: '凍雨', icon: 'rain' },
  61: { cond: '雨', icon: 'rain' }, 63: { cond: '雨', icon: 'rain' }, 65: { cond: '雨', icon: 'rain' },
  66: { cond: '凍雨', icon: 'rain' }, 67: { cond: '凍雨', icon: 'rain' },
  71: { cond: '雪', icon: 'snow' }, 73: { cond: '雪', icon: 'snow' }, 75: { cond: '雪', icon: 'snow' }, 77: { cond: '雪', icon: 'snow' },
  80: { cond: '陣雨', icon: 'rain' }, 81: { cond: '陣雨', icon: 'rain' }, 82: { cond: '陣雨', icon: 'rain' },
  85: { cond: '陣雪', icon: 'snow' }, 86: { cond: '陣雪', icon: 'snow' },
  95: { cond: '雷雨', icon: 'rain' }, 96: { cond: '雷雨', icon: 'rain' }, 99: { cond: '雷雨', icon: 'rain' },
}

export function wmo(code) {
  return CODE[code] || { cond: '—', icon: 'cloudSun' }
}

export function shapeWeather(json, targetDate) {
  const d = json?.daily
  if (!d || !Array.isArray(d.time)) return null
  if (targetDate) {
    const i = d.time.indexOf(targetDate)
    if (i === -1) return null
    const w = wmo(d.weather_code[i])
    return { tmp: Math.round(d.temperature_2m_max[i]), cond: w.cond, hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]), icon: w.icon }
  }
  const c = json.current
  if (!c) return null
  const w = wmo(c.weather_code)
  return { tmp: Math.round(c.temperature_2m), cond: w.cond, hi: Math.round(d.temperature_2m_max[0]), lo: Math.round(d.temperature_2m_min[0]), icon: w.icon }
}
