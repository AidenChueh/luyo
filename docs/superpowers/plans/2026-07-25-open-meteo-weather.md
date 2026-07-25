# 旅程天氣接 Open-Meteo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `TripOverviewScreen` 寫死的靜態天氣換成 Open-Meteo 即時資料，進行中的旅程看今天、規劃中的看出發日、已完成的不顯示。

**Architecture:** 三層。(1) 新檔 `src/lib/weather.js`：純資料層，打 Open-Meteo forecast API、WMO code 對照、localStorage 快取（照 `src/lib/ai.js` 的 `loadJSON`/`saveJSON` 模式）。(2) `src/components/Icon.jsx` 補 `rain`/`snow` 兩個圖示。(3) `TripOverviewScreen` 解析座標（地點庫→trip→Nominatim，結果存回 trip）並依旅程狀態渲染。順帶清掉 `seed.js`、`AddTripSheet.jsx` 的假 `weather` 欄位。

**Tech Stack:** React 18 + Vite 5，狀態在 `src/store.jsx`（Context + localStorage），既有 `src/lib/geocode.js`（Nominatim 封裝）、`editTrip`（store，能持久化種子與自訂旅程）。

## Global Constraints

- 專案無測試框架。純函式用 `node` 直接跑斷言腳本驗證；UI 變更用 `npm run build` + 手動驗收。不新增測試相依套件。
- 程式碼風格：不寫 comment，除非 WHY 不明顯（跟現有 `src/lib/ai.js`、`src/lib/geocode.js` 一致，只在非顯而易見的決策上留一行中文註解）。
- 不加多餘抽象層或錯誤處理。
- UI 文案一律繁體中文。
- Open-Meteo endpoint 固定：`https://api.open-meteo.com/v1/forecast`，參數 `current=temperature_2m,weather_code`、`daily=weather_code,temperature_2m_max,temperature_2m_min`、`timezone=auto`、`forecast_days=16`。免 API key。
- 快取 key 固定 `luyo:weather:v1`，TTL 1 小時。
- 暫存檔一律寫在 `C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad`，不寫進專案。
- 全部任務完成後（Task 4）才更新 `src/screens/StubScreen.jsx` 版號 v1.29 → v1.30、寫 `CHANGELOG.zh.md`、push。中途任務只 commit 不 push。
- 設計依據：`docs/superpowers/specs/2026-07-22-open-meteo-weather-design.md`

---

### Task 1: `src/lib/weather.js` — WMO 對照與資料整形（純函式）

只做不碰網路的純函式：WMO code → `{ cond, icon }`，以及把一份 Open-Meteo JSON 回應 + 目標日期整形成卡片要的物件。網路與快取留到 Task 2，這樣核心邏輯能用 node 斷言測。

**Files:**
- Create: `src/lib/weather.js`
- Test: `<scratchpad>/weather.test.mjs`（暫存，不進 git）

**Interfaces:**
- Consumes: 無
- Produces（本任務先只匯出這兩個）:
  - `export function wmo(code: number): { cond: string, icon: string }`
  - `export function shapeWeather(json: object, targetDate: string | null): { tmp: number, cond: string, hi: number, lo: number, icon: string } | null`

- [ ] **Step 1: 寫失敗的測試**

建立 `<scratchpad>/weather.test.mjs`（`<scratchpad>` 換成 Global Constraints 的絕對路徑）：

```js
import assert from 'node:assert/strict'
import { wmo, shapeWeather } from 'C:/Users/aiden/Desktop/claude/projects/luyo/src/lib/weather.js'

assert.deepEqual(wmo(0), { cond: '晴', icon: 'sun' }, 'code 0')
assert.deepEqual(wmo(2), { cond: '多雲時晴', icon: 'cloudSun' }, 'code 2')
assert.deepEqual(wmo(45), { cond: '霧', icon: 'cloud' }, 'code 45')
assert.deepEqual(wmo(63), { cond: '雨', icon: 'rain' }, 'code 63')
assert.deepEqual(wmo(75), { cond: '雪', icon: 'snow' }, 'code 75')
assert.deepEqual(wmo(95), { cond: '雷雨', icon: 'rain' }, 'code 95')
assert.deepEqual(wmo(999), { cond: '—', icon: 'cloudSun' }, '未知 code 回預設')

const json = {
  current: { temperature_2m: 28.4, weather_code: 2 },
  daily: {
    time: ['2026-07-25', '2026-07-26', '2026-07-27'],
    weather_code: [2, 63, 0],
    temperature_2m_max: [31.2, 29.9, 33.1],
    temperature_2m_min: [24.1, 23.5, 25.0],
  },
}

// targetDate = null → 用 current 當 tmp/cond，hi/lo 取 daily[0]（今天）
assert.deepEqual(
  shapeWeather(json, null),
  { tmp: 28, cond: '多雲時晴', hi: 31, lo: 24, icon: 'cloudSun' },
  'null 走 current',
)

// targetDate 命中 daily → 用該日
assert.deepEqual(
  shapeWeather(json, '2026-07-26'),
  { tmp: 30, cond: '雨', hi: 30, lo: 24, icon: 'rain' },
  '命中日期用 daily（tmp 取當日 max）',
)

// targetDate 超出範圍 → null
assert.equal(shapeWeather(json, '2026-09-01'), null, '超出預報範圍回 null')

console.log('weather: all pass')
```

註：`targetDate` 命中某日時，`tmp` 取當日 `temperature_2m_max`（預報沒有單一「當日氣溫」概念，用最高溫當代表值），數值四捨五入為整數。

- [ ] **Step 2: 跑測試確認失敗**

Run（PowerShell）：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/weather.test.mjs"
```
Expected: FAIL — `ERR_MODULE_NOT_FOUND`，`src/lib/weather.js` 還不存在。

- [ ] **Step 3: 寫實作**

建立 `src/lib/weather.js`：

```js
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
```

- [ ] **Step 4: 跑測試確認通過**

Run：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/weather.test.mjs"
```
Expected: PASS — 輸出 `weather: all pass`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather.js
git commit -m "weather.js：WMO code 對照與資料整形（純函式）"
```

---

### Task 2: `getWeather` — 網路請求與快取

在 Task 1 的純函式之上加網路層與 localStorage 快取。此任務動網路，用 `npm run build` 驗證編譯，實際請求留到 Task 4 手動驗收。

**Files:**
- Modify: `src/lib/weather.js`

**Interfaces:**
- Consumes: 本檔的 `shapeWeather`（Task 1）
- Produces:
  - `export async function getWeather(tripId: string, lat: number, lng: number, targetDate: string | null): Promise<{ tmp, cond, hi, lo, icon, at } | null>`
  - `export function removeWeather(tripId: string): void`

- [ ] **Step 1: 加快取 helper 與 import 常數**

在 `src/lib/weather.js` 檔頭（`const CODE` 之前）加：

```js
const WEATHER_KEY = 'luyo:weather:v1'
const TTL = 60 * 60 * 1000

const loadAll = () => {
  try { return JSON.parse(localStorage.getItem(WEATHER_KEY) || '{}') } catch { return {} }
}
const saveOne = (tripId, value) => {
  try {
    const all = loadAll()
    all[tripId] = value
    localStorage.setItem(WEATHER_KEY, JSON.stringify(all))
  } catch {}
}

export function removeWeather(tripId) {
  try {
    const all = loadAll()
    delete all[tripId]
    localStorage.setItem(WEATHER_KEY, JSON.stringify(all))
  } catch {}
}
```

- [ ] **Step 2: 實作 `getWeather`**

在 `src/lib/weather.js` 檔尾加：

```js
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'

export async function getWeather(tripId, lat, lng, targetDate) {
  const cached = loadAll()[tripId]
  // 座標或目標日期變了就重抓，不只看時間
  if (cached && Date.now() - cached.at < TTL && cached.lat === lat && cached.lng === lng && cached.targetDate === (targetDate || null)) {
    return cached.data
  }
  const url = `${ENDPOINT}?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16`
  const res = await fetch(url)
  if (!res.ok) throw new Error('天氣服務暫時無法使用')
  const json = await res.json()
  const data = shapeWeather(json, targetDate)
  saveOne(tripId, { at: Date.now(), lat, lng, targetDate: targetDate || null, data })
  return data
}
```

註：`data` 可能是 `null`（目標日超出範圍），此時仍寫入快取避免一小時內重打；`getWeather` 回 `null`，呼叫端據此顯示「出發前兩週才有預報」。

- [ ] **Step 3: 驗證 build 通過**

Run：
```
npm run build
```
Expected: 成功，`✓ built in ...`。

- [ ] **Step 4: Commit**

```bash
git add src/lib/weather.js
git commit -m "weather.js：Open-Meteo 請求與 1 小時 localStorage 快取"
```

---

### Task 3: `Icon.jsx` 新增 rain / snow 圖示

**Files:**
- Modify: `src/components/Icon.jsx`（`P` 物件，約 25 行 `cloud:` 之後）

**Interfaces:**
- Consumes: 無
- Produces: `Icon` 的 `name` 支援 `rain`、`snow`

- [ ] **Step 1: 加兩條 path**

在 `src/components/Icon.jsx` 的 `P` 物件裡，`cloud: '...'` 那一行之後插入：

```js
  rain: 'M7 15h10a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.7-1.2A3.5 3.5 0 0 0 7 15z M8 18l-1 2 M12 18l-1 2 M16 18l-1 2',
  snow: 'M7 14h10a3.5 3.5 0 0 0 0-7 4.5 4.5 0 0 0-8.7-1.2A3.5 3.5 0 0 0 7 14z M9 18h.01 M12 19h.01 M15 18h.01',
```

雲朵外框沿用 `cloud` 的畫法，下方 `rain` 是三道斜雨線、`snow` 是三個雪點，`stroke-width`/`viewBox` 由 `Icon` 元件統一套用，不需另設。

- [ ] **Step 2: 驗證 build 通過**

Run：
```
npm run build
```
Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add src/components/Icon.jsx
git commit -m "Icon：新增 rain、snow 天氣圖示"
```

---

### Task 4: `TripOverviewScreen` 接上真實天氣 + 清假資料 + 收尾

**Files:**
- Modify: `src/screens/TripOverviewScreen.jsx`（import 區、元件內、天氣卡片約 97-108 行）
- Modify: `src/data/seed.js`（三筆 `weather:` 欄位）
- Modify: `src/components/AddTripSheet.jsx`（約 95 行 `weather:` 預設值）
- Modify: `src/screens/StubScreen.jsx`（版號）
- Modify: `CHANGELOG.zh.md`

**Interfaces:**
- Consumes: `getWeather` from `src/lib/weather.js`（Task 2）、`Icon` 的 `rain`/`snow`（Task 3）、既有 `geocode` from `src/lib/geocode.js`、`editTrip`/`getPlaces` from store
- Produces: 無

- [ ] **Step 1: 先看現況天氣卡片**

先讀 `src/screens/TripOverviewScreen.jsx` 第 97-108 行，確認要替換的 JSX。現況是：

```jsx
      <div className="pad section" style={{ marginTop: 18 }}>
        <div className="weather-card">
          <Icon name={trip.weather.icon === 'sun' ? 'sun' : trip.weather.icon === 'cloud' ? 'cloud' : 'cloudSun'} size={34} style={{ color: 'var(--amber)' }} />
          <div>
            <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
              <span className="tmp">{trip.weather.tmp}°</span>
              <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{trip.weather.cond}</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>最高 {trip.weather.hi}° · 最低 {trip.weather.lo}° · {trip.city}</div>
          </div>
        </div>
      </div>
```

- [ ] **Step 2: 加 import 與 hooks**

在 `src/screens/TripOverviewScreen.jsx` 頂部，把第 1 行：

```jsx
import { useState } from 'react'
```
改成：
```jsx
import { useState, useEffect } from 'react'
```

在既有 import 區加：
```jsx
import { getWeather } from '../lib/weather'
import { geocode } from '../lib/geocode'
```

在元件內，把第 32 行的 `useStore` 解構補上 `getPlaces`：
```jsx
  const { getTrip, openTripSheet, deleteTrip, editTrip, askConfirm, getPlaces } = useStore()
```

- [ ] **Step 3: 加天氣 state 與載入 effect**

在 `const trip = getTrip(id)` 與 `if (!trip) return null` 之間，插入：

```jsx
  const [weather, setWeather] = useState(null)
  const [wxState, setWxState] = useState('loading') // loading | ok | far | error | nogeo

  useEffect(() => {
    if (!trip || trip.status === 'completed') return
    let alive = true
    setWxState('loading')
    ;(async () => {
      let lat = trip.lat, lng = trip.lng
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const p = getPlaces(trip.id).find((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng))
        if (p) { lat = p.lat; lng = p.lng }
        else {
          try {
            const hit = await geocode(`${trip.city} ${trip.country}`.trim())
            if (hit) { lat = hit.lat; lng = hit.lng }
          } catch { /* 下面統一處理 */ }
        }
        if (Number.isFinite(lat) && Number.isFinite(lng)) editTrip(trip.id, { lat, lng })
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) { if (alive) setWxState('nogeo'); return }
      try {
        const target = trip.status === 'ongoing' ? null : trip.start
        const data = await getWeather(trip.id, lat, lng, target)
        if (!alive) return
        if (data) { setWeather(data); setWxState('ok') }
        else setWxState('far')
      } catch {
        if (alive) setWxState('error')
      }
    })()
    return () => { alive = false }
  }, [trip?.id, trip?.status, trip?.start, trip?.lat, trip?.lng])
```

註：`completed` 直接 return，卡片在 Step 4 用 `trip.status !== 'completed'` 包起來所以根本不渲染。`editTrip` 會讓 `trip.lat` 變動觸發 effect 重跑，但第二輪 `trip.lat` 已存在會跳過定位、`getWeather` 一小時內走快取，不會無限迴圈。

- [ ] **Step 4: 換掉天氣卡片 JSX**

把 Step 1 的整段（第 97-108 行 `<div className="pad section" ...>` 到對應 `</div>`）替換成：

```jsx
      {trip.status !== 'completed' && (
        <div className="pad section" style={{ marginTop: 18 }}>
          <div className="weather-card">
            <Icon name={wxState === 'ok' ? weather.icon : 'cloudSun'} size={34} style={{ color: 'var(--amber)' }} />
            <div>
              {wxState === 'ok' ? (
                <>
                  <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                    <span className="tmp">{weather.tmp}°</span>
                    <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{weather.cond}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>最高 {weather.hi}° · 最低 {weather.lo}° · {trip.city}</div>
                </>
              ) : (
                <>
                  <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                    <span className="tmp">—</span>
                    <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                      {wxState === 'loading' ? '取得天氣中…'
                        : wxState === 'far' ? '出發前兩週才有預報'
                        : wxState === 'nogeo' ? '無法定位這個城市'
                        : '天氣暫時取不到'}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{trip.city}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 5: 清 seed.js 的假 weather**

在 `src/data/seed.js` 刪掉三筆旅程的 `weather: { ... },` 整行（分別在京都、另兩筆旅程物件內）。用 grep 確認清乾淨：
```
grep -n "weather" src/data/seed.js
```
Expected: 無輸出。

- [ ] **Step 6: 清 AddTripSheet 的假 weather**

在 `src/components/AddTripSheet.jsx` 刪掉第 95 行 `weather: { tmp: 24, cond: '—', hi: 26, lo: 18, icon: 'cloudSun' },` 整行。grep 確認：
```
grep -rn "trip.weather\|weather:" src/
```
Expected: 無輸出（`src/lib/weather.js` 的函式名與變數不含 `trip.weather` 或 `weather:` 這種寫法，若有命中請確認是註解或字串再排除）。

- [ ] **Step 7: build 驗證**

Run：
```
npm run build
```
Expected: 成功。

- [ ] **Step 8: 手動驗收**

Run：
```
npm run dev
```
開 `http://localhost:5173`，逐條核對（對應 spec 驗收條件）：

1. 進京都（進行中）旅程總覽 → 天氣卡顯示真實即時溫度與天氣敘述，不再是 27°／多雲時晴
2. 規劃中的旅程 → 顯示出發日預報；若出發日超過 16 天 → 「出發前兩週才有預報」
3. 已完成的旅程 → 沒有天氣卡
4. 重新整理頁面，一小時內 DevTools Network 不再出現 `api.open-meteo.com` 請求（第一次會有）
5. 若當地天氣是雨或雪，圖示是新的 rain/snow 而非雲朵（京都夏天多為晴/雲，這條可能無法當場觸發，觀察圖示有正確對應即可）
6. DevTools 把網路關掉重整 → 卡片顯示「天氣暫時取不到」，不整頁崩潰
7. 新增一筆旅程、在地點庫收藏一個已定位地點，回總覽能取到該座標的天氣

有任何一條不過就回對應 Task 修正。按 Ctrl+C 關 dev server。

- [ ] **Step 9: 版號 + CHANGELOG**

在 `src/screens/StubScreen.jsx` 把 `原型 v1.29` 改成 `原型 v1.30`。

取台北時間：
```bash
date "+%Y-%m-%d %H:%M"
```

在 `CHANGELOG.zh.md` 檔尾追加（時間換成實際輸出）：

```markdown
## 2026-07-25 HH:MM
- 版號：v1.30
- 範圍：src/lib/weather.js、src/components/Icon.jsx、src/screens/TripOverviewScreen.jsx、src/data/seed.js、src/components/AddTripSheet.jsx
- 做了什麼：旅程總覽天氣卡改接 Open-Meteo 即時資料，進行中旅程顯示今天、規劃中顯示出發日、已完成不顯示；座標依序取地點庫→trip→Nominatim 並存回 trip；1 小時 localStorage 快取；Icon 新增 rain/snow；移除 seed 與新增旅程的寫死 weather 假資料
- 為什麼：原本天氣卡是寫死的靜態佔位，跟城市日期無關
```

- [ ] **Step 10: 最終 build 並 push**

```bash
npm run build
git add -A
git commit -m "v1.30：旅程天氣接 Open-Meteo，移除寫死的假天氣"
git push
```

push 觸發 Vercel 自動部署（專案 CLAUDE.md 已授權免另外問）。
