# AI 旅程總結文案 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在「旅程總結」頁依旅程彙整資料生成繁中回顧文案，有 API key 走真實 Claude、無 key 走本地模擬，可切換。

**Architecture:** 單一入口 `src/lib/ai.js` 依「localStorage 是否有 API key」分派到 Claude（`@anthropic-ai/sdk` 瀏覽器直連串流）或本地模擬（`src/lib/aiMock.js`，純函式）。兩條路徑都透過 `onDelta` 回拋文字片段，UI 統一處理串流顯示。結果與 key 存 localStorage。

**Tech Stack:** React + Vite、`@anthropic-ai/sdk`、localStorage、`claude-opus-4-8`。

**專案調整：**
- 本專案無測試框架。純函式（`aiMock`）以 `node` smoke-test 腳本驗證；整合以 `npx vite build` + 手動驗收（見最後一個 Task）驗證。
- 依專案 CLAUDE.md「未經要求不 commit」，本計畫用 build/test 檢查點取代逐任務 commit；是否 commit 由使用者決定。

---

### Task 1: 安裝 `@anthropic-ai/sdk`

**Files:**
- Modify: `package.json`（dependencies）

- [ ] **Step 1: 安裝套件**

Run（在專案根目錄 `C:\Users\aiden\Desktop\claude\projects\yotrip`）：
```bash
npm install @anthropic-ai/sdk
```
Expected: `package.json` 的 `dependencies` 出現 `@anthropic-ai/sdk`，`node_modules` 安裝完成，無錯誤。

- [ ] **Step 2: 驗證 dev server 仍可啟動**

Run：
```bash
npx vite build
```
Expected: build 成功（與安裝前相同的 modules 數量 + SDK，無錯誤）。

---

### Task 2: 本地模擬生成器 `aiMock.js`

**Files:**
- Create: `src/lib/aiMock.js`
- Test: `scripts/aiMock.smoke.mjs`（臨時 smoke 測試，驗證後可刪）

- [ ] **Step 1: 寫 smoke 測試（先失敗）**

Create `scripts/aiMock.smoke.mjs`：
```js
import { mockRecap } from '../src/lib/aiMock.js'

const trip = { id: 'kyoto', name: '京都・大阪輕旅行', country: '日本', city: '京都・大阪', days: 5, sym: '¥', status: 'completed' }
const statsFull = {
  spent: 138400, dailyAvg: 27680, sights: 4, restaurants: 3, malls: 1, placeCount: 9,
  favorites: [{ name: '伏見稻荷大社', type: 'sight' }, { name: '錦市場', type: 'mall' }],
  itinCount: 11, journalCount: 3, topCat: { label: '美食', amt: 42000 }, moodObj: { emoji: '😄' },
}
const statsSparse = {
  spent: 0, dailyAvg: 0, sights: 0, restaurants: 0, malls: 0, placeCount: 0,
  favorites: [], itinCount: 0, journalCount: 0, topCat: null, moodObj: null,
}

let pass = true
for (const [label, s] of [['full', statsFull], ['sparse', statsSparse]]) {
  const text = mockRecap(trip, s)
  const ok = typeof text === 'string' && text.length > 20 && !text.includes('undefined') && !text.includes('NaN')
  const sentences = text.split(/。/).filter(Boolean).length
  console.log(`[${label}] sentences=${sentences} len=${text.length}\n${text}\n`)
  if (!ok) { console.error(`FAIL: ${label} 輸出不合格`); pass = false }
  if (sentences < 3 || sentences > 6) { console.error(`FAIL: ${label} 句數 ${sentences} 不在 3-5（容許到 6）`); pass = false }
}
// 不同旅程應產生不同開頭（變化性）
const t2 = { ...trip, id: 'seoul', name: '首爾美食週末', country: '韓國', city: '首爾', days: 4 }
if (mockRecap(t2, statsFull).slice(0, 10) === mockRecap(trip, statsFull).slice(0, 10)) {
  console.warn('WARN: 兩趟旅程開頭相同（變化性偏弱，非硬性失敗）')
}
console.log(pass ? 'ALL PASS' : 'HAS FAILURES')
process.exit(pass ? 0 : 1)
```

- [ ] **Step 2: 跑測試確認失敗**

Run：
```bash
node scripts/aiMock.smoke.mjs
```
Expected: FAIL，錯誤類似 `Cannot find module '../src/lib/aiMock.js'`（檔案還沒建）。

- [ ] **Step 3: 實作 `aiMock.js`**

Create `src/lib/aiMock.js`：
```js
// 由旅程彙整資料組一段 3-5 句的繁中回顧。純函式，無外部相依。
const hash = (str) => {
  let h = 0
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}
const pick = (arr, seed) => arr[seed % arr.length]
const money = (n, sym) => sym + Math.round(n || 0).toLocaleString('en-US')

export function mockRecap(trip, s) {
  const seed = hash(trip.id || trip.name || '')
  const out = []

  // 開頭
  const openings = [
    `${trip.name}，在${trip.country}${trip.city}的 ${trip.days} 天，回想起來還是很有畫面。`,
    `這趟${trip.name}走了 ${trip.days} 天，${trip.country}${trip.city}留下不少片段。`,
    `${trip.days} 天的${trip.name}，${trip.city}的步調剛剛好。`,
  ]
  out.push(pick(openings, seed))

  // 花費
  if (s.spent > 0) {
    const base = `總共花了 ${money(s.spent, trip.sym)}，平均一天 ${money(s.dailyAvg, trip.sym)}`
    out.push(s.topCat ? `${base}，最常花在${s.topCat.label}。` : `${base}。`)
  }

  // 地點
  if (s.placeCount > 0) {
    const parts = []
    if (s.sights) parts.push(`${s.sights} 個景點`)
    if (s.restaurants) parts.push(`${s.restaurants} 間吃的`)
    if (s.malls) parts.push(`${s.malls} 個購物點`)
    const detail = parts.length ? `（${parts.join('、')}）` : ''
    out.push(`你走訪了 ${s.placeCount} 個地方${detail}。`)
  }

  // 最愛
  if (s.favorites && s.favorites.length) {
    const names = s.favorites.slice(0, 2).map((p) => p.name).join('、')
    out.push(`最難忘的大概是${names}。`)
  }

  // 收尾：日誌 / 心情 / 通用
  if (s.journalCount > 0) {
    out.push(s.moodObj ? `你寫下 ${s.journalCount} 篇日誌，整體心情 ${s.moodObj.emoji}。` : `你寫下 ${s.journalCount} 篇日誌記錄這段路。`)
  } else if (out.length < 3) {
    out.push(`願下次出發，也一樣輕鬆自在。`)
  }

  // 控制在 5 句內
  return out.slice(0, 5).join('')
}
```

- [ ] **Step 4: 跑測試確認通過**

Run：
```bash
node scripts/aiMock.smoke.mjs
```
Expected: 兩組（full / sparse）都印出文案，結尾 `ALL PASS`，exit 0。

- [ ] **Step 5: 清掉臨時測試腳本**

Run：
```bash
rm scripts/aiMock.smoke.mjs
```
（若 `scripts/` 變空目錄一併移除。`rm` 已 alias 為 trash。）

---

### Task 3: `ai.js` — key/結果儲存 + 模擬路徑分派

**Files:**
- Create: `src/lib/ai.js`

- [ ] **Step 1: 實作儲存與模擬路徑**

Create `src/lib/ai.js`：
```js
import { mockRecap } from './aiMock'

const AI_KEY = 'yotrip:ai:v1'
const RECAP_KEY = 'yotrip:airecap:v1'

export const getApiKey = () => {
  try { return localStorage.getItem(AI_KEY) || '' } catch { return '' }
}
export const setApiKey = (key) => {
  try {
    if (key) localStorage.setItem(AI_KEY, key)
    else localStorage.removeItem(AI_KEY)
  } catch {}
}
export const hasApiKey = () => !!getApiKey()

const loadRecaps = () => {
  try { return JSON.parse(localStorage.getItem(RECAP_KEY) || '{}') } catch { return {} }
}
export const getRecap = (tripId) => loadRecaps()[tripId] || null
export const saveRecap = (tripId, recap) => {
  try {
    const all = loadRecaps()
    all[tripId] = recap
    localStorage.setItem(RECAP_KEY, JSON.stringify(all))
  } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 串流分派：有 key 走 Claude（Task 4 補上），否則走模擬。
export async function generateRecap(trip, stats, { onDelta } = {}) {
  if (hasApiKey()) return generateWithClaude(trip, stats, { onDelta })
  const text = mockRecap(trip, stats)
  const chunks = text.match(/[\s\S]{1,6}/g) || [text]
  for (const c of chunks) { onDelta?.(c); await sleep(35) }
  return { text, source: 'mock' }
}

// Task 4 會實作；先放佔位以免 import 錯誤。
async function generateWithClaude(trip, stats, { onDelta } = {}) {
  const text = mockRecap(trip, stats)
  onDelta?.(text)
  return { text, source: 'mock' }
}
```

- [ ] **Step 2: 驗證 build**

Run：
```bash
npx vite build
```
Expected: 成功，無錯誤。

---

### Task 4: `ai.js` — 真實 Claude 串流路徑

**Files:**
- Modify: `src/lib/ai.js`

- [ ] **Step 1: 加上 SDK import**

在 `src/lib/ai.js` 最上方、`import { mockRecap }` 之上加：
```js
import Anthropic from '@anthropic-ai/sdk'
```

- [ ] **Step 2: 實作 prompt 組裝（加在 `generateWithClaude` 之上）**

在 `src/lib/ai.js` 的 `generateRecap` 與 `generateWithClaude` 之間，新增：
```js
const SYSTEM = '你是旅遊回顧撰寫者。用繁體中文寫一段放鬆、第二人稱、3 到 5 句的旅程回顧。只根據我提供的資料，不要杜撰沒有的內容，不要用 emoji，不要加標題或前言，直接輸出文案。'

const buildUserPrompt = (trip, s) => {
  const lines = [
    `旅程：${trip.name}`,
    `地點：${trip.country}${trip.city}`,
    `天數：${trip.days} 天`,
    `狀態：${trip.status === 'completed' ? '已結束' : trip.status === 'ongoing' ? '進行中' : '規劃中'}`,
    `總花費：${trip.sym}${Math.round(s.spent || 0).toLocaleString('en-US')}`,
    `每日平均：${trip.sym}${Math.round(s.dailyAvg || 0).toLocaleString('en-US')}`,
  ]
  if (s.topCat) lines.push(`最常花費分類：${s.topCat.label}（${trip.sym}${Math.round(s.topCat.amt).toLocaleString('en-US')}）`)
  lines.push(`造訪地點：${s.placeCount}（景點 ${s.sights}、餐廳 ${s.restaurants}、商場 ${s.malls}）`)
  if (s.favorites?.length) lines.push(`最愛地點：${s.favorites.slice(0, 3).map((p) => p.name).join('、')}`)
  lines.push(`日誌：${s.journalCount} 篇`)
  if (s.moodObj) lines.push(`平均心情：${s.moodObj.emoji}`)
  return lines.join('\n')
}
```

- [ ] **Step 3: 用真實串流取代 `generateWithClaude` 佔位**

把 `src/lib/ai.js` 的 `generateWithClaude` 整個函式替換為：
```js
async function generateWithClaude(trip, stats, { onDelta } = {}) {
  const client = new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true })
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildUserPrompt(trip, stats) }],
    })
    stream.on('text', (t) => onDelta?.(t))
    const final = await stream.finalMessage()
    const text = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
    return { text, source: 'claude' }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('API key 無效，請到「我的」頁面檢查設定。')
    if (err instanceof Anthropic.RateLimitError) throw new Error('呼叫太頻繁，請稍後再試。')
    throw new Error('生成失敗，請稍後再試。')
  }
}
```

- [ ] **Step 4: 驗證 build**

Run：
```bash
npx vite build
```
Expected: 成功，無錯誤（SDK 被打包進 bundle，體積較前增加）。

---

### Task 5: 設定 UI（`StubScreen` Profile）

**Files:**
- Modify: `src/screens/StubScreen.jsx`

- [ ] **Step 1: 加 import 與 state**

在 `src/screens/StubScreen.jsx` 頂部 import 區（`import { getTheme, applyTheme } from '../lib/theme'` 之後）加：
```js
import { getApiKey, setApiKey } from '../lib/ai'
```

在元件內、`const [theme, setTheme] = useState(getTheme())` 之後加：
```js
  const [aiKey, setAiKey] = useState(getApiKey())
  const [keySaved, setKeySaved] = useState(!!getApiKey())
  const saveKey = () => { setApiKey(aiKey.trim()); setKeySaved(!!aiKey.trim()) }
  const clearKey = () => { setApiKey(''); setAiKey(''); setKeySaved(false) }
```

- [ ] **Step 2: 在 profile 區塊加「AI 設定」**

在 `src/screens/StubScreen.jsx` 的 `{kind === 'profile' && (` 區塊內、那個 `<div style={{ display:'flex', flexDirection:'column', gap:10, ... width:240 }}>` 結束（即「重設為範例資料」按鈕所在 div 的 `</div>`）之後，插入：
```jsx
            <div style={{ width: 240, marginTop: 14, textAlign: 'left' }}>
              <div className="section-title" style={{ fontSize: 14, marginBottom: 8 }}>AI 設定</div>
              <div className="field">
                <label>Anthropic API key</label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ width: '100%' }}
                />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveKey}>
                  <Icon name="check" size={16} /> 儲存
                </button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={clearKey}>清除</button>
              </div>
              <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>
                {keySaved ? '已啟用 Claude 生成。' : '目前使用範例生成。'}
                <br />
                ⚠ key 只存在這台裝置的瀏覽器，會直接從前端呼叫 Anthropic API，有外洩與費用風險，僅建議個人 demo 使用。
              </p>
            </div>
```

- [ ] **Step 3: 驗證 build**

Run：
```bash
npx vite build
```
Expected: 成功，無錯誤。

- [ ] **Step 4: 手動驗證**

啟動 dev（若未啟動：`npm run dev`），到「我的」頁：
- 輸入任意字串按「儲存」→ 狀態變「已啟用 Claude 生成」。
- 重整頁面 → 輸入框仍有值、狀態仍為已啟用。
- 按「清除」→ 輸入框清空、狀態回「目前使用範例生成」。

---

### Task 6: 生成 UI（`SummaryScreen` AI 回顧卡）

**Files:**
- Modify: `src/screens/SummaryScreen.jsx`

- [ ] **Step 1: 加 import**

在 `src/screens/SummaryScreen.jsx` 的 `import { exportExpensesCSV, ... } from '../lib/exporters'` 之後加：
```js
import { generateRecap, getRecap, saveRecap } from '../lib/ai'
```

- [ ] **Step 2: 加 state 與生成 handler**

在元件內、`const [expMenu, setExpMenu] = useState(false)` 之後加：
```js
  const saved = getRecap(id)
  const [recap, setRecap] = useState(saved?.text || '')
  const [recapSource, setRecapSource] = useState(saved?.source || '')
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState('')

  const doRecap = async () => {
    setRecapLoading(true); setRecapError(''); setRecap(''); setRecapSource('')
    try {
      const res = await generateRecap(trip, s, { onDelta: (t) => setRecap((prev) => prev + t) })
      setRecap(res.text); setRecapSource(res.source)
      saveRecap(id, { text: res.text, source: res.source, at: Date.now() })
    } catch (err) {
      setRecapError(err.message || '生成失敗')
    } finally {
      setRecapLoading(false)
    }
  }
```

> 注意：`s` 是元件內既有的 `useMemo` 統計物件，`id`/`trip` 也已存在，直接沿用。

- [ ] **Step 3: 加 AI 回顧卡 UI**

在 `src/screens/SummaryScreen.jsx` 報告卡操作列那段（`{/* 操作 */}` 的 `</div>` 之後、`{/* 詳細統計 */}` 之前）插入：
```jsx
      {/* AI 旅程回顧 */}
      <div className="pad section">
        <div className="card" style={{ padding: 16 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            <div className="section-title row" style={{ fontSize: 16, gap: 6 }}>
              <Icon name="sparkles" size={17} /> AI 旅程回顧
            </div>
            {recapSource && !recapLoading && (
              <span className="tag" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                {recapSource === 'claude' ? 'Claude 生成' : '範例生成'}
              </span>
            )}
          </div>

          {recapError && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{recapError}</p>
          )}

          {recap ? (
            <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{recap}</p>
          ) : (
            !recapLoading && <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>依這趟的花費、地點、日誌生成一段回顧文案。未設定 API key 時使用範例生成。</p>
          )}

          <button
            className="btn btn-ghost btn-block"
            style={{ marginTop: 12 }}
            onClick={doRecap}
            disabled={recapLoading}
          >
            <Icon name={recapLoading ? 'clock' : 'sparkles'} size={17} />
            {recapLoading ? ' 生成中…' : recap ? ' 重新生成' : ' 生成回顧'}
          </button>
        </div>
      </div>
```

- [ ] **Step 4: 驗證 build**

Run：
```bash
npx vite build
```
Expected: 成功，無錯誤。

---

### Task 7: 整合驗收 + CHANGELOG

**Files:**
- Modify: `CHANGELOG.zh.md`

- [ ] **Step 1: build 驗收**

Run：
```bash
npx vite build
```
Expected: 成功。

- [ ] **Step 2: 手動驗收（對照 spec 驗收標準）**

啟動 dev，進入任一旅程的「旅程總結」：
- **未填 key**：到「我的」確認沒有 key → 回總結頁點「生成回顧」→ 文字逐步顯示、badge 為「範例生成」→ 重整後文案與 badge 仍在。
- **填有效 key**：到「我的」填入有效 Anthropic key 並儲存 → 回總結頁「重新生成」→ 串流顯示 Claude 文案、badge 為「Claude 生成」→ 重整後仍在、未再次呼叫 API。
- **填無效 key**：填 `sk-ant-invalid` 儲存 → 「重新生成」→ 顯示「API key 無效…」紅字、可重試、原有文案被清空但無 crash。
- **資料稀疏**：對一個剛新增、無花費無地點的旅程生成 → 仍產出合理短文，無 `undefined` / `NaN`。

- [ ] **Step 3: 更新 CHANGELOG**

在 `CHANGELOG.zh.md` 追加（時間用 `date "+%Y-%m-%d %H:%M"` 取得）：
```
## YYYY-MM-DD HH:MM
- 範圍：lib/ai.js、lib/aiMock.js、screens/SummaryScreen.jsx、screens/StubScreen.jsx、package.json
- 做了什麼：新增第一個 AI 功能「旅程總結文案」。lib/ai.js 依 localStorage 是否有 API key 分派：有 key 用 @anthropic-ai/sdk 瀏覽器直連串流呼叫 claude-opus-4-8、無 key 用 lib/aiMock.js 本地模板生成；兩路皆走 onDelta 串流。SummaryScreen 加 AI 回顧卡（生成 / 重新生成、來源 badge、結果存 localStorage）。StubScreen（我的）加 AI 設定（API key 輸入 / 儲存 / 清除 + 安全警語）
- 為什麼：使用者要求做 AI 功能，第一項為旅程總結文案
```

---

## 自我檢查（已執行）

- **Spec 覆蓋**：兩條路徑分派（Task 3/4）、Claude 串流 + 錯誤映射（Task 4）、模擬生成（Task 2）、設定 UI + 警語（Task 5）、生成 UI + badge + 持久化（Task 6）、相依（Task 1）、build + 手動驗收（Task 7）。孤兒 recap 容忍：`getRecap` 只依當前 tripId 取用，無需清理，符合 spec。
- **Placeholder**：Task 3 的 `generateWithClaude` 是「刻意佔位、Task 4 取代」，已在步驟標明；其餘步驟皆含完整程式碼。
- **型別 / 命名一致**：`generateRecap` / `generateWithClaude` / `getApiKey` / `setApiKey` / `hasApiKey` / `getRecap` / `saveRecap` / `mockRecap` 跨任務一致；`source` 值固定 `'claude'` / `'mock'`，UI badge 對應；`onDelta` 簽章一致。
