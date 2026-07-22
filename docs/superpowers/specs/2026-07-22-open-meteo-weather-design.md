# 旅程天氣接 Open-Meteo

日期：2026-07-22

## 背景

`TripOverviewScreen` 的天氣卡片目前讀 `trip.weather`，那是寫死的靜態資料 — 種子旅程各自寫死在 `src/data/seed.js`，使用者新增的旅程一律拿到 `src/components/AddTripSheet.jsx` 的預設值 `{ tmp: 24, cond: '—', hi: 26, lo: 18 }`。跟城市、日期都無關，是原型的視覺佔位。

## 目標

接 Open-Meteo 顯示真實天氣：進行中的旅程看今天，規劃中的看出發日，已完成的不顯示。

## API 確認

已實測 `https://api.open-meteo.com/v1/forecast`（2026-07-22）：

- 免 API key，免註冊
- 參數：`latitude`、`longitude`、`current=temperature_2m,weather_code`、`daily=weather_code,temperature_2m_max,temperature_2m_min`、`timezone=auto`、`forecast_days=16`
- 回應：`current.temperature_2m`、`current.weather_code`、`daily.time`（`YYYY-MM-DD` 陣列）、`daily.weather_code`、`daily.temperature_2m_max`、`daily.temperature_2m_min`
- `forecast_days` 上限 16，實測回傳 16 筆
- 過去日期需另接 `archive-api.open-meteo.com`，本設計不接

## 一、新檔 `src/lib/weather.js`

匯出兩個函式：

```
getWeather(tripId, lat, lng, targetDate) => Promise<{ tmp, cond, hi, lo, icon, at } | null>
removeWeather(tripId) => void
```

- `targetDate` 為 `YYYY-MM-DD` 字串，或 `null` 代表要「現在」的即時天氣
- localStorage 快取 key `luyo:weather:v1`，照 `src/lib/ai.js` 既有的 `loadJSON`/`saveJSON`/`removeJSON` 模式依 tripId 存
- 快取內容含 `at`（寫入時的 `Date.now()`）與 `lat`/`lng`/`targetDate`。命中條件：距今未滿 1 小時，且 `lat`/`lng`/`targetDate` 都與本次請求相同。任一不符就重新請求
- `targetDate` 為 `null` 時取 `current.temperature_2m` 當 `tmp`、`current.weather_code` 當天氣，`hi`/`lo` 取 `daily` 裡今天那筆
- `targetDate` 有值時在 `daily.time` 裡找該日期的索引；找不到（超出 16 天）回傳 `null`
- 網路失敗時 throw，由呼叫端決定顯示什麼

WMO weather code 對照（`cond` 為繁體中文，`icon` 為 `Icon.jsx` 的名稱）：

| code | cond | icon |
|---|---|---|
| 0 | 晴 | sun |
| 1 | 大致晴朗 | sun |
| 2 | 多雲時晴 | cloudSun |
| 3 | 陰 | cloud |
| 45, 48 | 霧 | cloud |
| 51, 53, 55 | 毛毛雨 | rain |
| 56, 57 | 凍雨 | rain |
| 61, 63, 65 | 雨 | rain |
| 66, 67 | 凍雨 | rain |
| 71, 73, 75, 77 | 雪 | snow |
| 80, 81, 82 | 陣雨 | rain |
| 85, 86 | 陣雪 | snow |
| 95, 96, 99 | 雷雨 | rain |

未列出的 code 一律回 `{ cond: '—', icon: 'cloudSun' }`。

## 二、座標解析

`TripOverviewScreen` 依序嘗試：

1. `trip.lat` / `trip.lng` 已存在 → 直接用
2. `getPlaces(trip.id)` 裡第一個 `Number.isFinite(lat) && Number.isFinite(lng)` 的地點 → 用它，並 `editTrip(trip.id, { lat, lng })` 存回去
3. `geocode(\`${trip.city} ${trip.country}\`)`（既有的 Nominatim 封裝）→ 成功則 `editTrip` 存回去
4. 全部失敗 → 卡片顯示「無法定位這個城市」

`editTrip` 對種子旅程走 `overrides`、對自訂旅程直接改 `custom`，兩種都能持久化，不需額外處理。

座標存回 trip 後，後續進頁面不再重複走 Nominatim。

## 三、顯示規則

| 旅程狀態 | 取哪一天 | 卡片內容 |
|---|---|---|
| `ongoing` | 今天（`targetDate = null`，用 `current`） | 即時溫度 + 天氣敘述 + 今天最高／最低 |
| `planning` | `trip.start` | 該日的天氣 + 最高／最低 |
| `completed` | — | 整張卡不渲染 |

規劃中且 `trip.start` 超出 16 天預報範圍（`getWeather` 回 `null`）→ 卡片顯示「出發前兩週才有預報」。

載入中顯示既有卡片版面但數值以 `—` 佔位；請求失敗顯示「天氣暫時取不到」。

## 四、`Icon.jsx` 新增兩個圖示

新增 `rain` 與 `snow`，線條風格比照既有的 `cloud`、`cloudSun`（同樣的 `stroke-width`、`viewBox`、雲朵外框），下方分別是雨滴與雪花。

## 五、清掉靜態假資料

- `src/screens/TripOverviewScreen.jsx`：不再讀 `trip.weather`
- `src/components/AddTripSheet.jsx`：拿掉新旅程的 `weather` 預設值
- `src/data/seed.js`：三筆種子旅程的 `weather` 欄位移除

已存在 localStorage 的舊旅程資料仍可能帶著 `weather` 欄位，但沒有任何程式碼再讀它，不需要遷移。

## 已知取捨

- **已完成的旅程看不到天氣**。要看旅程期間的實際天氣得另接 `archive-api.open-meteo.com`，本次不做。
- **規劃中且出發日超過 16 天就沒有預報**，這是 Open-Meteo 免費預報的上限，不是實作問題。
- **座標是整趟旅程一個點**。像「京都・大阪」這種跨城市的旅程，天氣只反映其中一處。
- **Nominatim 呼叫頻率**：只在地點庫完全沒有座標、且 trip 尚未存過座標時打一次，結果存回 trip 後不再重複。

## 驗收條件

1. 進行中的旅程（京都）天氣卡顯示真實的即時溫度與天氣敘述，不再是寫死的 27°／多雲時晴。
2. 規劃中的旅程顯示出發日的預報；若出發日超過 16 天，顯示「出發前兩週才有預報」。
3. 已完成的旅程不顯示天氣卡。
4. 第一次載入後重新整理頁面，一小時內不再發出 Open-Meteo 請求（DevTools Network 確認）。
5. 天氣代碼對到雨或雪時，卡片顯示新增的 `rain` / `snow` 圖示，不是雲朵。
6. 斷網時卡片顯示「天氣暫時取不到」，不會整頁崩潰。
7. 新增一筆旅程並在地點庫收藏一個已定位的地點，回旅程總覽能取到該地點座標的天氣。
8. `src/data/seed.js`、`src/components/AddTripSheet.jsx` 已無 `weather` 欄位，全專案 grep 不到 `trip.weather`。
9. `npm run build` 通過。
