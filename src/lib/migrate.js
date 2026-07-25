const PERTRIP = ['expenses', 'prep', 'itinerary', 'places', 'journal', 'flights', 'stays', 'photos', 'companions']
const KEY = {
  expenses: 'luyo:expenses:v1', prep: 'luyo:prep:v1', itinerary: 'luyo:itinerary:v1',
  places: 'luyo:places:v1', journal: 'luyo:journal:v1', flights: 'luyo:flights:v1',
  stays: 'luyo:stays:v1', photos: 'luyo:photos:v1', companions: 'luyo:companions:v1',
  trips: 'luyo:trips:v2', profile: 'luyo:profile:v1', prefs: 'luyo:prefs:v1', quickorder: 'luyo:quickorder:v1',
}

export function packState(s) {
  return {
    v: 1,
    expenses: s.expenses, trips: s.trips, prep: s.prep, itinerary: s.itinerary, places: s.places,
    journal: s.journal, flights: s.flights, stays: s.stays, photos: s.photos, companions: s.companions,
    profile: s.profile, prefs: s.prefs, quickorder: s.quickorder,
  }
}

export function unpackState(d) {
  const data = d || {}
  const obj = (x) => (x && typeof x === 'object' ? x : {})
  return {
    expenses: obj(data.expenses), prep: obj(data.prep), itinerary: obj(data.itinerary),
    places: obj(data.places), journal: obj(data.journal), flights: obj(data.flights),
    stays: obj(data.stays), photos: obj(data.photos), companions: obj(data.companions),
    trips: data.trips && typeof data.trips === 'object'
      ? { custom: data.trips.custom || [], overrides: data.trips.overrides || {}, deleted: data.trips.deleted || [] }
      : { custom: [], overrides: {}, deleted: [] },
    profile: data.profile || null,
    prefs: data.prefs || null,
    quickorder: data.quickorder ?? null,
  }
}

export function collectLocalCustom(readKey) {
  let tripData
  try { tripData = JSON.parse(readKey(KEY.trips) || 'null') } catch { tripData = null }
  const custom = tripData?.custom || []
  if (!custom.length) return null
  const ids = new Set(custom.map((t) => t.id))

  const pick = (raw) => {
    let all
    try { all = JSON.parse(raw || 'null') } catch { return {} }
    if (!all || typeof all !== 'object') return {}
    const out = {}
    for (const id of Object.keys(all)) if (ids.has(id)) out[id] = all[id]
    return out
  }
  const parse = (raw, fb) => { try { return JSON.parse(raw || 'null') ?? fb } catch { return fb } }

  const slices = { trips: { custom, overrides: {}, deleted: [] } }
  for (const name of PERTRIP) slices[name] = pick(readKey(KEY[name]))
  slices.profile = parse(readKey(KEY.profile), null)
  slices.prefs = parse(readKey(KEY.prefs), null)
  slices.quickorder = parse(readKey(KEY.quickorder), null)
  return packState(slices)
}

export function clearLegacy(removeKey) {
  for (const k of Object.values(KEY)) removeKey(k)
}
