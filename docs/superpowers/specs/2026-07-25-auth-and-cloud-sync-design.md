# 登入系統 + Supabase 雲端同步

日期：2026-07-25

## 背景

luyo 目前是純前端 Vite SPA（部署 Vercel，無後端）。所有資料在瀏覽器 localStorage，一開啟就載入寫死的種子資料（京都等範例旅程）。要改成真帳號登入 + 雲端同步，讓每個使用者看到自己的資料，新帳號進去是空的。

## 已定案的決定

- 後端：Supabase
- 認證：Email + 密碼；**關閉** email 驗證（註冊完直接登入）
- 首次登入：把本機自建（非種子）旅程 + 其子資料匯上雲
- 雲端資料架構：**JSON blob 一人一列**（非照片資料打包成一個 JSONB），照片走 Supabase Storage
- 範圍：一次做到完整雲端同步

## 現況盤點

`store.jsx` 有 10 個 state slice，各對一個 localStorage key：

| slice | key | 種子 fallback |
|---|---|---|
| byTrip（記帳） | `luyo:expenses:v1` | seedExpenses |
| tripData（旅程） | `luyo:trips:v2` | `{ custom, overrides, deleted }` |
| prepByTrip | `luyo:prep:v1` | seedPrep |
| itinByTrip | `luyo:itinerary:v1` | seedItin |
| placeByTrip | `luyo:places:v1` | seedPlaces |
| journalByTrip | `luyo:journal:v1` | seedJournal |
| flightByTrip | `luyo:flights:v1` | seedFlights |
| stayByTrip | `luyo:stays:v1` | seedStays |
| photoByTrip | `luyo:photos:v1` | seedPhotos |
| compByTrip | `luyo:companions:v1` | seedCompanions |

`settings.js` 另有 3 個 key：`luyo:profile:v1`、`luyo:prefs:v1`、`luyo:quickorder:v1`。

`trips` 目前 = `[...custom, ...seedTrips]` 濾 deleted、套 overrides。

`pickImage`（`src/lib/image.js`）把選到的圖縮放壓成 base64 dataURL，用於 8 個元件：AddTripSheet（封面）、CompanionSheet（頭像）、FlightSheet、JournalSheet、PhotoSheet（相簿）、PlaceSheet（地點照片）、StubScreen（個人頭像）。種子資料的照片是 Unsplash 外部 URL（非 base64）。

`@supabase/supabase-js` **尚未安裝**。

## 一、相依與環境變數

- 安裝 `@supabase/supabase-js`
- 新增環境變數（Vite 慣例 `VITE_` 前綴才會進 client bundle）：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- 本機放 `.env`（加進 `.gitignore`，不進 git）；部署放 Vercel 專案的 Environment Variables
- anon key 設計上就是公開放前端，資料安全靠 RLS，不是靠藏 key

## 二、Supabase 後端結構（使用者手動建立，spec 提供腳本）

### 資料表 `app_state`

```sql
create table app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "own rows" on app_state
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

一人一列，`data` 存整包 app 狀態。RLS 保證只能讀寫自己那列。

### Storage bucket `photos`

- private bucket，命名 `photos`
- 路徑規則 `<user_id>/<uid>.jpg`
- policy：`select`/`insert`/`update`/`delete` 皆限 `(storage.foldername(name))[1] = auth.uid()::text`，即只能碰自己 user_id 資料夾
- 讀取用 signed URL（限本人才簽得出來）

## 三、認證層與 App 門禁

### `src/lib/supabase.js`

- 建並匯出單一 `supabase` client（`createClient(url, anonKey)`）
- URL/key 缺失時 throw 明確錯誤，避免無聲失敗

### `src/auth.jsx`（新，AuthProvider + useAuth）

- state：`session`、`loading`（初次確認 session 中）
- 掛載時 `supabase.auth.getSession()`，並訂閱 `onAuthStateChange` 更新 session
- 匯出動作：`signUp(email, pw)`、`signIn(email, pw)`、`signOut()`
- 錯誤訊息中文化（對應 Supabase 錯誤碼）：
  - 密碼太短（Supabase 預設最少 6 碼）
  - email 已註冊
  - 帳號或密碼錯誤
  - 網路錯誤

### `src/screens/AuthScreen.jsx`（新）

- 登入／註冊兩個模式切換
- Email、密碼欄位；註冊時密碼至少 6 碼的前端提示
- 送出中 loading、錯誤中文顯示
- 視覺沿用現有設計 token（暖色、16px 圓角、卡片），符合專案設計約束

### `App.jsx` 門禁

- 包一層 `AuthProvider`
- `loading` → 顯示簡單載入畫面（不閃現 app）
- 未登入 → 只 render `AuthScreen`，底部導航與所有路由都不出現
- 已登入 → 現有 app

### 登出

- StubScreen 個人資料區加「登出」按鈕 → `signOut()`

## 四、雲端資料層（blob）

### blob 形狀

```
data = {
  v: 1,
  expenses, trips, prep, itinerary, places,
  journal, flights, stays, photos, companions,
  profile, prefs, quickorder
}
```

即 10 個 store slice + 3 個 settings，用固定欄位名打包。`v` 為 schema 版本，供日後遷移。

**不進 blob、續留本機**：AI API key（`luyo:ai:v1`，使用者自填的密鑰，不上雲）與主題（`luyo:theme`，裝置層偏好）。這兩個是 client-local，登入不同帳號也共用同一裝置設定。

### 新檔 `src/lib/cloud.js`

- `fetchState(userId)`：`select data from app_state`，回 `data` 或 `null`（沒這列＝新帳號）
- `pushState(userId, data)`：`upsert { user_id, data, updated_at: now() }`
- 純資料層，不含 React

### store.jsx 改造

- 移除「一開就 `load(KEY, seedFn)`」。改成：
  - 初始 state 全部空（`{}` / `emptyTripData()` / 空陣列），先不含種子
  - `useAuth()` 拿 session；session 就緒後：
    1. `fetchState(userId)`
    2. 有資料 → 拆進各 slice + 呼叫 `setProfile`/`setPrefs`/`setQuickOrder` 寫回 settings（讓現有讀 settings 的元件不用改）
    3. 沒資料（新帳號）→ 跑「首次登入遷移」（見第五節），遷移結果 `pushState` 上雲
  - 資料就緒前，store 對外提供 `ready` 旗標；App 在 `ready` 前顯示載入
- 本機變更 → **debounce 約 1 秒**打包整包 `pushState`；同時寫 localStorage 當離線快取（key 加 user id 前綴，如 `luyo:cache:<userId>`，單一 key 存整包）
- 同步策略：整包覆寫，last-writer-wins。多裝置同時編輯以後者為準，個人 app 可接受
- 離線 / push 失敗：沿用現有輕量提示風格（類似「儲存空間已滿」），不擋操作，下次變更再試

### 資料模型轉變（關鍵）

- `trips` 不再合併 `seedTrips`：改成 `[...custom]` 濾 deleted、套 overrides
- 新帳號 = 完全空白，這是「不要一點開就是範例資料」的落實
- 種子資料退成 StubScreen 一個「載入範例資料」按鈕：把 10 個 slice 設為各自 seed 值（等同現有 `reset` 的效果），再上雲。現有的「重設為範例資料」按鈕直接改名為「載入範例資料」，行為改為上述（設 seed 值並 push），不再只是清 localStorage

## 五、首次登入遷移

`src/lib/migrate.js`（新，純函式便於測試）：

- `collectLocalCustom()`：讀舊的各 `luyo:*:v1/v2` localStorage key，取出 `tripData.custom` 的自建旅程 id 集合，只挑這些 id 的子資料（記帳/行程/地點/日誌/機票/住宿/相簿/同行者/prep），連同 profile/prefs/quickorder，組成一個 blob（種子旅程與其子資料不帶）
- 若本機沒有任何自建旅程 → 回空 blob（新帳號就是全空）
- store 在「雲端沒有這帳號資料」時呼叫，結果進 state 並 `pushState`
- 遷移只做一次（雲端一旦有列就不再觸發）

## 六、照片 → Storage

### `src/lib/image.js` 擴充

- 保留現有 `pickImage`（縮放壓縮成 base64）
- 新增 `uploadImage(userId, dataUrl)`：base64 → Blob → `supabase.storage.from('photos').upload('<userId>/<uid>.jpg', blob)`，回存路徑（非完整 URL）
- 新增 `signedUrl(path)`：`createSignedUrl` 取可顯示網址（快取，避免每次重簽）

### 呼叫端流程

- 8 個 `pickImage` 使用點：拿到 base64 後改呼叫 `uploadImage`，把回傳的**路徑**存進資料（而非 base64）
- 顯示照片的地方：若值是 Storage 路徑 → 用 `signedUrl` 換顯示網址；若是外部 http URL（種子的 Unsplash）或舊 base64 → 直接用。以「值長得像 Storage 路徑」判斷，兼容舊資料
- 首次登入遷移時，本機自建旅程若帶 base64 照片 → 一併上傳轉成路徑

### 取捨

- private bucket + signed URL：較安全，但 URL 會過期，需載入時即時簽發並快取
- 若日後要更簡單可改 public bucket（有連結即可看）；本設計採 private

## 七、錯誤處理

- 認證錯誤：AuthScreen 顯示中文訊息，不崩潰
- 資料載入失敗（有網但 query 失敗）：顯示重試提示，退回讀 localStorage 快取
- push 失敗：輕量提示，保留本機變更，下次再試
- Storage 上傳失敗：該次上傳提示失敗，不影響其他資料
- 缺環境變數：啟動時明確報錯（開發時就會發現）

## 八、安全

- RLS 政策 `user_id = auth.uid()` 是資料隔離命脈，必做安全複查：換帳號登入確認讀不到別人的列
- Storage 政策確認只能存取自己 user_id 資料夾
- anon key 公開無妨；真正的 service_role key **絕不**進前端
- `.env` 不進 git

## 九、測試

- 純函式（`migrate.js` 的 collect/打包、blob ↔ slice 拆併、image 路徑判斷）：node 斷言腳本
- 其餘：`npm run build` + 手動驗收
- 安全複查：兩個帳號互相讀不到資料

## 已知取捨與限制

- **last-writer-wins**：多裝置同時改同一份資料，後存的整包蓋前面的。個人 app 可接受，不做欄位級合併
- **整包同步**：每次變更 debounce 後上傳整個 blob；資料量大時稍重，但非照片資料量不大（照片已外移 Storage）
- **需要手動前置**：建 Supabase 專案、跑 SQL、建 bucket、設環境變數（本機 + Vercel）——只有使用者能做
- **signed URL 過期**：照片顯示需即時簽發，實作要快取避免頻繁重簽

## 使用者必做的前置（實作前提）

1. 到 supabase.com 註冊、開一個專案
2. SQL editor 跑第二節的建表 + RLS 腳本
3. 建 private bucket `photos` + 第二節的 storage policy
4. Authentication 設定關閉 email 驗證（Confirm email = off）
5. 把 `Project URL` 和 `anon public key` 交給我 → 放進 `.env`（本機）與 Vercel 環境變數

## 驗收條件

1. 未登入開 app → 只看到登入畫面，看不到任何旅程或範例資料
2. 註冊新帳號 → 直接登入（無需收信），進去是空的（無旅程）
3. 新增旅程 → 重整頁面後仍在（已上雲）；換另一台裝置／瀏覽器登入同帳號 → 看得到
4. 登出 → 回到登入畫面；再登入別的帳號 → 看到的是那個帳號的資料，讀不到前一個帳號的
5. StubScreen「載入範例資料」→ 出現京都等種子旅程並上雲
6. 上傳照片 → 存進 Storage，重整後仍顯示；DB 的 blob 不含 base64
7. 首次登入時，本機原有的自建旅程被匯上雲（種子旅程不匯）
8. 斷網 → 讀得到上次快取資料，變更不遺失，恢復連線後同步
9. 安全：A、B 兩帳號互相看不到對方資料（RLS 生效）
10. `.env` 不在 git；`npm run build` 通過
