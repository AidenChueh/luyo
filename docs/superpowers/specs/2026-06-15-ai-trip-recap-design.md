# AI 旅程總結文案 — 設計規格

- 日期：2026-06-15
- 範圍：yotrip 第一個 AI 功能
- 狀態：已通過設計討論，待實作計畫

## 目標

在「旅程總結」（`SummaryScreen`）上，依該趟旅程的彙整資料生成一段自然的繁體中文回顧文案。支援兩條生成路徑、可切換：

- **真實 Claude**：使用者在設定填入自己的 Anthropic API key 後，前端直接呼叫 Claude 生成。
- **本地模擬**：未填 key 時，以模板 + 規則用同一份資料組出文案，零設定、離線、不計費。

切換的唯一判斷是「localStorage 是否有 API key」，呼叫端不需要知道走哪條路。

## 非目標（本次不做）

- 模型下拉選擇（固定 `claude-opus-4-8`）。
- 後端 / proxy / 帳號系統 / 雲端同步。
- 其他 AI 功能（行程建議、智慧記帳分類、景點推薦）— 各自之後另開 spec。
- 串流以外的進階參數（thinking、effort、task budget）。

## 使用者流程

1. （可選）使用者到「我的」頁面填入 Anthropic API key → 存 localStorage。
2. 進入某趟旅程的「旅程總結」頁。
3. 點「生成回顧」。
   - 有 key：串流呼叫 Claude，文字逐步顯示，完成後標 `Claude 生成`。
   - 無 key：本地模擬生成，標 `範例生成`。
4. 結果存 localStorage（per trip），重整不消失、不重複計費。可「重新生成」。

## 架構

### 新檔案

- `src/lib/ai.js` — 對外單一入口與來源判斷。
- `src/lib/aiMock.js` — 本地模擬文案生成器。

### `src/lib/ai.js` 介面

```
getApiKey() -> string | ''            // 讀 localStorage
setApiKey(key) -> void                // 寫 / 清除 localStorage
hasApiKey() -> boolean

// 串流生成。onDelta 每收到一段文字就被呼叫一次。
// 回傳最終結果與來源標記。
async generateRecap(trip, stats, { onDelta }) -> { text, source: 'claude' | 'mock' }
```

- `generateRecap` 內部：`hasApiKey()` 為真 → 走 Claude；否則 → 走 `aiMock`。
- 兩條路徑都透過 `onDelta` 回拋文字片段，讓 UI 統一處理串流顯示（模擬路徑用分段 setTimeout 模擬逐字，維持一致體感）。

### 真實 Claude 路徑

- 套件：官方 `@anthropic-ai/sdk`。
- Client：`new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`。
- 模型：`claude-opus-4-8`。
- `max_tokens`: 1024。不設 `thinking`（回顧文案不需要）。
- 串流：`client.messages.stream(...)`，逐 `text` delta 回拋給 `onDelta`，結束用 `finalMessage()` 取完整文字。
- 錯誤處理：用 SDK 的 typed exceptions。`AuthenticationError` → 回傳友善訊息「API key 無效，請到設定檢查」；`RateLimitError` / `APIError` → 提示稍後再試。錯誤時不退回模擬（避免使用者以為 Claude 成功）；UI 顯示錯誤訊息，保留重試。

#### Prompt 組成

System：定位為旅遊回顧撰寫者，要求繁體中文、放鬆、第二人稱、3–5 句、不杜撰資料中沒有的內容、不用 emoji。

User：帶入結構化資料（由 `SummaryScreen` 既有的 `s` 與 `trip` 提供）：
- 旅程名稱、國家城市、天數、日期區間、狀態
- 總花費、每日平均、主幣別符號
- 最常花費分類與金額
- 景點 / 餐廳 / 商場 / 造訪地點數
- 最愛地點（名稱 + 類型，取前 3）
- 日誌則數、平均心情

### 本地模擬路徑（`src/lib/aiMock.js`）

- 輸入同上（trip + stats）。
- 以模板 + 規則組 3–5 句：依數值挑選措辭（例如花費高 / 低、景點多 / 少、有無最愛地點、心情好壞走不同句型），讓輸出讀起來自然、不像填空。
- 同步產生完整字串，由 `ai.js` 切成片段透過 `onDelta` 模擬串流。

## 設定 UI（`StubScreen`，kind === 'profile'）

在現有的深色模式 / 安裝 / 重設按鈕區塊新增「AI 設定」：

- API key 輸入框（type=password 遮罩），預填目前已存的值。
- 「儲存」與「清除」。
- 安全警語（明確、不可省略）：key 只存在這台裝置的瀏覽器，會直接從前端呼叫 Anthropic API，有外洩與費用風險，僅建議個人 demo 使用。
- 狀態提示：已設定 key 時顯示「已啟用 Claude 生成」；未設定顯示「目前使用範例生成」。

## 生成 UI（`SummaryScreen`）

報告卡下方、操作列附近新增「AI 旅程回顧」卡：

- 標題 + 來源 badge（`Claude 生成` / `範例生成`，依本次或已存結果）。
- 無結果時：說明文字 + 「生成回顧」按鈕。
- 生成中：顯示串流文字 + loading 狀態，按鈕 disabled。
- 有結果時：顯示文案 + 「重新生成」。
- 錯誤時：紅字錯誤訊息 + 重試。

### 持久化

- key：`yotrip:ai:v1`，存純字串（API key 本身；清除即移除該 key）。
- 已生成文案：`yotrip:airecap:v1`，物件 `{ [tripId]: { text, source, at } }`。
- 刪除旅程後殘留的 recap 視為孤兒資料：讀取時只依當前 tripId 取用，不主動清理（不動 store 的 `deleteTrip`），孤兒項不影響功能。

## 相依與建置

- `package.json` 新增 `@anthropic-ai/sdk`，需 `npm install`。
- 會增加 bundle 體積；原型可接受。
- 驗證：`npx vite build` 通過；手動驗證兩條路徑（有/無 key）。

## 安全

- key 放 localStorage + 瀏覽器直連 = 會外洩，這是「自帶金鑰」取捨，UI 與本 spec 皆已標明。
- key 只存 localStorage，不寫入任何檔案、不進 git。
- 不在 console 印出 key。

## 邊界情況

- 無 key 且點生成 → 走模擬，不報錯。
- key 無效 → AuthenticationError → 友善提示，不退回模擬。
- 串流中途斷線 → 顯示已收到的部分 + 錯誤提示，可重試。
- 資料稀疏（新旅程、無花費 / 無地點）→ 兩條路徑都要能產出合理短文，不得出現 `undefined` / `NaN`。
- 重整後 → 從 localStorage 還原上次結果與來源 badge。

## 驗收標準

- 未填 key：點生成 → 串流顯示一段模擬文案，badge 為 `範例生成`，重整後仍在。
- 填入有效 key：點生成 → 串流顯示 Claude 文案，badge 為 `Claude 生成`，重整後仍在，且不重複呼叫 API。
- 填入無效 key：點生成 → 顯示友善錯誤，可重試，未污染既有結果。
- 設定頁可儲存 / 清除 key，狀態提示正確。
- `npx vite build` 通過。
