import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 用 divIcon 而非預設圖示：預設 marker 的圖檔路徑在打包後會失效，且自繪才能沿用 App 的配色
const pinIcon = (color, n) =>
  L.divIcon({
    className: 'lf-pin-wrap',
    html: `<span class="lf-pin" style="background:${color}">${n ? `<b>${n}</b>` : ''}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  })

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export default function MapView({ markers = [], route = false, fallbackCenter }) {
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)

  useEffect(() => {
    if (map.current) return
    map.current = L.map(el.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      // 預設即開啟拖曳、雙指縮放、雙擊放大
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    map.current.setView([35.0116, 135.7681], 11)
    // 容器在動畫/版面穩定前掛載時尺寸可能是 0，會導致只畫出局部圖磚
    setTimeout(() => map.current?.invalidateSize(), 0)

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m || !layer.current) return
    layer.current.clearLayers()

    const pts = markers.filter((k) => Number.isFinite(k.lat) && Number.isFinite(k.lng))

    pts.forEach((k) => {
      L.marker([k.lat, k.lng], { icon: pinIcon(k.color, k.n), title: k.name })
        .bindPopup(
          `<div class="lf-pop"><b>${esc(k.name)}</b>${k.sub ? `<span>${esc(k.sub)}</span>` : ''}</div>`,
        )
        .addTo(layer.current)
    })

    if (route && pts.length > 1) {
      L.polyline(pts.map((k) => [k.lat, k.lng]), {
        color: '#E8743B', weight: 3, opacity: 0.85, dashArray: '6 6',
      }).addTo(layer.current)
    }

    m.invalidateSize()
    if (pts.length === 1) {
      m.setView([pts[0].lat, pts[0].lng], 15)
    } else if (pts.length > 1) {
      m.fitBounds(L.latLngBounds(pts.map((k) => [k.lat, k.lng])), { padding: [36, 36], maxZoom: 16 })
    } else if (fallbackCenter) {
      m.setView([fallbackCenter.lat, fallbackCenter.lng], 11)
    }
  }, [markers, route, fallbackCenter])

  return <div ref={el} className="mapview" />
}
