const P = {
  search: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3',
  plus: 'M12 5v14 M5 12h14',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z',
  heart: 'M19.5 5.5a5 5 0 0 0-7.5.6 5 5 0 0 0-7.5-.6c-2 2-2 5 0 7L12 20l7.5-7.5c2-2 2-5 0-7z',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  arrowUpRight: 'M7 17L17 7 M8 7h9v9',
  plane: 'M10.5 13.5L4 16v-2l5-3.5L8 5l1.5-.8 2.5 4.8 5.5-3a1.6 1.6 0 0 1 1.6 2.8l-5 3.2 1 5.5L14 18l-2.2-5z',
  bed: 'M3 8v10 M3 12h18v6 M21 18v-4a2 2 0 0 0-2-2h-7v-1a2 2 0 0 1 2-2h2',
  train: 'M8 4h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z M5 11h14 M9 20l-2 2 M15 20l2 2 M9 14h.01 M15 14h.01',
  utensils: 'M5 3v7a2 2 0 0 0 4 0V3 M7 10v11 M17 3c-1.5 0-3 1.5-3 4s1.5 4 3 4v10',
  ticket: 'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z M14 6v2 M14 12v2',
  bag: 'M6 8h12l-1 12H7L6 8z M9 8V6a3 3 0 0 1 6 0v2',
  gift: 'M20 12v8H4v-8 M2 7h20v5H2z M12 7v13 M12 7S11 3 8.5 3 6 7 12 7 M12 7s1-4 3.5-4S18 7 12 7',
  wifi: 'M5 12.5a10 10 0 0 1 14 0 M8.5 16a5 5 0 0 1 7 0 M12 19.5h.01',
  dots: 'M5 12h.01 M12 12h.01 M19 12h.01',
  camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  mapPin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 9h16 M8 3v4 M16 3v4',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 7v5l3 2',
  wallet: 'M3 7a2 2 0 0 1 2-2h12v3 M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H6a2 2 0 0 1 0-3 M17 13h.01',
  sun: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M12 2v2 M12 20v2 M4 12H2 M22 12h-2 M5 5l1.4 1.4 M17.6 17.6L19 19 M19 5l-1.4 1.4 M6.4 17.6L5 19',
  cloudSun: 'M8 5l.5 1 M4 9l1 .5 M11 4.5V3 M14.5 7L16 5.8 M8.5 9.5a3 3 0 1 1 4.5 2.6 M7 20h10a3 3 0 0 0 0-6 4 4 0 0 0-7.7-1.3A3.2 3.2 0 0 0 7 20z',
  cloud: 'M7 18h10a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.7-1.2A3.5 3.5 0 0 0 7 18z',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1 M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M21 19v-1a4 4 0 0 0-3-3.8 M15 4.2a3 3 0 0 1 0 5.6',
  image: 'M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M4 17l5-5 4 4 3-2 4 4',
  list: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h5',
  journal: 'M5 4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z M5 8h13 M9 3v18',
  home: 'M4 11l8-7 8 7 M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9 M10 20v-6h4v6',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20a8 8 0 0 1 16 0',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  bell: 'M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6 M10 20a2 2 0 0 0 4 0',
  alert: 'M12 9v4 M12 17h.01 M10.3 4l-7 12A2 2 0 0 0 5 19h14a2 2 0 0 0 1.7-3l-7-12a2 2 0 0 0-3.4 0z',
  sparkles: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  sliders: 'M4 6h10 M18 6h2 M4 12h2 M10 12h10 M4 18h12 M20 18h0 M14 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M8 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M16 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  check: 'M5 12l5 5 9-11',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7 M16 6l-4-4-4 4 M12 2v13',
  download: 'M12 3v12 M8 11l4 4 4-4 M4 19h16',
  star2: 'M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7z',
  coffee: 'M4 8h13v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M17 9h2a2 2 0 0 1 0 4h-2 M8 2v2 M11 2v2 M14 2v2',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  plus2: 'M12 5v14 M5 12h14',
  trash: 'M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6',
}

const FILLED = new Set(['star', 'heart', 'star2'])

export default function Icon({ name, size = 22, fill = false, stroke = 1.75, className = '', style }) {
  const d = P[name] || P.dots
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill && FILLED.has(name) ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : 'M' + seg)} />
      ))}
    </svg>
  )
}
