# 登入系統 + Supabase 雲端同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 luyo 需要 Email+密碼登入，登入後資料存 Supabase（一人一列 JSON blob，照片走 Storage），新帳號進去是空的，不再一開就是範例資料。

**Architecture:** 三層依序疊上去。(1) 認證：`supabase.js` client + `auth.jsx`（session）+ `AuthScreen` + App 門禁。(2) 雲端資料：`cloud.js`（fetch/push blob）+ `migrate.js`（打包/拆解/首登遷移純函式）+ `store.jsx` 改成登入後從雲端載入、debounce 上傳、localStorage 當離線快取。(3) 照片：`image.js` 上傳 Storage、顯示用 signed URL。種子資料退成手動「載入範例資料」按鈕。

**Tech Stack:** React 18 + Vite 5 + react-router-dom 6（HashRouter）、`@supabase/supabase-js`（新增）、Supabase（Auth + Postgres + Storage）。狀態在 `src/store.jsx`（Context）。

## Global Constraints

- 專案無測試框架。純函式用 `node` 斷言腳本驗證；其餘 `npm run build` + 手動驗收。不新增測試相依套件。
- 程式碼風格：不寫 comment，除非 WHY 不明顯（跟現有檔案一致，只在非顯而易見處留一行中文註解）。
- 不加多餘抽象層或錯誤處理。
- UI 文案一律繁體中文。
- 環境變數用 Vite `VITE_` 前綴：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。`.env` 不進 git。
- anon key 可公開放前端；service_role key 絕不進前端。資料隔離靠 RLS。
- 大部分程式任務**無法連線真 Supabase 測試**（使用者的專案 Task 11 才接上）。這些任務的驗證是 `npm run build` 通過與純函式測試；真正端對端驗收在 Task 11 由控制者連同使用者做。
- blob schema：`{ v:1, expenses, trips, prep, itinerary, places, journal, flights, stays, photos, companions, profile, prefs, quickorder }`。AI key（`luyo:ai:v1`）與主題（`luyo:theme`）**不進 blob**，續留本機。
- Task 1-10 只 commit 不 push。Task 11 才更新版號 v1.30 → v1.31、寫 CHANGELOG、push。
- 設計依據：`docs/superpowers/specs/2026-07-25-auth-and-cloud-sync-design.md`

---

### Task 1: 相依、環境變數骨架、Supabase client

**Files:**
- Modify: `package.json`（新增相依）
- Modify: `.gitignore`（加 `.env`）
- Create: `.env.example`（範本，可進 git）
- Create: `src/lib/supabase.js`

**Interfaces:**
- Consumes: 環境變數 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
- Produces: `export const supabase`（Supabase client 單例）

- [ ] **Step 1: 安裝相依**

Run（PowerShell，於 repo 根目錄）：
```
npm install @supabase/supabase-js
```
Expected: `package.json` 的 dependencies 出現 `@supabase/supabase-js`，`package-lock.json` 更新，無錯誤。

- [ ] **Step 2: `.gitignore` 加 `.env`**

確認 `.gitignore` 有一行 `.env`（若無則加）。Run：
```
grep -n "^.env$" .gitignore || printf '\n.env\n' >> .gitignore
```

- [ ] **Step 3: 建 `.env.example`**

建立 `.env.example`（給使用者參考格式，不含真值，可進 git）：
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

- [ ] **Step 4: 建 `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('缺少 Supabase 環境變數：請在 .env 設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
```

- [ ] **Step 5: 建 build 用的臨時 .env 並驗證**

因為 `supabase.js` 在缺變數時會 throw，build（會 import 到）需要變數存在。建立本機 `.env`（暫填假值，Task 11 換真值）：
```
printf 'VITE_SUPABASE_URL=https://placeholder.supabase.co\nVITE_SUPABASE_ANON_KEY=placeholder-anon-key\n' > .env
```
Run：
```
npm run build
```
Expected: 成功。`.env` 不會被 commit（已 ignore）。

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example src/lib/supabase.js
git commit -m "接入 Supabase client 與環境變數骨架"
```
（確認 `git status` 沒有 `.env`；若出現代表 ignore 沒生效，先修好再 commit。）

---

### Task 2: blob 打包／拆解 + 首登遷移（純函式）

只做不碰網路、不碰 React 的純函式，能用 node 斷言測。

**Files:**
- Create: `src/lib/migrate.js`
- Test: `<scratchpad>/migrate.test.mjs`（暫存，不進 git；`<scratchpad>` = `C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad`）

**Interfaces:**
- Consumes: 無
- Produces:
  - `export function packState(slices): object` — 把 store 的各 slice + settings 打包成 blob（`slices` 含 13 個具名欄位）
  - `export function unpackState(data): object` — blob → `{ expenses, trips, prep, ... , profile, prefs, quickorder }`，缺欄位給安全預設
  - `export function collectLocalCustom(readKey): object | null` — 讀舊 localStorage（透過注入的 `readKey(key)` 取值，方便測試），只取自建旅程與其子資料，組成 blob；無自建旅程回 `null`

- [ ] **Step 1: 寫失敗的測試**

建立 `<scratchpad>/migrate.test.mjs`：

```js
import assert from 'node:assert/strict'
import { packState, unpackState, collectLocalCustom } from 'C:/Users/aiden/Desktop/claude/projects/luyo/src/lib/migrate.js'

const slices = {
  expenses: { t1: [{ id: 'e1' }] }, trips: { custom: [{ id: 't1' }], overrides: {}, deleted: [] },
  prep: {}, itinerary: {}, places: {}, journal: {}, flights: {}, stays: {}, photos: {}, companions: {},
  profile: { name: 'A', avatar: '' }, prefs: { currency: 'TWD', notifications: true }, quickorder: null,
}
const blob = packState(slices)
assert.equal(blob.v, 1, 'blob 有版本')
assert.deepEqual(blob.trips, slices.trips, 'trips 進 blob')
assert.deepEqual(blob.profile, slices.profile, 'profile 進 blob')

const round = unpackState(blob)
assert.deepEqual(round.expenses, slices.expenses, 'expenses 還原')
assert.deepEqual(round.profile, slices.profile, 'profile 還原')

// 空 blob → 安全預設
const empty = unpackState({})
assert.deepEqual(empty.trips, { custom: [], overrides: {}, deleted: [] }, 'trips 預設空')
assert.deepEqual(empty.expenses, {}, 'expenses 預設空物件')
assert.equal(empty.quickorder, null, 'quickorder 預設 null')

// collectLocalCustom：只挑自建旅程 t1，不帶種子旅程 kyoto
const store = {
  'luyo:trips:v2': JSON.stringify({ custom: [{ id: 't1', name: '我的' }], overrides: { kyoto: { name: '改過' } }, deleted: [] }),
  'luyo:expenses:v1': JSON.stringify({ t1: [{ id: 'e1' }], kyoto: [{ id: 'e9' }] }),
  'luyo:places:v1': JSON.stringify({ t1: [{ id: 'p1' }], kyoto: [{ id: 'p9' }] }),
  'luyo:profile:v1': JSON.stringify({ name: 'A', avatar: '' }),
}
const collected = collectLocalCustom((k) => store[k] ?? null)
assert.deepEqual(collected.trips.custom, [{ id: 't1', name: '我的' }], '只帶自建旅程')
assert.equal(collected.trips.overrides.kyoto, undefined, '不帶種子 override')
assert.deepEqual(collected.expenses, { t1: [{ id: 'e1' }] }, '只帶自建旅程的記帳')
assert.deepEqual(collected.places, { t1: [{ id: 'p1' }] }, '只帶自建旅程的地點')
assert.deepEqual(collected.profile, { name: 'A', avatar: '' }, '帶 profile')

// 沒有自建旅程 → null
const empty2 = collectLocalCustom((k) => (k === 'luyo:trips:v2' ? JSON.stringify({ custom: [], overrides: {}, deleted: [] }) : null))
assert.equal(empty2, null, '無自建旅程回 null')

console.log('migrate: all pass')
```

- [ ] **Step 2: 跑測試確認失敗**

Run：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/migrate.test.mjs"
```
Expected: FAIL — `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 寫實作**

建立 `src/lib/migrate.js`：

```js
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
```

- [ ] **Step 4: 跑測試確認通過**

Run：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/migrate.test.mjs"
```
Expected: PASS — `migrate: all pass`。

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrate.js
git commit -m "migrate.js：blob 打包/拆解與首登資料收集（純函式）"
```

---

### Task 3: 雲端資料層 `cloud.js`

**Files:**
- Create: `src/lib/cloud.js`

**Interfaces:**
- Consumes: `supabase`（Task 1）
- Produces:
  - `export async function fetchState(userId): Promise<object | null>` — 回該使用者的 `data`，沒這列回 `null`
  - `export async function pushState(userId, data): Promise<void>` — upsert `{ user_id, data, updated_at }`

- [ ] **Step 1: 寫實作**

建立 `src/lib/cloud.js`：

```js
import { supabase } from './supabase'

export async function fetchState(userId) {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? data.data : null
}

export async function pushState(userId, data) {
  const { error } = await supabase
    .from('app_state')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
```

- [ ] **Step 2: 驗證 build**

Run：
```
npm run build
```
Expected: 成功。（真正查詢在 Task 11 測。）

- [ ] **Step 3: Commit**

```bash
git add src/lib/cloud.js
git commit -m "cloud.js：Supabase app_state 讀寫"
```

---

### Task 4: 認證 Provider `auth.jsx`

**Files:**
- Create: `src/auth.jsx`

**Interfaces:**
- Consumes: `supabase`（Task 1）
- Produces:
  - `export function AuthProvider({ children })`
  - `export function useAuth(): { session, user, loading, signUp, signIn, signOut }`
  - `signUp/signIn` 回 `{ error: string | null }`（error 為中文訊息或 null）

- [ ] **Step 1: 寫實作**

建立 `src/auth.jsx`：

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const AuthCtx = createContext(null)

const zh = (msg) => {
  const m = String(msg || '')
  if (/at least 6|Password should be/i.test(m)) return '密碼至少 6 個字'
  if (/already registered|already exists/i.test(m)) return '這個 email 已經註冊過了'
  if (/Invalid login credentials/i.test(m)) return '帳號或密碼錯誤'
  if (/Unable to validate email|invalid.*email/i.test(m)) return 'email 格式不正確'
  if (/network|fetch/i.test(m)) return '網路連線有問題，請稍後再試'
  return m || '發生錯誤，請再試一次'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? zh(error.message) : null }
  }
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? zh(error.message) : null }
  }
  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthCtx.Provider value={{ session, user: session?.user || null, loading, signUp, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內')
  return ctx
}
```

- [ ] **Step 2: 驗證 build**

Run：`npm run build`
Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add src/auth.jsx
git commit -m "auth.jsx：Supabase session 管理與中文錯誤"
```

---

### Task 5: 登入／註冊畫面 `AuthScreen.jsx`

**Files:**
- Create: `src/screens/AuthScreen.jsx`

**Interfaces:**
- Consumes: `useAuth`（Task 4）、`Icon`
- Produces: `export default function AuthScreen`

- [ ] **Step 1: 寫實作**

建立 `src/screens/AuthScreen.jsx`（沿用現有設計 class：`sheet`/`field`/`btn btn-primary` 等；暖色卡片、置中）：

```jsx
import { useState } from 'react'
import Icon from '../components/Icon'
import { useAuth } from '../auth'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!email.trim() || !pw) { setErr('請填 email 和密碼'); return }
    if (mode === 'signup' && pw.length < 6) { setErr('密碼至少 6 個字'); return }
    setBusy(true)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email.trim(), pw)
    setBusy(false)
    if (error) setErr(error)
  }

  return (
    <div className="stage">
      <div className="app auth-app" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--primary)' }}>luyo</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>你的旅程，登入後隨你走</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>密碼</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={mode === 'signup' ? '至少 6 個字' : '密碼'} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{err}</div>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
            <Icon name={mode === 'signin' ? 'user' : 'plus'} size={18} /> {busy ? '請稍候…' : mode === 'signin' ? '登入' : '註冊'}
          </button>
        </div>
        <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr('') }}>
          {mode === 'signin' ? '還沒有帳號？註冊一個' : '已經有帳號了？去登入'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 驗證 build**

Run：`npm run build`
Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add src/screens/AuthScreen.jsx
git commit -m "AuthScreen：登入/註冊畫面"
```

---

### Task 6: 接上 Provider 與 App 門禁

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `AuthProvider`/`useAuth`（Task 4）、`AuthScreen`（Task 5）、store 的 `ready` 旗標（Task 7 會加；本任務先允許 `ready` 為 undefined 時當作 true，Task 7 補上真值）
- Produces: 未登入只顯示 AuthScreen

- [ ] **Step 1: main.jsx 包 AuthProvider（在 StoreProvider 外層）**

把 `src/main.jsx` 的 render 區塊改成（`AuthProvider` 需在 `StoreProvider` 外，因為 store 之後要 `useAuth`）：

先加 import：
```jsx
import { AuthProvider } from './auth'
```
把：
```jsx
    <StoreProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </StoreProvider>
```
改成：
```jsx
    <AuthProvider>
      <StoreProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </StoreProvider>
    </AuthProvider>
```

- [ ] **Step 2: App.jsx 加門禁**

在 `src/App.jsx` 頂部加 import：
```jsx
import { useAuth } from './auth'
import { useStore } from './store'
import AuthScreen from './screens/AuthScreen'
```

在 `export default function App() {` 之後、`return (` 之前加：
```jsx
  const { session, loading } = useAuth()
  const { ready } = useStore()

  if (loading) return <div className="stage"><div className="app" /></div>
  if (!session) return <AuthScreen />
  if (ready === false) return <div className="stage"><div className="app" /></div>
```

註：`ready === false` 才擋（Task 7 加上該旗標前，`ready` 為 `undefined`，不會擋，App 正常顯示）。

- [ ] **Step 3: 驗證 build**

Run：`npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx src/App.jsx
git commit -m "接上 AuthProvider 與 App 登入門禁"
```

---

### Task 7: store.jsx 雲端載入 + 就緒旗標 + debounce 上傳 + 離線快取

這是最大的一塊。把 store 從「同步讀 localStorage 種子」改成「登入後從雲端載入、變更 debounce 上傳」。**本任務先不動 `trips` 的種子合併**（Task 8 處理），避免一次改太多。

**Files:**
- Modify: `src/store.jsx`

**Interfaces:**
- Consumes: `useAuth`（Task 4）、`fetchState`/`pushState`（Task 3）、`packState`/`unpackState`/`collectLocalCustom`（Task 2）、`getProfile`/`setProfile`/`getPrefs`/`setPrefs`/`getQuickOrder`/`setQuickOrder`（settings.js）
- Produces: store value 新增 `ready: boolean`、`requestSync: () => void`

- [ ] **Step 1: 改 import 與 state 初值**

在 `src/store.jsx` 檔頭 import 區加：
```js
import { useAuth } from './auth'
import { fetchState, pushState } from './lib/cloud'
import { packState, unpackState, collectLocalCustom } from './lib/migrate'
import { getProfile, setProfile, getPrefs, setPrefs, getQuickOrder, setQuickOrder } from './lib/settings'
```

把 10 個 `useState(() => load(KEY, seedFn))`（第 61-70 行）改為初值全空（登入後才由雲端填入）：
```js
  const [byTrip, setByTrip] = useState({})
  const [tripData, setTripData] = useState(emptyTripData)
  const [prepByTrip, setPrepByTrip] = useState({})
  const [itinByTrip, setItinByTrip] = useState({})
  const [placeByTrip, setPlaceByTrip] = useState({})
  const [journalByTrip, setJournalByTrip] = useState({})
  const [flightByTrip, setFlightByTrip] = useState({})
  const [stayByTrip, setStayByTrip] = useState({})
  const [photoByTrip, setPhotoByTrip] = useState({})
  const [compByTrip, setCompByTrip] = useState({})
  const [ready, setReady] = useState(false)
```

- [ ] **Step 2: 移除舊的 per-key persist effects，換成雲端載入 + debounce 上傳**

刪掉第 85-94 行那 10 個 `useEffect(() => { persist(KEY, x) }, [x])`。改成：

```js
  const { user } = useAuth()
  const userId = user?.id || null
  const cacheKey = userId ? `luyo:cache:${userId}` : null
  const [syncTick, setSyncTick] = useState(0)
  const requestSync = () => setSyncTick((n) => n + 1)
  const loadedRef = useRef(false)

  const applyBlob = (data) => {
    const s = unpackState(data)
    setByTrip(s.expenses); setTripData(s.trips); setPrepByTrip(s.prep); setItinByTrip(s.itinerary)
    setPlaceByTrip(s.places); setJournalByTrip(s.journal); setFlightByTrip(s.flights)
    setStayByTrip(s.stays); setPhotoByTrip(s.photos); setCompByTrip(s.companions)
    if (s.profile) setProfile(s.profile)
    if (s.prefs) setPrefs(s.prefs)
    if (s.quickorder != null) setQuickOrder(s.quickorder)
  }

  // 登入後載入雲端；沒這帳號的列 → 跑首登遷移並上雲
  useEffect(() => {
    if (!userId) { loadedRef.current = false; setReady(false); return }
    let alive = true
    setReady(false)
    ;(async () => {
      let data = null
      try {
        data = await fetchState(userId)
      } catch {
        try { data = JSON.parse(localStorage.getItem(cacheKey) || 'null') } catch { data = null }
      }
      if (!alive) return
      if (data == null) {
        const migrated = collectLocalCustom((k) => localStorage.getItem(k))
        data = migrated || packState({
          expenses: {}, trips: emptyTripData(), prep: {}, itinerary: {}, places: {}, journal: {},
          flights: {}, stays: {}, photos: {}, companions: {},
          profile: getProfile(), prefs: getPrefs(), quickorder: getQuickOrder(),
        })
        try { await pushState(userId, data) } catch {}
      }
      applyBlob(data)
      try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
      loadedRef.current = true
      setReady(true)
    })()
    return () => { alive = false }
  }, [userId])

  // 變更 → debounce 打包整包上雲 + 寫本機快取。載入完成前不觸發，避免把空狀態蓋掉雲端
  useEffect(() => {
    if (!userId || !loadedRef.current) return
    const blob = packState({
      expenses: byTrip, trips: tripData, prep: prepByTrip, itinerary: itinByTrip, places: placeByTrip,
      journal: journalByTrip, flights: flightByTrip, stays: stayByTrip, photos: photoByTrip, companions: compByTrip,
      profile: getProfile(), prefs: getPrefs(), quickorder: getQuickOrder(),
    })
    const t = setTimeout(() => {
      try { localStorage.setItem(cacheKey, JSON.stringify(blob)) } catch {}
      pushState(userId, blob).catch(() => {
        if (!storageWarned) { storageWarned = true; alert('雲端同步暫時失敗，變更已存在本機，稍後會自動重試') }
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [byTrip, tripData, prepByTrip, itinByTrip, placeByTrip, journalByTrip, flightByTrip, stayByTrip, photoByTrip, compByTrip, syncTick, userId])
```

註：`load` 函式與 `seed*State` fallback 若不再被任何地方引用，保留無妨（Task 8 的「載入範例資料」會用到 seed 值）。`useRef` 已在檔案 import。

- [ ] **Step 3: value 加 `ready` 與 `requestSync`**

在 `value` 物件（第 437 行起）補上兩個欄位（放在 `trips, getTrip, ...` 那行附近即可）：
```js
      ready, requestSync,
```

- [ ] **Step 4: 驗證 build**

Run：`npm run build`
Expected: 成功。若報 `load is not defined` 之類，代表某處仍引用被刪的東西——保留 `load`/`persist` 定義即可（只刪 effects，不刪 helper）。

- [ ] **Step 5: Commit**

```bash
git add src/store.jsx
git commit -m "store：登入後從雲端載入、變更 debounce 上雲、離線快取與 ready 旗標"
```

---

### Task 8: 移除種子合併 + 首登遷移接線 + 「載入範例資料」

**Files:**
- Modify: `src/store.jsx`

**Interfaces:**
- Consumes: seed 匯入（`seedTrips`、`seedExpState` 等已在檔案）、Task 7 的 state setters
- Produces: `trips` 只含使用者資料；`loadSample()` 取代 `reset()`

- [ ] **Step 1: `trips` 不再合併 seedTrips**

把第 97-101 行：
```js
  const trips = useMemo(() => {
    return [...tripData.custom, ...seedTrips]
      .filter((t) => !tripData.deleted.includes(t.id))
      .map((t) => (tripData.overrides[t.id] ? { ...t, ...tripData.overrides[t.id] } : t))
  }, [tripData])
```
改成：
```js
  const trips = useMemo(() => {
    return [...tripData.custom]
      .filter((t) => !tripData.deleted.includes(t.id))
      .map((t) => (tripData.overrides[t.id] ? { ...t, ...tripData.overrides[t.id] } : t))
  }, [tripData])
```

- [ ] **Step 2: 把 `reset` 改成 `loadSample`（載入範例資料並上雲）**

把現有 `reset`（第 413-431 行）整段替換成：
```js
  const loadSample = () => {
    setByTrip(seedExpState())
    setTripData({ custom: [...seedTrips], overrides: {}, deleted: [] })
    setPrepByTrip(seedPrepState())
    setItinByTrip(seedItinState())
    setPlaceByTrip(seedPlaceState())
    setJournalByTrip(seedJournalState())
    setFlightByTrip(seedFlightState())
    setStayByTrip(seedStayState())
    setPhotoByTrip(seedPhotoState())
    setCompByTrip(seedCompState())
    requestSync()
  }
```

註：種子旅程原本靠 `seedTrips` 合併顯示，現在改成把它們放進 `custom`，這樣「範例」與使用者自建走同一條路徑，也會被打包上雲。`requestSync` 觸發上傳（其實 10 個 slice 變更本來就會觸發，這行是保險）。

- [ ] **Step 3: value 匯出改名**

把 `value` 裡的 `reset` 改成 `loadSample`：
- 第 439 行 `getSpent, reset,` → `getSpent, loadSample,`

- [ ] **Step 4: 驗證 build**

Run：`npm run build`
Expected: 失敗——`StubScreen.jsx` 仍引用 `reset`。這是預期的，Task 9 會修 StubScreen。**先確認錯誤只跟 `reset` 有關**，再進 Task 9；本任務先把 store 改好。

實際上為了讓本任務能獨立 build 通過，**同時**在本任務順手把 StubScreen 的 `reset` 引用改掉——見 Step 5。

- [ ] **Step 5: 同步改 StubScreen 的 `reset` → `loadSample`（避免 build 破）**

在 `src/screens/StubScreen.jsx`：
- 第 19 行 `const { reset, askConfirm } = useStore()` → `const { loadSample, askConfirm } = useStore()`
- `doReset` 內（第 55-57 行）：
```js
  const doReset = () => {
    askConfirm({ message: '載入範例資料？會覆蓋目前的旅程資料。', confirmText: '載入', onConfirm: loadSample })
  }
```
- 找到畫面上觸發 `doReset` 的按鈕文字「重設為範例資料」，改成「載入範例資料」。

- [ ] **Step 6: 驗證 build**

Run：`npm run build`
Expected: 成功。

- [ ] **Step 7: Commit**

```bash
git add src/store.jsx src/screens/StubScreen.jsx
git commit -m "store：移除種子合併，改為手動載入範例資料；新帳號預設空白"
```

---

### Task 9: 登出按鈕 + 設定變更觸發同步

**Files:**
- Modify: `src/screens/StubScreen.jsx`
- Modify: `src/screens/TripOverviewScreen.jsx`

**Interfaces:**
- Consumes: `useAuth().signOut`（Task 4）、`requestSync`（Task 7）
- Produces: 無

- [ ] **Step 1: StubScreen 加登出、設定變更觸發同步**

在 `src/screens/StubScreen.jsx`：
- 加 import：`import { useAuth } from '../auth'`
- 元件內加：`const { signOut } = useAuth()`，並從 store 解構補 `requestSync`：`const { loadSample, askConfirm, requestSync } = useStore()`
- `saveProfile` 尾端與 `updatePref` 尾端各加一行 `requestSync()`（讓 profile / 幣別 / 通知變更也會上雲）：
```js
  const saveProfile = () => {
    const next = { name: draftName.trim() || profile.name, avatar: draftAvatar }
    setProfile(next); setProfileState((p) => ({ ...p, ...next })); setEditing(false); requestSync()
  }
  const updatePref = (patch) => { setPrefs(patch); setPrefsState((p) => ({ ...p, ...patch })); requestSync() }
```
- 在「關於」或帳號相關區塊加一個登出按鈕：
```jsx
        <button className="btn btn-block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={signOut}>
          <Icon name="arrowUpRight" size={17} /> 登出
        </button>
```

- [ ] **Step 2: TripOverviewScreen 快捷排序變更觸發同步**

在 `src/screens/TripOverviewScreen.jsx` 的 `useStore()` 解構補 `requestSync`，並在既有 `setQuickOrder(order)` 呼叫之後加 `requestSync()`：
```js
  const { getTrip, openTripSheet, deleteTrip, editTrip, askConfirm, getPlaces, requestSync } = useStore()
  ...
  const drag = useDragSort(quick.map((q) => q.key), (order) => {
    setQuick(orderedQuick(order))
    setQuickOrder(order)
    requestSync()
  })
```

- [ ] **Step 3: 驗證 build**

Run：`npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add src/screens/StubScreen.jsx src/screens/TripOverviewScreen.jsx
git commit -m "加登出按鈕，設定與排序變更觸發雲端同步"
```

---

### Task 10: 照片改走 Supabase Storage

**Files:**
- Modify: `src/lib/image.js`
- Modify: 8 個 `pickImage` 使用點：`src/components/AddTripSheet.jsx`、`CompanionSheet.jsx`、`FlightSheet.jsx`、`JournalSheet.jsx`、`PhotoSheet.jsx`、`PlaceSheet.jsx`、`src/screens/StubScreen.jsx`
- Test: `<scratchpad>/imgpath.test.mjs`

**Interfaces:**
- Consumes: `supabase`（Task 1）、`useAuth().user`（取 userId）
- Produces:
  - `export async function uploadImage(userId, dataUrl): Promise<string>` — 回 Storage 路徑
  - `export function isStoragePath(v): boolean` — 判斷值是否為 Storage 路徑（用來決定要不要簽 URL）
  - `export async function signedUrl(path): Promise<string>` — 回可顯示網址（內部快取）

- [ ] **Step 1: 寫 isStoragePath 的測試（純函式部分）**

建立 `<scratchpad>/imgpath.test.mjs`：
```js
import assert from 'node:assert/strict'
import { isStoragePath } from 'C:/Users/aiden/Desktop/claude/projects/luyo/src/lib/image.js'

assert.equal(isStoragePath('a1b2/xyz.jpg'), true, 'userid/檔名 是 storage 路徑')
assert.equal(isStoragePath('data:image/jpeg;base64,AAAA'), false, 'base64 不是')
assert.equal(isStoragePath('https://images.unsplash.com/x'), false, '外部 URL 不是')
assert.equal(isStoragePath(''), false, '空字串不是')
assert.equal(isStoragePath(null), false, 'null 不是')
console.log('imgpath: all pass')
```

註：`isStoragePath` 需能被 node 直接 import。因 `image.js` 目前不 import 任何東西，Step 2 新增的 `uploadImage`/`signedUrl` 會 import `supabase`（連帶 `import.meta.env`）。為讓 node 測試不踩到 `import.meta`，把 `isStoragePath` 寫成不依賴 supabase 的純函式，且 **`image.js` 對 supabase 的 import 放在檔案內，node 測試僅呼叫 `isStoragePath`**——若 node 因 `import.meta` 報錯，改用 `node --experimental-vm-modules` 仍不行時，將 `isStoragePath` 抽到 `src/lib/imgpath.js` 純函式檔並由 `image.js` re-export。**預設先嘗試同檔；踩到 import.meta 錯誤才抽檔。**

- [ ] **Step 2: 擴充 `image.js`**

在 `src/lib/image.js` 末尾加：
```js
import { supabase } from './supabase'

// data:URL 或外部 http(s) 網址以外的「a/b.jpg」形狀，視為 Storage 路徑
export function isStoragePath(v) {
  if (!v || typeof v !== 'string') return false
  if (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('blob:')) return false
  return v.includes('/')
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',')
  const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export async function uploadImage(userId, dataUrl) {
  const path = `${userId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.jpg`
  const blob = dataUrlToBlob(dataUrl)
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

const urlCache = new Map()
export async function signedUrl(path) {
  if (!isStoragePath(path)) return path
  if (urlCache.has(path)) return urlCache.get(path)
  const { data, error } = await supabase.storage.from('photos').createSignedUrl(path, 60 * 60)
  if (error) throw error
  urlCache.set(path, data.signedUrl)
  return data.signedUrl
}
```

- [ ] **Step 3: 跑 isStoragePath 測試**

Run：
```
node "C:/Users/aiden/AppData/Local/Temp/claude/C--Users-aiden-Desktop-claude-projects-luyo/786fc5c2-4dcc-48a6-ab20-ca347a5abab9/scratchpad/imgpath.test.mjs"
```
Expected: PASS — `imgpath: all pass`。若因 `import.meta` 報錯，照 Step 1 的備援把 `isStoragePath` + `dataUrlToBlob` 抽到 `src/lib/imgpath.js`，`image.js` 從那邊 re-export，再跑一次測試。

- [ ] **Step 4: 8 個上傳點改上傳 Storage**

每個使用 `pickImage(setX)` 的地方，改成拿到 base64 後上傳、把回傳路徑存進 state。以 `PlaceSheet.jsx` 為例，原本：
```jsx
<button ... onClick={() => pickImage(setPhoto)}>
```
改成（元件內先取 userId）：
```jsx
import { useAuth } from '../auth'
...
  const { user } = useAuth()
  const onPickPhoto = () => pickImage(async (dataUrl) => {
    try { setPhoto(await uploadImage(user.id, dataUrl)) } catch { setPhoto(dataUrl) }
  })
...
<button ... onClick={onPickPhoto}>
```
其餘 7 個檔案（AddTripSheet 封面、CompanionSheet 頭像、FlightSheet、JournalSheet、PhotoSheet、StubScreen 頭像）比照：`pickImage` 的 callback 改為 async，`uploadImage(user.id, dataUrl)` 後存路徑；失敗退回存 base64（不擋使用者）。各檔 import `uploadImage`（與 `useAuth` 若尚未引入）。

- [ ] **Step 5: 顯示點改用 signedUrl**

顯示照片的地方（值可能是 Storage 路徑、外部 URL、或舊 base64）改成：路徑先經 `signedUrl` 換成可顯示網址。實作方式——用一個小元件 `src/components/Img.jsx` 統一處理：
```jsx
import { useEffect, useState } from 'react'
import { isStoragePath, signedUrl } from '../lib/image'

export default function Img({ src, alt = '', ...rest }) {
  const [url, setUrl] = useState(isStoragePath(src) ? '' : src || '')
  useEffect(() => {
    let alive = true
    if (isStoragePath(src)) { signedUrl(src).then((u) => alive && setUrl(u)).catch(() => {}) }
    else setUrl(src || '')
    return () => { alive = false }
  }, [src])
  if (!url) return null
  return <img src={url} alt={alt} {...rest} />
}
```
把顯示使用者上傳照片的 `<img src={photo}>` / 背景圖等，改用 `<Img src={photo} />`。背景圖（`backgroundImage: url(...)`）的情況，改先用 `signedUrl` 拿到網址再套用，或改成 `<Img>` 疊放。**至少涵蓋：地點照片（PlaceSheet 預覽 + PlacesScreen 卡片）、相簿（GalleryScreen/PhotoSheet）、旅程封面（Cover）、個人頭像（StubScreen）、同行者頭像。** 種子的 Unsplash URL 與舊 base64 因 `isStoragePath` 回 false 會直接顯示，不受影響。

- [ ] **Step 6: 驗證 build**

Run：`npm run build`
Expected: 成功。

- [ ] **Step 7: Commit**

```bash
git add src/lib/image.js src/components/Img.jsx src/components src/screens
git commit -m "照片改走 Supabase Storage，顯示用 signed URL"
```

---

### Task 11: Supabase 實接、端對端驗收、版號、部署（控制者執行）

本任務**不派 subagent**，由控制者連同使用者做，因為需要使用者的真 Supabase 專案與真人操作驗收。

**Files:**
- Local only: `.env`（不進 git）
- Modify: `src/screens/StubScreen.jsx`（版號）
- Modify: `CHANGELOG.zh.md`

- [ ] **Step 1: 交付使用者前置清單**

請使用者完成並回傳 `Project URL` 與 `anon public key`：
1. supabase.com 註冊、開一個專案
2. SQL editor 跑（spec 第二節腳本）：
```sql
create table app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table app_state enable row level security;
create policy "own rows" on app_state for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
3. Storage 建 private bucket `photos`，policy（SQL editor）：
```sql
create policy "own photos read"   on storage.objects for select using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos write"  on storage.objects for insert with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
```
4. Authentication → Providers/Settings：關閉 Confirm email
5. 把 URL 與 anon key 交給控制者

- [ ] **Step 2: 寫本機 `.env` 真值 + Vercel 環境變數**

用真值覆蓋 `.env`：
```
VITE_SUPABASE_URL=<使用者的 URL>
VITE_SUPABASE_ANON_KEY=<使用者的 anon key>
```
提醒使用者在 Vercel 專案 Settings → Environment Variables 加同樣兩個變數（Production/Preview/Development），否則部署版讀不到。

- [ ] **Step 3: 本機 dev 端對端驗收**

Run：`npm run dev`，逐條核對（對應 spec 驗收條件）：
1. 未登入 → 只看到登入畫面，無任何旅程/範例
2. 註冊新帳號 → 直接登入（免收信），進去是空的
3. 新增旅程 → 重整後仍在；開無痕視窗登入同帳號 → 看得到（雲端同步）
4. 登出 → 回登入畫面；註冊第二個帳號 → 看到的是空的，讀不到第一個帳號資料
5. StubScreen「載入範例資料」→ 出現京都等種子旅程，重整後仍在
6. 上傳一張照片 → 重整後仍顯示；到 Supabase Table editor 看 `app_state.data`，確認不含 base64（photos 欄位存的是路徑）
7. 斷網（DevTools offline）→ 讀得到快取資料、可操作；恢復後同步
8. 安全：兩帳號互相看不到資料（RLS）

任一條不過 → 回對應 Task 修正。

- [ ] **Step 4: 安全複查**

用 security-review skill 或人工檢查：RLS 政策已啟用、Storage policy 限本人資料夾、`.env` 不在 git（`git status` 確認）、前端無 service_role key。

- [ ] **Step 5: 版號 + CHANGELOG**

`src/screens/StubScreen.jsx` 版號 `v1.30` → `v1.31`。

取台北時間 `date "+%Y-%m-%d %H:%M"`，在 `CHANGELOG.zh.md` 檔尾追加：
```markdown
## 2026-07-25 HH:MM
- 版號：v1.31
- 範圍：src/lib/supabase.js、src/auth.jsx、src/screens/AuthScreen.jsx、src/lib/cloud.js、src/lib/migrate.js、src/lib/image.js、src/components/Img.jsx、src/store.jsx、src/main.jsx、src/App.jsx、src/screens/StubScreen.jsx 等
- 做了什麼：新增 Email+密碼登入（Supabase Auth，關 email 驗證），未登入擋在登入畫面；資料改存 Supabase（一人一列 JSON blob），變更 debounce 上雲、localStorage 當離線快取；新帳號進去是空的，範例資料退成「載入範例資料」按鈕；首次登入把本機自建旅程匯上雲；照片改走 Supabase Storage（private bucket + signed URL）
- 為什麼：讓每個使用者看自己的資料、跨裝置同步，不再一開就是範例資料
```

- [ ] **Step 6: build + push**

```bash
npm run build
git add -A
git commit -m "v1.31：登入系統 + Supabase 雲端同步"
git push
```
確認 `.env` 未被加入（`git status` / `git show --stat HEAD`）。push 觸發 Vercel 部署；提醒使用者 Vercel 環境變數要先設好，否則部署版白畫面。
