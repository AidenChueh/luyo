// OpenStreetMap Nominatim：免 API key。使用條款要求低頻率請求，故僅在使用者主動按「定位」時呼叫
const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

const cache = new Map()

export async function geocode(query) {
  const q = String(query || '').trim()
  if (!q) return null
  if (cache.has(q)) return cache.get(q)

  const url = `${ENDPOINT}?format=jsonv2&limit=1&accept-language=zh-TW&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('定位服務暫時無法使用')
  const data = await res.json()
  if (!data.length) {
    cache.set(q, null)
    return null
  }
  const hit = { lat: Number(data[0].lat), lng: Number(data[0].lon), label: data[0].display_name }
  cache.set(q, hit)
  return hit
}
