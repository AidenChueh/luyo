import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { expenses as seedExpenses, trips as seedTrips, prep as seedPrep, prepTemplate, itinerary as seedItin, places as seedPlaces, journal as seedJournal, flights as seedFlights, stays as seedStays, photos as seedPhotos, companions as seedCompanions, ITIN_TO_PLACE } from './data/seed'
import { removeRecap, removePlan, removeBudgetAnalysis } from './lib/ai'
import { parseGmaps } from './lib/gmaps'
import { geocode } from './lib/geocode'

const StoreCtx = createContext(null)
const EXP_KEY = 'luyo:expenses:v1'
const COMP_KEY = 'luyo:companions:v1'
const TRIP_KEY = 'luyo:trips:v2'
const PREP_KEY = 'luyo:prep:v1'
const ITIN_KEY = 'luyo:itinerary:v1'
const PLACE_KEY = 'luyo:places:v1'
const JOURNAL_KEY = 'luyo:journal:v1'
const FLIGHT_KEY = 'luyo:flights:v1'
const STAY_KEY = 'luyo:stays:v1'
const PHOTO_KEY = 'luyo:photos:v1'

const seedExpState = () => {
  const init = {}
  for (const k of Object.keys(seedExpenses)) init[k] = [...seedExpenses[k]]
  return init
}
const seedPrepState = () => JSON.parse(JSON.stringify(seedPrep))
const seedItinState = () => JSON.parse(JSON.stringify(seedItin))
const seedPlaceState = () => JSON.parse(JSON.stringify(seedPlaces))
const seedJournalState = () => JSON.parse(JSON.stringify(seedJournal))
const seedFlightState = () => JSON.parse(JSON.stringify(seedFlights))
const seedStayState = () => JSON.parse(JSON.stringify(seedStays))
const seedPhotoState = () => JSON.parse(JSON.stringify(seedPhotos))
const seedCompState = () => JSON.parse(JSON.stringify(seedCompanions))
// 自建旅程 + 種子旅程的覆寫 / 刪除（種子陣列本身不可變，故用 overrides/deleted）
const emptyTripData = () => ({ custom: [], overrides: {}, deleted: [] })

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // 解析失敗 → 回 fallback
  }
  return fallback()
}

const uid = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

let storageWarned = false
const persist = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    if (!storageWarned) {
      storageWarned = true
      alert('儲存空間已滿，最近的變更可能不會被保存')
    }
  }
}

export function StoreProvider({ children }) {
  const [byTrip, setByTrip] = useState(() => load(EXP_KEY, seedExpState))
  const [tripData, setTripData] = useState(() => load(TRIP_KEY, emptyTripData))
  const [prepByTrip, setPrepByTrip] = useState(() => load(PREP_KEY, seedPrepState))
  const [itinByTrip, setItinByTrip] = useState(() => load(ITIN_KEY, seedItinState))
  const [placeByTrip, setPlaceByTrip] = useState(() => load(PLACE_KEY, seedPlaceState))
  const [journalByTrip, setJournalByTrip] = useState(() => load(JOURNAL_KEY, seedJournalState))
  const [flightByTrip, setFlightByTrip] = useState(() => load(FLIGHT_KEY, seedFlightState))
  const [stayByTrip, setStayByTrip] = useState(() => load(STAY_KEY, seedStayState))
  const [photoByTrip, setPhotoByTrip] = useState(() => load(PHOTO_KEY, seedPhotoState))
  const [compByTrip, setCompByTrip] = useState(() => load(COMP_KEY, seedCompState))
  const [add, setAdd] = useState({ open: false, tripId: null, editId: null })
  const [tripSheet, setTripSheet] = useState({ open: false, editId: null })
  const [itinSheet, setItinSheet] = useState({ open: false, tripId: null, day: 1, editId: null, prefill: null })
  const [placeSheet, setPlaceSheet] = useState({ open: false, tripId: null, editId: null })
  const [journalSheet, setJournalSheet] = useState({ open: false, tripId: null, editId: null })
  const [flightSheet, setFlightSheet] = useState({ open: false, tripId: null, editId: null })
  const [staySheet, setStaySheet] = useState({ open: false, tripId: null, editId: null })
  const [photoSheet, setPhotoSheet] = useState({ open: false, tripId: null })
  const [compSheet, setCompSheet] = useState({ open: false, tripId: null, editId: null })
  // 自製確認彈窗：PWA/部分瀏覽器會擋掉原生 confirm()，導致刪除按鈕完全沒反應
  const [confirmState, setConfirmState] = useState({ open: false, message: '', confirmText: '刪除', onConfirm: null })

  useEffect(() => { persist(EXP_KEY, byTrip) }, [byTrip])
  useEffect(() => { persist(TRIP_KEY, tripData) }, [tripData])
  useEffect(() => { persist(PREP_KEY, prepByTrip) }, [prepByTrip])
  useEffect(() => { persist(ITIN_KEY, itinByTrip) }, [itinByTrip])
  useEffect(() => { persist(PLACE_KEY, placeByTrip) }, [placeByTrip])
  useEffect(() => { persist(JOURNAL_KEY, journalByTrip) }, [journalByTrip])
  useEffect(() => { persist(FLIGHT_KEY, flightByTrip) }, [flightByTrip])
  useEffect(() => { persist(STAY_KEY, stayByTrip) }, [stayByTrip])
  useEffect(() => { persist(PHOTO_KEY, photoByTrip) }, [photoByTrip])
  useEffect(() => { persist(COMP_KEY, compByTrip) }, [compByTrip])

  // 自建旅程排前面，套用覆寫、濾掉已刪除
  const trips = useMemo(() => {
    return [...tripData.custom, ...seedTrips]
      .filter((t) => !tripData.deleted.includes(t.id))
      .map((t) => (tripData.overrides[t.id] ? { ...t, ...tripData.overrides[t.id] } : t))
  }, [tripData])
  const getTrip = (id) => trips.find((t) => t.id === id)

  const addExpense = (tripId, exp) => {
    setByTrip((prev) => {
      let list = prev[tripId]
      if (!list) {
        const t = getTrip(tripId)
        list = t.spent ? [{ id: 'base', date: t.start, cat: 'other', title: '既有支出', amt: t.spent, loc: '前置紀錄' }] : []
      }
      return { ...prev, [tripId]: [...list, { id: uid('e'), ...exp }] }
    })
  }

  const addTrip = (trip) => {
    setTripData((prev) => ({ ...prev, custom: [trip, ...prev.custom] }))
    return trip.id
  }

  const isCustom = (id) => tripData.custom.some((t) => t.id === id)

  const toggleFav = (id) => {
    const t = getTrip(id)
    if (t) editTrip(id, { favorite: !t.favorite })
  }

  const editTrip = (id, patch) => {
    setTripData((prev) => {
      if (prev.custom.some((t) => t.id === id)) {
        return { ...prev, custom: prev.custom.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
      }
      return { ...prev, overrides: { ...prev.overrides, [id]: { ...prev.overrides[id], ...patch } } }
    })
  }

  const deleteTrip = (id) => {
    setTripData((prev) => {
      if (prev.custom.some((t) => t.id === id)) {
        return { ...prev, custom: prev.custom.filter((t) => t.id !== id) }
      }
      const overrides = { ...prev.overrides }; delete overrides[id]
      return { ...prev, overrides, deleted: [...prev.deleted, id] }
    })
    setByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setPrepByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setItinByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setPlaceByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setJournalByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setFlightByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setStayByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setPhotoByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    setCompByTrip((prev) => { const n = { ...prev }; delete n[id]; return n })
    removeRecap(id)
    removePlan(id)
    removeBudgetAnalysis(id)
  }

  const editExpense = (tripId, id, patch) =>
    setByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  const removeExpense = (tripId, id) =>
    setByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((e) => e.id !== id) }))

  // 機票/住宿等來源的連動支出：以固定 linkId 做 upsert，價格為 0 或來源刪除時一併移除
  const baseList = (tripId) => {
    const t = getTrip(tripId)
    return t?.spent ? [{ id: 'base', date: t.start, cat: 'other', title: '既有支出', amt: t.spent, loc: '前置紀錄' }] : []
  }
  const syncLinkedExpense = (tripId, linkId, data) => {
    setByTrip((prev) => {
      const list = prev[tripId] || baseList(tripId)
      const rest = list.filter((e) => e.id !== linkId)
      if (!data || !data.amt) return { ...prev, [tripId]: rest }
      return { ...prev, [tripId]: [...rest, { id: linkId, ...data }] }
    })
  }

  const getExpenses = (tripId) => byTrip[tripId] || null
  const getSpent = (trip) => {
    const list = byTrip[trip.id]
    return list ? list.reduce((s, e) => s + e.amt, 0) : trip.spent
  }

  // ---- 行前準備 ----
  const getPrep = (tripId) => prepByTrip[tripId] || prepTemplate()
  const ensurePrep = (prev, tripId) => (prev[tripId] ? prev : { ...prev, [tripId]: prepTemplate() })
  const togglePrep = (tripId, kind, itemId) =>
    setPrepByTrip((prev0) => {
      const prev = ensurePrep(prev0, tripId)
      const list = prev[tripId][kind].map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
      return { ...prev, [tripId]: { ...prev[tripId], [kind]: list } }
    })
  const addPrep = (tripId, kind, item) =>
    setPrepByTrip((prev0) => {
      const prev = ensurePrep(prev0, tripId)
      const it = { id: uid('p'), done: false, ...item }
      return { ...prev, [tripId]: { ...prev[tripId], [kind]: [...prev[tripId][kind], it] } }
    })
  const removePrep = (tripId, kind, itemId) =>
    setPrepByTrip((prev0) => {
      const prev = ensurePrep(prev0, tripId)
      const list = prev[tripId][kind].filter((it) => it.id !== itemId)
      return { ...prev, [tripId]: { ...prev[tripId], [kind]: list } }
    })
  const reorderPrep = (tripId, kind, items) =>
    setPrepByTrip((prev0) => {
      const prev = ensurePrep(prev0, tripId)
      return { ...prev, [tripId]: { ...prev[tripId], [kind]: items } }
    })

  // ---- 行程時間軸 ----
  // 行程項目只記天數，記帳需要日期 → 由旅程起日推算
  const pad2 = (n) => String(n).padStart(2, '0')
  const dayDate = (tripId, day) => {
    const t = getTrip(tripId)
    if (!t?.start) return undefined
    const [y, m, d] = t.start.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + (Number(day) || 1) - 1)
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
  }
  const ITIN_TO_CAT = { sight: 'ticket', food: 'food', transport: 'transport', shopping: 'shopping', hotel: 'hotel' }
  const itinExpense = (tripId, day, it) => ({
    date: dayDate(tripId, day),
    cat: ITIN_TO_CAT[it.cat] || 'other',
    title: it.title || '行程',
    amt: Number(it.act) || 0,
    loc: it.loc || '',
  })

  const getItinerary = (tripId) => itinByTrip[tripId] || {}
  const addItin = (tripId, day, item) => {
    const iid = uid('i')
    setItinByTrip((prev) => {
      const trip = prev[tripId] || {}
      const list = trip[day] || []
      return { ...prev, [tripId]: { ...trip, [day]: [...list, { id: iid, ...item }] } }
    })
    syncLinkedExpense(tripId, `lnk-${iid}`, itinExpense(tripId, day, item))
    syncLinkedPlace(tripId, iid, item)
  }
  const editItin = (tripId, day, itemId, patch) => {
    setItinByTrip((prev) => {
      const list = (prev[tripId]?.[day] || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it))
      return { ...prev, [tripId]: { ...prev[tripId], [day]: list } }
    })
    syncLinkedExpense(tripId, `lnk-${itemId}`, itinExpense(tripId, day, patch))
    syncLinkedPlace(tripId, itemId, patch)
  }
  const removeItin = (tripId, day, itemId) => {
    setItinByTrip((prev) => {
      const list = (prev[tripId]?.[day] || []).filter((it) => it.id !== itemId)
      return { ...prev, [tripId]: { ...prev[tripId], [day]: list } }
    })
    syncLinkedExpense(tripId, `lnk-${itemId}`, null)
    syncLinkedPlace(tripId, itemId, null)
  }
  const copyItinDay = (tripId, fromDay, toDay) => {
    const src = itinByTrip[tripId]?.[fromDay] || []
    const cloned = src.map((it) => ({ ...it, id: uid('i') }))
    setItinByTrip((prev) => {
      const dst = prev[tripId]?.[toDay] || []
      return { ...prev, [tripId]: { ...prev[tripId], [toDay]: [...dst, ...cloned] } }
    })
    // 複製出來的是各自獨立的行程，有實際花費就各自建立對應支出
    cloned.forEach((it) => {
      syncLinkedExpense(tripId, `lnk-${it.id}`, itinExpense(tripId, toDay, it))
      syncLinkedPlace(tripId, it.id, it)
    })
  }

  const syncLinkedPlace = async (tripId, itinId, it) => {
    const pid = `lnk-${itinId}`
    if (!it || !it.maps) {
      setPlaceByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((p) => p.id !== pid) }))
      return
    }
    const fields = {
      id: pid,
      name: it.title || '未命名',
      type: ITIN_TO_PLACE[it.cat] || 'sight',
      tag: 'must',
      rating: it.rating || 0,
      note: it.note || '',
      maps: it.maps,
      photo: '',
    }
    let coord = parseGmaps(it.maps)
    if (!coord) {
      // 短網址不含座標且無法在瀏覽器跟隨轉址，退回用名稱查 Nominatim
      const trip = getTrip(tripId)
      const hint = [trip?.city, trip?.country].filter((s) => s && s !== '—').join(' ')
      try {
        coord = await geocode(`${fields.name} ${hint}`.trim())
      } catch {
        coord = null
      }
    }
    setPlaceByTrip((prev) => {
      const list = prev[tripId] || []
      const next = { ...fields, lat: coord?.lat, lng: coord?.lng }
      return {
        ...prev,
        [tripId]: list.some((p) => p.id === pid)
          ? list.map((p) => (p.id === pid ? next : p))
          : [next, ...list],
      }
    })
  }

  // ---- 地點庫 ----
  const getPlaces = (tripId) => placeByTrip[tripId] || []
  const addPlace = (tripId, place) =>
    setPlaceByTrip((prev) => ({ ...prev, [tripId]: [{ id: place.id || uid('pl'), ...place }, ...(prev[tripId] || [])] }))
  const editPlace = (tripId, placeId, patch) =>
    setPlaceByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).map((p) => (p.id === placeId ? { ...p, ...patch } : p)) }))
  const removePlace = (tripId, placeId) =>
    setPlaceByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((p) => p.id !== placeId) }))

  // ---- 旅遊日誌 ----
  const getJournal = (tripId) => journalByTrip[tripId] || []
  const addJournal = (tripId, entry) =>
    setJournalByTrip((prev) => ({ ...prev, [tripId]: [{ id: uid('j'), ...entry }, ...(prev[tripId] || [])] }))
  const editJournal = (tripId, entryId, patch) =>
    setJournalByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }))
  const removeJournal = (tripId, entryId) =>
    setJournalByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((e) => e.id !== entryId) }))

  // ---- 機票 ----
  const flightExpense = (f) => ({
    date: f.date || getTrip(f.tripId)?.start, cat: 'flight',
    title: `${f.airline || '機票'} ${f.no || ''}`.trim(),
    amt: Number(f.price) || 0, loc: [f.depAp, f.arrAp].filter(Boolean).join(' → ') || '機票',
  })
  const getFlights = (tripId) => flightByTrip[tripId] || []
  const addFlight = (tripId, f) => {
    const id = uid('f')
    setFlightByTrip((prev) => ({ ...prev, [tripId]: [...(prev[tripId] || []), { id, ...f }] }))
    syncLinkedExpense(tripId, `lnk-${id}`, flightExpense({ ...f, tripId }))
  }
  const editFlight = (tripId, fid, patch) => {
    setFlightByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).map((f) => (f.id === fid ? { ...f, ...patch } : f)) }))
    syncLinkedExpense(tripId, `lnk-${fid}`, flightExpense({ ...patch, tripId }))
  }
  const removeFlight = (tripId, fid) => {
    setFlightByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((f) => f.id !== fid) }))
    syncLinkedExpense(tripId, `lnk-${fid}`, null)
  }
  const reorderFlights = (tripId, items) =>
    setFlightByTrip((prev) => ({ ...prev, [tripId]: items }))

  // ---- 住宿 ----
  const stayExpense = (s) => ({
    date: s.checkin || getTrip(s.tripId)?.start, cat: 'hotel',
    title: s.name || '住宿', amt: Number(s.price) || 0, loc: s.address || '住宿',
  })
  const getStays = (tripId) => stayByTrip[tripId] || []
  const addStay = (tripId, s) => {
    const id = uid('h')
    setStayByTrip((prev) => ({ ...prev, [tripId]: [...(prev[tripId] || []), { id, ...s }] }))
    syncLinkedExpense(tripId, `lnk-${id}`, stayExpense({ ...s, tripId }))
  }
  const editStay = (tripId, sid, patch) => {
    setStayByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).map((s) => (s.id === sid ? { ...s, ...patch } : s)) }))
    syncLinkedExpense(tripId, `lnk-${sid}`, stayExpense({ ...patch, tripId }))
  }
  const removeStay = (tripId, sid) => {
    setStayByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((s) => s.id !== sid) }))
    syncLinkedExpense(tripId, `lnk-${sid}`, null)
  }

  // ---- 相簿 ----
  const getPhotos = (tripId) => photoByTrip[tripId] || []
  const addPhoto = (tripId, p) =>
    setPhotoByTrip((prev) => ({ ...prev, [tripId]: [...(prev[tripId] || []), { id: uid('ph'), ...p }] }))
  const removePhoto = (tripId, pid) =>
    setPhotoByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((p) => p.id !== pid) }))

  // ---- 同行者 ----
  const COLORS = ['#3E7C5A', '#2F6E8F', '#8C6BB1', '#C77B1E', '#B5557E', '#C2410C']
  const getCompanions = (tripId) => compByTrip[tripId] || []
  const addCompanion = (tripId, c) =>
    setCompByTrip((prev) => {
      const list = prev[tripId] || []
      return { ...prev, [tripId]: [...list, { id: uid('c'), color: COLORS[list.length % COLORS.length], ...c }] }
    })
  const editCompanion = (tripId, cid, patch) =>
    setCompByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).map((c) => (c.id === cid ? { ...c, ...patch } : c)) }))
  const removeCompanion = (tripId, cid) => {
    setCompByTrip((prev) => ({ ...prev, [tripId]: (prev[tripId] || []).filter((c) => c.id !== cid) }))
    setByTrip((prev) => {
      const list = prev[tripId]
      if (!list) return prev
      return {
        ...prev,
        [tripId]: list.map((e) => ({
          ...e,
          payer: e.payer === cid ? 'me' : e.payer,
          split: e.split ? e.split.filter((s) => s !== cid) : e.split,
        })),
      }
    })
  }

  const reset = () => {
    try {
      localStorage.removeItem(EXP_KEY); localStorage.removeItem(TRIP_KEY)
      localStorage.removeItem(PREP_KEY); localStorage.removeItem(ITIN_KEY)
      localStorage.removeItem(PLACE_KEY); localStorage.removeItem(JOURNAL_KEY)
      localStorage.removeItem(FLIGHT_KEY); localStorage.removeItem(STAY_KEY)
      localStorage.removeItem(PHOTO_KEY); localStorage.removeItem(COMP_KEY)
    } catch {}
    setByTrip(seedExpState())
    setTripData(emptyTripData())
    setPrepByTrip(seedPrepState())
    setItinByTrip(seedItinState())
    setPlaceByTrip(seedPlaceState())
    setJournalByTrip(seedJournalState())
    setFlightByTrip(seedFlightState())
    setStayByTrip(seedStayState())
    setPhotoByTrip(seedPhotoState())
    setCompByTrip(seedCompState())
  }

  const openAdd = (tripId, editId = null) => setAdd({ open: true, tripId, editId })
  const closeAdd = () => setAdd((a) => ({ ...a, open: false }))

  const value = useMemo(
    () => ({
      trips, getTrip, addTrip, editTrip, deleteTrip, isCustom, toggleFav,
      byTrip, addExpense, editExpense, removeExpense, getExpenses, getSpent, reset,
      getPrep, togglePrep, addPrep, removePrep, reorderPrep,
      getItinerary, addItin, editItin, removeItin, copyItinDay,
      getPlaces, addPlace, editPlace, removePlace,
      getJournal, addJournal, editJournal, removeJournal,
      getFlights, addFlight, editFlight, removeFlight, reorderFlights,
      getStays, addStay, editStay, removeStay,
      getPhotos, addPhoto, removePhoto,
      getCompanions, addCompanion, editCompanion, removeCompanion,
      add, openAdd, closeAdd,
      tripSheet,
      openTripSheet: (editId = null) => setTripSheet({ open: true, editId }),
      closeTripSheet: () => setTripSheet((s) => ({ ...s, open: false })),
      itinSheet,
      openItin: (tripId, day, editId = null, prefill = null) => setItinSheet({ open: true, tripId, day, editId, prefill }),
      closeItin: () => setItinSheet((s) => ({ ...s, open: false })),
      placeSheet,
      openPlace: (tripId, editId = null) => setPlaceSheet({ open: true, tripId, editId }),
      closePlace: () => setPlaceSheet((s) => ({ ...s, open: false })),
      journalSheet,
      openJournal: (tripId, editId = null) => setJournalSheet({ open: true, tripId, editId }),
      closeJournal: () => setJournalSheet((s) => ({ ...s, open: false })),
      flightSheet,
      openFlight: (tripId, editId = null) => setFlightSheet({ open: true, tripId, editId }),
      closeFlight: () => setFlightSheet((s) => ({ ...s, open: false })),
      staySheet,
      openStay: (tripId, editId = null) => setStaySheet({ open: true, tripId, editId }),
      closeStay: () => setStaySheet((s) => ({ ...s, open: false })),
      photoSheet,
      openPhoto: (tripId) => setPhotoSheet({ open: true, tripId }),
      closePhoto: () => setPhotoSheet((s) => ({ ...s, open: false })),
      compSheet,
      openCompanion: (tripId, editId = null) => setCompSheet({ open: true, tripId, editId }),
      closeCompanion: () => setCompSheet((s) => ({ ...s, open: false })),
      confirmState,
      askConfirm: (opts) => setConfirmState({ open: true, message: '', confirmText: '刪除', ...opts }),
      closeConfirm: () => setConfirmState((s) => ({ ...s, open: false })),
    }),
    [byTrip, tripData, prepByTrip, itinByTrip, placeByTrip, journalByTrip, flightByTrip, stayByTrip, photoByTrip, compByTrip, add, tripSheet, itinSheet, placeSheet, journalSheet, flightSheet, staySheet, photoSheet, compSheet, confirmState],
  )
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export const useStore = () => useContext(StoreCtx)
