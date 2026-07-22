# 底部導航改「行程」＋ Google Maps 連結自動同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把底部導航的「地圖」tab 換成「行程」，並讓行程項目的 Google Maps 連結自動同步成地點庫項目與地圖標記。

**Architecture:** 三層。(1) 新增純函式 `src/lib/gmaps.js` 從 Google Maps 網址抽座標。(2) `src/store.jsx` 新增 `syncLinkedPlace`，比照現有 `syncLinkedExpense` 的託管模式，在 `addItin`/`editItin`/`removeItin`/`copyItinDay` 時建立、更新或刪除 id 為 `lnk-<itinId>` 的地點。(3) UI 層改導航與地點庫卡片；`MapScreen` 不動，因為它直接讀地點庫。

**Tech Stack:** React 18 + Vite 5 + react-router-dom 6，狀態在 `src/store.jsx`（Context + localStorage），地圖用 leaflet，地理編碼用 OpenStreetMap Nominatim（`src/lib/geocode.js`）。

## Global Constraints

- 專案無測試框架。純函式用 `node` 直接跑斷言腳本驗證；UI 變更用 `npm run build` + 手動驗收。不新增測試相依套件。
- 程式碼風格：不寫 comment，除非 WHY 不明顯（跟現有 `src/store.jsx`、`src/lib/geocode.js` 一致：只在非顯而易見的決策上留一行中文註解）。
- 不加多餘抽象層或錯誤處理。
- UI 文案一律繁體中文。
- 暫存檔一律寫在 `C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad`，不寫進專案。
- 全部任務完成後（Task 5）才更新 `src/screens/StubScreen.jsx` 版號 v1.28 → v1.29、寫 `CHANGELOG.zh.md`、push。中途任務只 commit 不 push。
- 設計依據：`docs/superpowers/specs/2026-07-22-itinerary-tab-and-maps-sync-design.md`

---

### Task 1: `parseGmaps` — 從 Google Maps 網址抽座標

**Files:**
- Create: `src/lib/gmaps.js`
- Test: `<scratchpad>/gmaps.test.mjs`（暫存，不進 git）

**Interfaces:**
- Consumes: 無
- Produces: `export function parseGmaps(url: string): { lat: number, lng: number } | null`

- [ ] **Step 1: 寫失敗的測試**

建立 `<scratchpad>/gmaps.test.mjs`（`<scratchpad>` 換成 Global Constraints 裡的絕對路徑）：

```js
import assert from 'node:assert/strict'
import { parseGmaps } from 'C:/Users/aiden/Desktop/claude/projects/luyo/src/lib/gmaps.js'

const near = (got, lat, lng, msg) => {
  assert.ok(got, `${msg}: 預期有座標，得到 null`)
  assert.ok(Math.abs(got.lat - lat) < 1e-6 && Math.abs(got.lng - lng) < 1e-6, `${msg}: 得到 ${JSON.stringify(got)}`)
}

near(parseGmaps('https://www.google.com/maps/@35.0116,135.7681,15z'), 35.0116, 135.7681, '@lat,lng,zoom')
near(parseGmaps('https://www.google.com/maps/place/%E6%B8%85%E6%B0%B4%E5%AF%BA/@34.9948,135.7850,17z/data=!3m1!4b1!4m6!3m5!3d34.9948527!4d135.7849418'), 34.9948527, 135.7849418, '!3d!4d 優先於 @')
near(parseGmaps('https://maps.google.com/?q=35.0116,135.7681'), 35.0116, 135.7681, '?q=')
near(parseGmaps('https://maps.google.com/?ll=35.0116,135.7681&z=15'), 35.0116, 135.7681, '?ll=')
near(parseGmaps('https://www.google.com/maps/search/?api=1&query=-33.8688,151.2093'), -33.8688, 151.2093, '?query= 負數')

assert.equal(parseGmaps('https://maps.app.goo.gl/abc123XYZ'), null, '短網址應回 null')
assert.equal(parseGmaps('https://goo.gl/maps/abc123'), null, '舊短網址應回 null')
assert.equal(parseGmaps('https://www.google.com/maps/place/Kyoto'), null, '無座標應回 null')
assert.equal(parseGmaps(''), null, '空字串應回 null')
assert.equal(parseGmaps(null), null, 'null 應回 null')
assert.equal(parseGmaps('https://www.google.com/maps/@999,135.7681,15z'), null, '緯度超出範圍應回 null')
assert.equal(parseGmaps('https://www.google.com/maps/@35.0116,999,15z'), null, '經度超出範圍應回 null')

console.log('gmaps: all pass')
```

- [ ] **Step 2: 跑測試確認失敗**

Run（PowerShell）：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/gmaps.test.mjs"
```
Expected: FAIL — `ERR_MODULE_NOT_FOUND`，因為 `src/lib/gmaps.js` 還不存在。

- [ ] **Step 3: 寫實作**

建立 `src/lib/gmaps.js`：

```js
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
```

- [ ] **Step 4: 跑測試確認通過**

Run：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/gmaps.test.mjs"
```
Expected: PASS — 輸出 `gmaps: all pass`。

若「緯度超出範圍」那條失敗（回傳了物件而非 null），代表某個分支回了越界值：確認每個分支都經過 `hit()` 而非直接 return。

- [ ] **Step 5: Commit**

```bash
git add src/lib/gmaps.js
git commit -m "新增 gmaps.js：解析 Google Maps 網址座標"
```

---

### Task 2: store 的 `syncLinkedPlace` 連動邏輯

**Files:**
- Modify: `src/store.jsx`（`addPlace` 約 262 行、`getItinerary` 區塊 225-258 行、context value 約 382-383 行）
- Modify: `src/data/seed.js`（在 `PLACE_TO_ITIN` 約 250 行後加反向對映）

**Interfaces:**
- Consumes: `parseGmaps` from `src/lib/gmaps.js`（Task 1）、既有的 `geocode` from `src/lib/geocode.js`
- Produces:
  - `ITIN_TO_PLACE: Record<string, string>` from `src/data/seed.js`
  - `addPlace(tripId, place)` 行為擴充：`place.id` 存在時沿用該 id，否則 `uid('pl')`
  - `syncLinkedPlace(tripId, itinId, it): Promise<void>` — 不對外匯出到 context，只在 store 內部用

- [ ] **Step 1: 加反向類型對映**

在 `src/data/seed.js` 的 `PLACE_TO_ITIN` 那一行下方加：

```js
// 行程分類 → 地點類型（交通、住宿在地點庫沒有對應類型，一律歸「景點」）
export const ITIN_TO_PLACE = { sight: 'sight', food: 'food', shopping: 'mall', transport: 'sight', hotel: 'sight' }
```

- [ ] **Step 2: `addPlace` 支援指定 id**

在 `src/store.jsx` 把：

```js
  const addPlace = (tripId, place) =>
    setPlaceByTrip((prev) => ({ ...prev, [tripId]: [{ id: uid('pl'), ...place }, ...(prev[tripId] || [])] }))
```

改成：

```js
  const addPlace = (tripId, place) =>
    setPlaceByTrip((prev) => ({ ...prev, [tripId]: [{ id: place.id || uid('pl'), ...place }, ...(prev[tripId] || [])] }))
```

- [ ] **Step 3: 加 import**

在 `src/store.jsx` 檔頭的 import 區加：

```js
import { parseGmaps } from './lib/gmaps'
import { geocode } from './lib/geocode'
```

並把既有那行 `import { ... } from './data/seed'` 的具名匯入清單補上 `ITIN_TO_PLACE`。

- [ ] **Step 4: 實作 `syncLinkedPlace`**

在 `src/store.jsx` 的 `copyItinDay` 定義之後、`// ---- 地點庫 ----` 註解之前，插入：

```js
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
```

注意：這裡不重用 `addPlace`/`editPlace`，因為它們定義在下方（`const` 有 TDZ 限制），而且這段要在單一 `setPlaceByTrip` 內同時處理新增與更新。

- [ ] **Step 5: 接上四個觸發點**

在 `src/store.jsx` 的四個函式裡，於既有 `syncLinkedExpense(...)` 呼叫的下一行各加一行：

`addItin` 內（既有 `syncLinkedExpense(tripId, \`lnk-${iid}\`, itinExpense(tripId, day, item))` 之後）：
```js
    syncLinkedPlace(tripId, iid, item)
```

`editItin` 內（既有 `syncLinkedExpense(tripId, \`lnk-${itemId}\`, itinExpense(tripId, day, patch))` 之後）：
```js
    syncLinkedPlace(tripId, itemId, patch)
```

`removeItin` 內（既有 `syncLinkedExpense(tripId, \`lnk-${itemId}\`, null)` 之後）：
```js
    syncLinkedPlace(tripId, itemId, null)
```

`copyItinDay` 內，把既有的：
```js
    cloned.forEach((it) => syncLinkedExpense(tripId, `lnk-${it.id}`, itinExpense(tripId, toDay, it)))
```
改成：
```js
    cloned.forEach((it) => {
      syncLinkedExpense(tripId, `lnk-${it.id}`, itinExpense(tripId, toDay, it))
      syncLinkedPlace(tripId, it.id, it)
    })
```

因為 `syncLinkedPlace` 是 async 且呼叫端不需要等，全部以 fire-and-forget 呼叫，座標到位後靠 state 更新重繪。

但 `syncLinkedPlace` 定義在 `addItin`/`editItin`/`removeItin` 之後（它們在 225-258 行，`syncLinkedPlace` 插在 258 行後），這是安全的：那些函式只在事件觸發時執行，此時 `syncLinkedPlace` 早已初始化完畢。`copyItinDay` 同理。

- [ ] **Step 6: 驗證 build 通過**

Run：
```
npm run build
```
Expected: 成功，輸出 `✓ built in ...`，無 rollup 解析錯誤。若出現 `"ITIN_TO_PLACE" is not exported`，回頭確認 Step 1 與 Step 3。

- [ ] **Step 7: Commit**

```bash
git add src/store.jsx src/data/seed.js
git commit -m "store：行程的 Google Maps 連結自動連動地點庫"
```

---

### Task 3: 底部導航「地圖」改「行程」

**Files:**
- Modify: `src/components/BottomNav.jsx`（全檔）
- Modify: `src/App.jsx`（Route 區塊約 33-52 行）
- Modify: `src/screens/ItineraryScreen.jsx`（132-282 行的 `ItineraryScreen` 元件）

**Interfaces:**
- Consumes: 既有 `useStore().trips`、`getTrip`
- Produces: 新路由 `/itinerary`

- [ ] **Step 1: 改 `BottomNav.jsx`**

整份改成：

```jsx
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'

const TABS = [
  { key: 'home', label: '首頁', icon: 'home', path: '/' },
  { key: 'trips', label: '旅程', icon: 'map', path: '/trips' },
  { key: 'itin', label: '行程', icon: 'route', path: '/itinerary' },
  { key: 'expenses', label: '記帳', icon: 'wallet', path: '/expenses' },
  { key: 'profile', label: '我的', icon: 'user', path: '/profile' },
]

const SUB = /^\/trip\/[^/]+\/(itinerary|expenses|map)/

export default function BottomNav() {
  const nav = useNavigate()
  const { pathname } = useLocation()

  const isActive = (t) => {
    if (t.path === '/') return pathname === '/'
    if (t.key === 'itin') return pathname === '/itinerary' || /^\/trip\/[^/]+\/itinerary/.test(pathname)
    if (t.key === 'expenses') return pathname === '/expenses' || /^\/trip\/[^/]+\/expenses/.test(pathname)
    if (t.key === 'trips') return (pathname.startsWith('/trips') || pathname.startsWith('/trip/')) && !SUB.test(pathname)
    return pathname.startsWith(t.path)
  }

  const tripId = pathname.match(/^\/trip\/([^/]+)/)?.[1]
  const targetOf = (t) => {
    if (tripId && t.key === 'itin') return `/trip/${tripId}/itinerary`
    if (tripId && t.key === 'expenses') return `/trip/${tripId}/expenses`
    return t.path
  }

  return (
    <nav className="bottomnav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`navitem ${isActive(t) ? 'active' : ''}`}
          onClick={() => nav(targetOf(t))}
        >
          <Icon className="glyph" name={t.icon} size={34} fill={isActive(t) && t.icon === 'home'} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

`SUB` 保留 `map`，這樣停在 `/trip/:id/map` 時「旅程」tab 不會誤亮。

- [ ] **Step 2: 加全域 `/itinerary` 路由**

在 `src/App.jsx` 的 `<Route path="/map" element={<MapScreen />} />` 那一行下方加：

```jsx
          <Route path="/itinerary" element={<ItineraryScreen />} />
```

`ItineraryScreen` 已經 import 過，不需要動 import。

- [ ] **Step 3: `ItineraryScreen` 支援無 tripId 的 fallback**

在 `src/screens/ItineraryScreen.jsx` 的 `ItineraryScreen` 元件裡，把：

```jsx
  const { getTrip, getItinerary, openItin, copyItinDay } = useStore()
  const trip = getTrip(id)
```

改成：

```jsx
  const { trips, getTrip, getItinerary, openItin, copyItinDay } = useStore()
  const trip = (id && getTrip(id)) || trips.find((t) => t.status === 'ongoing') || trips[0]
```

接著把該元件內其餘用到 `id` 的地方全部換成 `trip.id`（`if (!trip) return null` 之後才會執行到，所以 `trip` 必定存在）：

- `const data = getItinerary(id)` → `getItinerary(trip.id)`
- `nav(\`/trip/${id}\`)` → `nav(\`/trip/${trip.id}\`)`
- `openItin(id, day)`（共 2 處：header 的 ＋ 鈕、底部「加行程」鈕）→ `openItin(trip.id, day)`
- `openItin(id, day, it.id)` → `openItin(trip.id, day, it.id)`
- `copyItinDay(id, day, day + 1)` → `copyItinDay(trip.id, day, day + 1)`

`useEffect` 的相依陣列 `[id]` 保持不變，`useState` 初值也不動。

`AIPlanCard` 元件收的是 `trip` 物件，不受影響。

驗證沒有漏掉：
```
grep -n "(id\b\|\${id}" src/screens/ItineraryScreen.jsx
```
Expected: 只剩 `const { id } = useParams()` 那一行有 `id`，沒有其他 `(id,` 或 `${id}`。

- [ ] **Step 4: 驗證 build 通過**

Run：
```
npm run build
```
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.jsx src/App.jsx src/screens/ItineraryScreen.jsx
git commit -m "底部導航：地圖 tab 改為行程，新增全域 /itinerary 路由"
```

---

### Task 4: 地點庫標示連動地點

**Files:**
- Modify: `src/screens/PlacesScreen.jsx`（卡片區塊 59-94 行）

**Interfaces:**
- Consumes: Task 2 產生的 `lnk-` 前綴地點
- Produces: 無

- [ ] **Step 1: 卡片加「來自行程」標記並改變點擊行為**

在 `src/screens/PlacesScreen.jsx` 的 `list.map((p) => {` 區塊內，於 `const g = PLACE_TAG[p.tag]` 下一行加：

```jsx
            const linked = p.id.startsWith('lnk-')
```

把 `<article>` 開頭那行的 `onClick` 改成連動地點導向行程頁：

```jsx
              <article key={p.id} className="card" style={{ padding: 14 }} onClick={() => (linked ? nav(`/trip/${id}/itinerary`) : openPlace(id, p.id))}>
```

在類型標籤那行（`<span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</span>`）之後加：

```jsx
                      {linked && <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>來自行程</span>}
```

最後把「加入行程」按鈕包起來，連動地點不顯示（它本來就來自行程，再加一次是重複）：

```jsx
                  {!linked && (
                    <button className="row" style={{ gap: 5, color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); addToItin(p) }}>
                      <Icon name="plus" size={15} /> 加入行程
                    </button>
                  )}
```

- [ ] **Step 2: 驗證 build 通過**

Run：
```
npm run build
```
Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add src/screens/PlacesScreen.jsx
git commit -m "地點庫：連動地點標示「來自行程」，點擊導回行程頁"
```

---

### Task 5: 手動驗收、版號、CHANGELOG、部署

**Files:**
- Modify: `src/screens/StubScreen.jsx:164`（版號字串）
- Modify: `CHANGELOG.zh.md`（檔尾追加）

**Interfaces:**
- Consumes: Task 1-4 全部
- Produces: 無

- [ ] **Step 1: 啟動 dev server 手動驗收**

Run：
```
npm run dev
```
在瀏覽器開 `http://localhost:5173`，逐條核對（對應 spec 的驗收條件）：

1. 底部導航第三格顯示「行程」，圖示是路線圖示
2. 在首頁點「行程」→ 進入進行中旅程的行程規劃頁
3. 在某旅程內點「行程」→ 進入該旅程的行程規劃頁，且「行程」tab 亮起、「旅程」tab 不亮
4. 旅程總覽九宮格的「地圖」仍可正常進入地圖頁
5. 新增一筆行程，Google Maps 連結填 `https://www.google.com/maps/place/x/@34.9948,135.7850,17z/data=!3m1!4b1!4m6!3m5!3d34.9948527!4d135.7849418` → 存檔後到該旅程地點庫，出現同名地點且標「來自行程」；到地圖「全部地點」view，有對應 marker
6. 再新增一筆行程，連結填 `https://maps.app.goo.gl/abc123`、標題填一個真實地標名（例如「東京鐵塔」）→ 地點庫出現該地點；等一兩秒後地圖上出現 marker（走 Nominatim fallback）。若該名稱查不到，地圖清單顯示「未定位」也算通過
7. 編輯第 5 條那筆行程，改標題 → 地點庫的名稱同步變更
8. 把該行程的 Google Maps 連結清空存檔 → 地點庫的對應地點消失
9. 刪除該行程 → 地點庫的對應地點消失
10. 手動收藏一個地點，做上述任何操作，該地點都不受影響，且仍可點開編輯

有任何一條不過就回到對應 Task 修正，不要跳過。

按 Ctrl+C 關掉 dev server。

- [ ] **Step 2: 版號 +0.01**

在 `src/screens/StubScreen.jsx` 把 `原型 v1.28` 改成 `原型 v1.29`。

- [ ] **Step 3: 寫 CHANGELOG**

先取台北時間：
```bash
date "+%Y-%m-%d %H:%M"
```

在 `CHANGELOG.zh.md` 檔尾追加（時間換成上一行指令的實際輸出）：

```markdown
## 2026-07-22 HH:MM
- 範圍：src/components/BottomNav.jsx、src/App.jsx、src/screens/ItineraryScreen.jsx、src/screens/PlacesScreen.jsx、src/store.jsx、src/data/seed.js、src/lib/gmaps.js（v1.29）
- 做了什麼：底部導航「地圖」tab 改為「行程」，新增全域 /itinerary 路由，行程頁無 tripId 時 fallback 到進行中的旅程；新增 gmaps.js 解析 Google Maps 網址座標；行程項目填了 Google Maps 連結時自動在地點庫建立託管地點（id 前綴 lnk-）並顯示在地圖上，行程改動、清空連結或刪除時同步更新／移除；短網址無法解析座標時退回用名稱查 Nominatim；地點庫的託管地點標示「來自行程」，點擊導回行程頁且不可手動編輯
- 為什麼：行程規劃是最常用的頁面，值得佔一個 tab（地圖從旅程總覽仍可進入）；行程與地點庫原本各自為政，填了地圖連結卻不會反映到地圖上
```

- [ ] **Step 4: 最終 build 驗證**

Run：
```
npm run build
```
Expected: 成功，`✓ built in ...`。

- [ ] **Step 5: Commit 並 push**

```bash
git add -A
git commit -m "v1.29：底部導航改行程，行程的 Google Maps 連結自動同步到地點與地圖"
git push
```

push 會觸發 Vercel 自動部署（專案 CLAUDE.md 已授權免另外詢問）。
