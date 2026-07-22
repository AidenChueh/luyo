const inRange = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  Math.abs(lat) <= 90 && Math.abs(lng) <= 180

const hit = (lat, lng) => {
  const a = Number(lat), b = Number(lng)
  return inRange(a, b) ? { lat: a, lng: b } : null
}

const N = '(-?\\d+(?:\\.\\d+)?)'

export function parseGmaps(url) {
  const s = String(url || '').trim()
  if (!s) return null

  // !3d!4d 是地點的實際座標，@ 只是地圖視野中心，優先取前者
  const m3d = s.match(new RegExp(`!3d${N}!4d${N}`))
  if (m3d) { const r = hit(m3d[1], m3d[2]); if (r) return r }

  const mAt = s.match(new RegExp(`/@${N},${N}`))
  if (mAt) { const r = hit(mAt[1], mAt[2]); if (r) return r }

  const mQ = s.match(new RegExp(`[?&](?:q|ll|query|center|daddr)=${N},\\s*${N}`))
  if (mQ) { const r = hit(mQ[1], mQ[2]); if (r) return r }

  return null
}
