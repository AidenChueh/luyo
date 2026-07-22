# 底部導航改「行程」＋ Google Maps 連結自動同步

日期：2026-07-22

## 目標

1. 底部導航第三個 tab 由「地圖」改為「行程」，讓最常用的行程規劃頁一鍵可達。
2. 行程項目填了 Google Maps 連結時，自動在地點庫建立對應地點，並讓它出現在地圖上。

## 一、底部導航：地圖 → 行程

### 變更

- `src/components/BottomNav.jsx`
  - `TABS` 第三項改為 `{ key: 'itin', label: '行程', icon: 'route', path: '/itinerary' }`
  - `targetOf`：網址含 tripId 時導到 `/trip/<tripId>/itinerary`，否則導到 `/itinerary`
  - `isActive`：`itin` tab 命中 `/itinerary` 與 `/trip/:id/itinerary`
  - `trips` tab 的判定要額外排除 `itinerary`（現行邏輯把所有 `/trip/*` 當成 trips，只排除了 map / expenses）
  - 移除 `map` tab 的 `isActive` / `targetOf` 特例
- `src/App.jsx`：新增 `<Route path="/itinerary" element={<ItineraryScreen />} />`
- `src/screens/ItineraryScreen.jsx`：trip 解析改為 fallback 形式，比照 `MapScreen`：

  ```js
  const trip = (id && getTrip(id)) || trips.find((t) => t.status === 'ongoing') || trips[0]
  ```

  螢幕內所有 `/trip/${id}/...` 的導頁與 store 呼叫改用 `trip.id`。

### 不變更

- `/map` 與 `/trip/:id/map` 路由保留
- `MapScreen` 保留
- 旅程總覽（`TripOverviewScreen`）九宮格的「地圖」入口保留 — 這是拿掉 tab 後地圖的主要入口

## 二、Google Maps 連結自動同步到地點庫與地圖

### 資料流

```
ItinSheet 存檔（含 maps 連結）
  → store.addItin / editItin / removeItin / copyItinDay
    → syncLinkedPlace(tripId, itinId, fields | null)
      → placeByTrip 新增／更新／刪除 id 為 `lnk-<itinId>` 的地點
        → PlacesScreen 顯示（標「來自行程」）
        → MapScreen 顯示（有座標才畫 marker）
```

### 新檔 `src/lib/gmaps.js`

單一匯出 `parseGmaps(url)`，回傳 `{ lat, lng }` 或 `null`。純同步函式，不發網路請求。

支援格式：

| 格式 | 範例 |
|---|---|
| `@lat,lng,zoom` | `https://www.google.com/maps/@35.0116,135.7681,15z` |
| `!3d<lat>!4d<lng>` | `.../data=!3m1!4b1!4m5!3d34.9948!4d135.7850` |
| `?q=lat,lng` | `https://maps.google.com/?q=35.0116,135.7681` |
| `?ll=` / `?query=` | `https://maps.google.com/?ll=35.01,135.76` |

座標須通過範圍檢查（lat ∈ [-90,90]、lng ∈ [-180,180]），否則視同解析失敗。

短網址（`maps.app.goo.gl`、`goo.gl/maps`）不含座標，且瀏覽器受 CORS 限制無法跟隨轉址取得目標網址，一律回 `null`，交給下述 fallback。

### store 變更（`src/store.jsx`）

比照現有 `syncLinkedExpense` 的模式新增 `syncLinkedPlace`。

- `addPlace(tripId, place)` 改為可指定 id：`place.id` 存在就用它，否則 `uid('pl')`
- 新增 `ITIN_TO_PLACE_TYPE = { sight: 'sight', food: 'food', shopping: 'mall', transport: 'sight', hotel: 'sight' }`
- 新增 `syncLinkedPlace(tripId, itinId, it)`：
  - `it` 為 `null`，或 `it.maps` 為空 → 刪除 id 為 `lnk-<itinId>` 的地點後結束
  - 否則組出欄位：
    - `name` ← `it.title`
    - `note` ← `it.note`
    - `maps` ← `it.maps`
    - `type` ← `ITIN_TO_PLACE_TYPE[it.cat] || 'sight'`
    - `tag` ← `'must'`
    - `rating` ← `it.rating || 0`
  - 座標取得順序：
    1. `parseGmaps(it.maps)` 成功 → 直接用
    2. 失敗 → `await geocode(`${it.title} ${trip.city} ${trip.country}`)`；再失敗則不帶座標
  - 若該 id 已存在 → `editPlace` 覆蓋上述欄位；不存在 → `addPlace` 並指定 id
- 觸發點（皆在原有 `syncLinkedExpense` 呼叫旁邊）：
  - `addItin` → `syncLinkedPlace(tripId, iid, item)`
  - `editItin` → `syncLinkedPlace(tripId, itemId, patch)`
  - `removeItin` → `syncLinkedPlace(tripId, itemId, null)`
  - `copyItinDay` → 每個 cloned 項目各自呼叫

因為 fallback 需要 `await`，`syncLinkedPlace` 是 async；呼叫端不 await（fire-and-forget），座標到位後靠 state 更新重繪。

### 地點庫 UI

- `src/screens/PlacesScreen.jsx`
  - linked 地點（`p.id.startsWith('lnk-')`）卡片加「來自行程」標籤
  - 點卡片不呼叫 `openPlace`，改導到該旅程的行程頁 `/trip/<tripId>/itinerary`
- `src/components/PlaceSheet.jsx`：不需變更（linked 地點不會開啟此面板）

### 地圖

`MapScreen` 不需變更：

- 「全部地點」view 直接讀地點庫，linked 地點自動出現
- Day view 現行邏輯用「行程 title 或 loc 比對地點庫的 name」取座標，而 linked 地點的 `name` 就是行程 title，剛好對得上

## 已知取捨

- **Nominatim 呼叫頻率**：`src/lib/geocode.js` 原本的設計是「只在使用者主動按定位時呼叫」。本設計在短網址 fallback 時會自動觸發。限制條件是「有填連結且連結解析不出座標」，單筆單次，`geocode.js` 內建的 Map 快取也會擋掉重複查詢。
- **短網址是手機分享的預設格式**，實務上 fallback 路徑會經常走到，定位準確度取決於行程標題是否夠具體。
- **linked 地點不可手動編輯**，避免與行程資料互相覆蓋。使用者要改就回行程那邊改。

## 驗收條件

1. 底部導航第三格顯示「行程」，在旅程內點擊進入該旅程的行程頁，不在旅程內時進入進行中旅程的行程頁。
2. 「地圖」仍可從旅程總覽九宮格進入。
3. 行程新增時填入含座標的完整 Google Maps 網址 → 地點庫立刻出現同名地點，標「來自行程」，地圖「全部地點」view 有 marker。
4. 行程新增時填入短網址 → 地點庫出現同名地點；地理編碼成功則有 marker，失敗則顯示「未定位」。
5. 編輯該行程改標題 → 地點庫的名稱同步更新。
6. 清空該行程的 Google Maps 連結 → 地點庫的對應地點消失。
7. 刪除該行程 → 地點庫的對應地點消失。
8. 手動收藏的地點不受任何影響。
9. `npm run build` 通過。
