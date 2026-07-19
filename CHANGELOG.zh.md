# yotrip 變更紀錄（起始：2026-06-14）

## 2026-07-06 08:25
- 範圍：lib/aiMock.js、lib/ai.js、store.jsx、screens/ItineraryScreen.jsx、screens/BudgetScreen.jsx
- 做了什麼：接續完成第一個 AI 功能之後的兩項——AI 行程規劃、AI 預算分析，架構與 UI 皆比照既有「AI 旅程回顧」。aiMock.js 新增 mockPlan（依地點庫必去優先、替代次之，依上午景點/中午餐廳/下午景點或購物/晚上餐廳四時段分配到每天，地點不足補城市通用占位項，deterministic）與 mockBudgetAnalysis（依總花費/日均/分類彙總組 4 句：最高花費分類、日均推估超支與否、50/85/100 級距提醒、建議）。ai.js 新增 generatePlan/generatePlanWithClaude（有 key 時要求 Claude 只回 JSON 陣列，容忍前後夾雜文字用第一個 [ 到最後一個 ] 擷取，解析失敗丟 PlanParseError 顯示友善訊息不套用）與 generateBudgetAnalysis/generateBudgetWithClaude（純文字串流，同旅程回顧模式），草稿/分析各自存 localStorage（yotrip:aiplan:v1、yotrip:aibudget:v1，per trip），新增 removePlan/removeBudgetAnalysis。store.jsx 的 deleteTrip 補呼叫這兩個 remove。ItineraryScreen 新增 AIPlanCard（日切換列下方）：生成/重新生成、逐日草稿清單、逐項「加入」（寫入 store.addItin）與「套用全部」、Claude/範例來源 badge、錯誤紅字。BudgetScreen 環形進度下方加 AIBudgetCard：生成/重新生成、串流顯示分析文字、來源 badge、錯誤紅字。無 key 情境以 mock 函式邏輯走讀驗證（依 kyoto 種子資料手動追蹤 mockPlan 分配與 mockBudgetAnalysis 組句），npm run build 通過
- 為什麼：使用者要求接續完成設計大綱 3.15.1／3.15.2 兩項 AI 功能，AI 定位為輔助草稿、使用者保留最終決定權

## 2026-07-06 08:18
- 範圍：UX 修正批次——styles/tokens.css、styles/global.css、data/seed.js、components/Icon.jsx、components/BottomNav.jsx、全部 screens 與 sheet 元件（共 29 檔）
- 做了什麼：依 UX 審查修 16 項。「我的」頁 set-row div 改 button、開關加 role=switch；.scroll/.fab/.topbar 補 safe-area inset；分類色（CATEGORIES/ITIN_CAT/PLACE_TYPE）由寫死 hex 改 CSS 變數並補深色模式加亮版（對比 ≥4.5:1），hex 拼透明度改 color-mix；.check 與 .iconbtn/.fav/.del 等熱區撐大到 ≥44px（視覺不變）；全站約 45 處 icon-only 按鈕補 aria-label；匯率換算關閉鈕改與其他 sheet 一致的左上返回；BottomNav 在 /trip/:id/* 下「地圖」「記帳」導向該旅程子頁；移除預算頁 sliders 死按鈕；加全域 :focus-visible 樣式；空狀態文案統一並補 PrepScreen 操作提示；新增 trash 圖示、刪除鈕不再誤用 alert 圖示。build 驗證通過
- 為什麼：使用者要求先做 code review 與 UI/UX 優化；ux-ui-designer 審查發現觸控目標、無障礙、safe-area、深色對比問題

## 2026-07-06 08:10
- 範圍：store.jsx、lib/format.js、lib/ai.js、lib/markdown.js、lib/exporters.js、screens/HomeScreen.jsx、ExpensesScreen.jsx、BudgetScreen.jsx、SummaryScreen.jsx、ItineraryScreen.jsx、GalleryScreen.jsx、JournalScreen.jsx、components/AddTripSheet.jsx
- 做了什麼：修 code review 發現的 9 項。會壞級：removeCompanion 同步清理該旅程支出的 payer/split 參照（防分帳結算不平）；首頁通知 useMemo 補 byTrip 依賴（記帳後通知即時重算）；記帳/預算頁在旅程全刪光時補 if (!trip) 防呆不再白屏。風險級：deleteTrip 連帶清 AI 回顧快取（ai.js 新增 removeRecap）；localStorage 寫入失敗改共用 persist() 並在爆容量時提示一次；日期解析新增 parseYMD 修 UTC 負時區 off-by-one（format/AddTripSheet/Expenses/Gallery/Itinerary/Journal）；PDF 匯出對使用者輸入補 esc() 轉義防 self-XSS；id 產生器改 uid()（時間戳+隨機尾碼）防快速連點撞號。建議級：Summary/Itinerary 依 :id 重置 local state。build 驗證通過
- 為什麼：使用者要求先做 code review；frontend-engineer 審查發現資料一致性與崩潰風險

## 2026-06-17 09:21
- 範圍：lib/settings.js（新）、screens/StubScreen.jsx、styles/global.css、lib/settle.js、components/AddExpenseSheet.jsx、components/AddTripSheet.jsx、screens/CompanionsScreen.jsx、screens/HomeScreen.jsx
- 做了什麼：把「我的」頁從 placeholder 升級成真設定頁。新增 lib/settings.js：getProfile/setProfile（個人資料 name/avatar，key yotrip:profile:v1，預設名艾登）、getPrefs/setPrefs（偏好 currency/notifications，key yotrip:prefs:v1）、getMe（以 profile 名字覆寫 seed ME，作為分帳「我」的單一來源）、CURRENCY_OPTIONS。StubScreen 改為 Apple HIG 分組清單：個人資料卡（頭像 + 名字，就地編輯名字/換頭像，沿用 lib/image）、外觀（深色模式 toggle）、偏好（新旅程預設幣別下拉、站內通知開關）、AI（API key 區塊保留）、資料與 App（安裝 / 重設）、關於；移除原本的 placeholder 版面與不再使用的 kind/MAP 分支。串接：settle.js / AddExpenseSheet 改用 getMe()、CompanionsScreen 成員「我」顯示 profile 名字與頭像、首頁問候改讀 profile.name、新增旅程預設幣別讀 prefs.currency、首頁鈴鐺 badge 與面板受通知開關控制。global.css 加 profile-card / set-group / set-row / toggle 等樣式。build 驗證通過
- 為什麼：使用者要求把半成品的「我的」頁做成可用的個人資料 + 設定頁，並讓個人資料串起首頁與分帳

## 2026-06-17 08:52
- 範圍：lib/ai.js、lib/aiMock.js、screens/SummaryScreen.jsx、screens/StubScreen.jsx、styles/global.css、package.json
- 做了什麼：新增第一個 AI 功能「旅程總結文案」。lib/aiMock.js 純函式 mockRecap 依旅程與彙整統計產出 3-5 句繁中回顧（deterministic seed 控制開場句變化、稀疏資料保底 3 句、無外部相依）。lib/ai.js 為單一入口，依 localStorage 是否有 API key 分派：有 key 用 @anthropic-ai/sdk 瀏覽器直連串流呼叫 claude-opus-4-8（typed error 映射成友善訊息、失敗不退回模擬），無 key 用 mockRecap 並以 onDelta 模擬逐字串流；key 存 yotrip:ai:v1、結果存 yotrip:airecap:v1（per trip）。SummaryScreen 加「AI 旅程回顧」卡（生成 / 重新生成、Claude/範例來源 badge、串流顯示、錯誤紅字、結果持久化）。StubScreen（我的）加「AI 設定」（password 輸入 / 儲存 / 清除 + 安全警語）。global.css 的 .field input 樣式補上 type=password。新增相依 @anthropic-ai/sdk（bundle js 299→459KB，原型可接受）
- 為什麼：使用者要求做 AI 功能，第一項為旅程總結文案

## 2026-06-14 07:39
- 範圍：專案骨架、design-outline.html
- 做了什麼：建立專案資料夾與 git，新增 README.md、CLAUDE.md、CHANGELOG.zh.md、.gitignore；產出第一版標註式設計大綱 design-outline.html，涵蓋設計系統、資訊架構、所有功能模組、資料模型草稿與開發階段建議
- 為什麼：依需求建立旅遊規劃 App 專案，先以結構化標註大綱定義範圍與設計基調，作為後續實作依據

## 2026-06-14 07:48
- 範圍：專案資料夾、README.md、CLAUDE.md、CHANGELOG.zh.md、design-outline.html
- 做了什麼：專案名稱由 travel-planner 改為 yotrip，建立新資料夾 yotrip 並複製檔案、重新 git init，更新各檔標題為 yotrip
- 為什麼：使用者要求改名為 yotrip

## 2026-06-14 09:27
- 範圍：整個 React + Vite 專案（package.json、vite.config、index.html、src/）
- 做了什麼：建立 MVP 高保真互動原型。包含設計系統（tokens.css 暖色票 / 16px 圓角 / 柔和陰影、global.css）、HashRouter 路由、底部導航；5 個 MVP 畫面：首頁儀表板（搜尋/排序/篩選/收藏）、旅程總覽（hero/天氣/預算/統計/快速入口）、行程時間軸（日切換/空檔計算/衝突警示）、記帳（圓餅+長條+趨勢圖/多幣別/明細）、預算（環形進度/分級警示/分類支出）；以京都・大阪 5 日遊假資料貫穿。npm run build 與 dev server 皆驗證通過
- 為什麼：使用者選擇以 React + Vite 形式做 MVP 高保真原型

## 2026-06-14 09:43
- 範圍：src/store.jsx（新）、src/components/AddExpenseSheet.jsx（新）、main.jsx、App.jsx、global.css、HomeScreen / TripOverviewScreen / ExpensesScreen / BudgetScreen
- 做了什麼：把「快速記一筆」從 alert 示意改成真表單。新增輕量 Context store 管理各旅程支出；底部彈出 sheet 含金額數字鍵盤、分類選擇、項目/地點/日期欄位；送出後寫入 store，記帳明細與圓餅/長條/趨勢圖、總支出/每日/每人/剩餘統計、預算環形與分級警示、首頁與總覽的已花/剩餘皆即時連動更新。build 驗證通過
- 為什麼：使用者選擇 (a) 把某畫面的新增/編輯做成真功能

## 2026-06-14 09:47
- 範圍：src/store.jsx、src/screens/StubScreen.jsx
- 做了什麼：store 加上 localStorage 持久化（key `yotrip:expenses:v1`）——啟動時優先讀 localStorage，沒有或解析失敗才用種子資料；每次支出變動寫回。新增 reset() 並在「我的」頁加「重設為範例資料」按鈕（含確認）。build 驗證通過
- 為什麼：使用者要求重整後資料不流失

## 2026-06-14 09:53
- 範圍：src/store.jsx、src/components/AddTripSheet.jsx（新）、App.jsx、HomeScreen / TripsScreen / TripOverviewScreen / ItineraryScreen / ExpensesScreen / BudgetScreen / AddExpenseSheet
- 做了什麼：把「新增旅程」從 alert 改成真功能，完成 MVP 的旅程 CRUD。store 改為管理自建旅程（與種子合併）並持久化到 localStorage（key `yotrip:trips:v1`）；新增 AddTripSheet 底部表單（旅程名稱、國家/城市、開始/結束日、主幣別下拉、總預算、封面漸層色五選一，天數與狀態依日期自動計算）。首頁 FAB 與旅程頁＋鈕開啟表單，建立後導向該旅程總覽。所有畫面改從 store 取 trips/getTrip，使新旅程全程可見。reset 一併清除自建旅程。build 驗證通過
- 為什麼：補上 MVP 核心缺口——原本無法真正建立旅程

## 2026-06-14 09:58
- 範圍：src/store.jsx、src/components/AddTripSheet.jsx、src/screens/TripOverviewScreen.jsx
- 做了什麼：補齊旅程編輯與刪除。AddTripSheet 改為新增/編輯共用——依 tripSheet.editId 預填欄位、標題與按鈕切換、儲存時呼叫 editTrip。旅程總覽 hero 的「⋯」改開底部動作選單（編輯旅程 / 刪除旅程，刪除含確認）。store 新增 editTrip / deleteTrip / isCustom；種子旅程不可變，改用 overrides（覆寫欄位）與 deleted（隱藏）處理，持久化資料結構升級為 { custom, overrides, deleted } 存於新 key `yotrip:trips:v2`；刪除旅程會一併清掉其記帳。build 驗證通過
- 為什麼：使用者選擇 (a) 旅程編輯/刪除

## 2026-06-14 10:04
- 範圍：src/data/seed.js、src/store.jsx、src/screens/PrepScreen.jsx（新）、App.jsx、TripOverviewScreen.jsx、global.css
- 做了什麼：實作行前準備中心（大綱第二批）。新增 PrepScreen，三分頁——待辦（含優先級、截止日）、打包（依證件/衣物/電子/盥洗/藥品分組）、購物（品名/數量/單價、預估總額）；每項可勾選、可新增、可刪除，頂部有完成進度條。route `/trip/:id/prep`，旅程總覽「清單」快速入口接上。store 加 prep 狀態與 getPrep/togglePrep/addPrep/removePrep，持久化 key `yotrip:prep:v1`；種子含京都完整清單，新旅程套用 prepTemplate 起手範本，刪除旅程一併清掉其清單。build 驗證通過
- 為什麼：使用者選擇 (a) 行前準備清單

## 2026-06-14 10:08
- 範圍：src/store.jsx、src/components/ItinSheet.jsx（新）、src/screens/ItineraryScreen.jsx、App.jsx
- 做了什麼：把行程時間軸的新增/編輯/刪除做成真功能。行程資料從 seed 移入 store 並持久化（key `yotrip:itinerary:v1`）；新增 ItinSheet 表單（標題、5 種分類、開始/結束時間、地點、備註、預估花費，編輯時可刪除）。ItineraryScreen 改從 store 讀，日期軸改依旅程天數產生（新旅程也能排程）、項目依時間排序、空狀態提示、點卡片進編輯、＋與「加行程」開新增、「複製到隔天」實作。store 加 getItinerary/addItin/editItin/removeItin/copyItinDay，刪除旅程一併清掉行程。build 驗證通過
- 為什麼：使用者選擇 (a) 行程時間軸新增/編輯做成真表單

## 2026-06-14 10:16
- 範圍：src/data/seed.js、src/store.jsx、src/components/PlaceSheet.jsx（新）、src/components/ItinSheet.jsx、src/components/Icon.jsx、src/screens/PlacesScreen.jsx（新）、App.jsx、TripOverviewScreen.jsx
- 做了什麼：實作地點庫。新增 PlacesScreen，可依類型（景點/餐廳/咖啡/商場）與標籤（必去/替代/已完成）雙重篩選，每張地點卡含評分星等、備註、Google Maps 連結與「加入行程」按鈕；PlaceSheet 表單支援新增/編輯/刪除（名稱、類型、標籤、星等、備註、Maps）。route `/trip/:id/places`，總覽「地點」入口接上。store 加 places 狀態與 getPlaces/addPlace/editPlace/removePlace，持久化 key `yotrip:places:v1`；ItinSheet 加 prefill 參數，地點「加入行程」一鍵帶名稱/分類/地點/備註進時間軸。Icon 補 coffee。種子含京都 8 個地點。build 驗證通過
- 為什麼：使用者選擇 (a) 地點庫

## 2026-06-14 10:35
- 範圍：旅遊日誌、機票/住宿、地圖（src/data/seed.js、src/store.jsx、src/lib/markdown.js 新、多個新 screen/component、App.jsx、TripOverviewScreen.jsx、global.css）
- 做了什麼：一次完成三模組。
  1. 旅遊日誌：JournalScreen（依日期時間軸、心情 emoji、Markdown 內文預覽 clamp）＋ JournalSheet 編輯器（日期/心情/標題/Markdown，可切換編輯與即時預覽）；新增 lib/markdown.js 極簡渲染器（標題/粗體/斜體/清單/段落）。route /trip/:id/journal。
  2. 機票/住宿：LogisticsScreen（機票/住宿分頁，登機證式航班卡含起降/航廈/座位/行李、住宿明細卡含訂房號/電話/入退房/價格/官網）＋ FlightSheet/StaySheet 新增/編輯/刪除；route /trip/:id/logistics?tab=flight|stay，總覽新增「機票」「住宿」兩個快速入口。
  3. 地圖：MapScreen 取代原 map 佔位，暖色抽象示意底圖 + 地點標記（依類型上色）+ 可選某天畫出當日路線、估算距離與時間、下方對應清單；綁定進行中旅程，並明確標註正式版需接 Google Maps/Mapbox。
  全部資料進 store 持久化（journal/flights/stays 各自 key），刪除旅程一併清掉。三次 build 皆驗證通過。
- 為什麼：使用者要求 a→b→c 連續完成（日誌、機票住宿、地圖）

## 2026-06-14 10:51
- 範圍：src/screens/SummaryScreen.jsx（新）、App.jsx、TripOverviewScreen.jsx、global.css
- 做了什麼：實作旅程總結。SummaryScreen 自動彙整各模組資料（總天數、總花費、每日平均、景點/餐廳/商場數、造訪地點、完成行程數、照片、日誌篇數與平均心情、最常花費分類、最愛地點 rating>=5），產出社群分享風格的報告卡（gradient/封面底、大數字總花費、4 格統計、最愛地點區塊、頁尾品牌），下方另有詳細數據卡與最愛地點清單。分享鈕用 navigator.share，不支援時複製文字到剪貼簿；匯出圖片/PDF 為示意（待接進階）。route /trip/:id/summary，旅程總覽新增「旅程總結報告卡」入口（completed 旅程以主色描邊強調）。build 驗證通過
- 為什麼：使用者選擇旅程總結

## 2026-06-14 10:59
- 範圍：public/manifest.webmanifest（新）、public/icon.svg（新）、public/icon-maskable.svg（新）、public/sw.js（新）、index.html、src/main.jsx、src/screens/StubScreen.jsx
- 做了什麼：加入 PWA 支援，不引入額外套件。新增 web manifest（standalone、暖色主題、SVG 圖示含 maskable）；自寫 service worker 做 app shell 離線快取——install 預快取核心檔、SPA 導航網路優先離線退回 index.html、同源資源 cache-first 並背景更新、跨網域（Google Fonts/Unsplash）交瀏覽器處理。index.html 接上 manifest 與 apple-touch / 狀態列 meta；main.jsx 僅在 production 註冊 SW（避免干擾 vite dev）。「我的」頁新增「安裝到主畫面」按鈕（攔截 beforeinstallprompt）與已安裝狀態偵測。build 後 dist 正確輸出 manifest/icons/sw.js
- 為什麼：使用者要求 PWA 支援

## 2026-06-14 11:21
- 範圍：src/screens/HomeScreen.jsx
- 做了什麼：首頁狀態篩選 chip 把「規劃中」與「進行中」對調，順序改為 全部／規劃中／進行中／已完成／收藏
- 為什麼：使用者要求兩者交換位置

## 2026-06-14 11:25
- 範圍：CLAUDE.md（本專案）、全域 Desktop\claude\CLAUDE.md
- 做了什麼：移除專案 CLAUDE.md 底部的 `## Change Log` 區塊（之後變更只記在本檔），並更新「現況」；全域偏好的「新專案初始化」第 3 點移除「底部留 Change Log 區塊」
- 為什麼：使用者要求不再維護專案 CLAUDE.md 的 Change Log

## 2026-06-14 11:46
- 範圍：相簿、同行者分帳、深色模式（seed.js、store.jsx、多個新 screen/component、lib/settle.js、lib/theme.js、tokens.css、global.css、main.jsx、AddExpenseSheet.jsx、TripOverviewScreen.jsx、StubScreen.jsx、Icon.jsx、App.jsx）
- 做了什麼：
  1. 相簿 Photo Gallery：GalleryScreen 依日分組 + CSS masonry 瀑布流 + 大圖 lightbox（說明、地點標籤、刪除），PhotoSheet 新增（日期/說明/地點/圖片連結，無連結用色塊），照片載入失敗退回漸層。store 加 photos（key yotrip:photos:v1）；總覽加「相簿」入口。
  2. 同行者分帳 Companions：CompanionsScreen 成員清單 + 分帳結算（每人淨額 + 最少筆數還款建議，lib/settle.js），CompanionSheet 新增/編輯/刪除；記帳表單 AddExpenseSheet 加「付款人 / 分攤對象」選擇與「均分全部」。store 加 companions（key yotrip:companions:v1），種子兩位同行者 + 三筆有分攤的支出；總覽加「同行者與分帳」入口。
  3. 深色模式：lib/theme.js（getTheme/applyTheme，寫 data-theme 與 meta theme-color、存 yotrip:theme），tokens.css 加暖色深色 token 覆寫，global.css 修正 chip/daypill 反白與 stage/nav/weather/map/search 深色覆寫；main.jsx 啟動套用；「我的」頁加深淺切換鈕（moon/sun 圖示）。
  三次 build 皆驗證通過。
- 為什麼：使用者選擇依序開發 1 相簿 → 2 同行者分帳 → 3 深色模式

## 2026-06-14 12:07
- 範圍：純前端五項（lib/image.js、lib/rates.js、lib/exporters.js 皆新增；store.jsx、多個 sheet/screen）
- 做了什麼：
  1. 照片上傳：新增 lib/image.js（檔案 → canvas 縮放壓縮成 dataURL，避免 localStorage 爆），接到相簿 PhotoSheet、地點 PlaceSheet（地點卡顯示縮圖）、同行者 CompanionSheet（頭像）、新增/編輯旅程 AddTripSheet（封面照片，搭配備用漸層）。
  2. 匯率換算：新增 lib/rates.js（以 TWD 為基準的靜態匯率表 + convert/toHome/symbolOf），記帳頁加匯率換算彈窗（金額 + 來源/目標幣別 + 互換），記帳「總支出」與預算「總預算」顯示 ≈ NT$ 等值。
  3. 封存入口：旅程總覽「⋯」加封存 / 取消封存（用 editTrip 寫 archived），首頁加「封存」篩選 chip 檢視已封存旅程。
  4. 拖曳排序：store 加 reorderPrep，行前準備「待辦 / 購物」清單支援 HTML5 拖曳重排（含拖曳把手與半透明回饋；觸控裝置需後續補 pointer 版）。
  5. PDF/Excel 匯出：新增 lib/exporters.js（CSV 帶 UTF-8 BOM、開新視窗列印 HTML 供另存 PDF），旅程總結「匯出」改為選單：記帳 CSV / 行程 CSV / 旅程報告 PDF。
  build 驗證通過（71 modules）。
- 為什麼：使用者要求把純前端可做的（匯出、匯率換算、封存入口、拖曳排序、照片上傳）一次做掉

## 2026-06-15 19:55
- 範圍：HomeScreen.jsx、TripsScreen.jsx
- 做了什麼：修正新增旅程失效的 bug。首頁 FAB 與旅程分頁「+」鈕原本把 openTripSheet 直接當 onClick，導致 click event 被當成 editId 傳入（truthy），新增旅程誤判為編輯模式（顯示「編輯旅程／儲存變更」），送出時走 editTrip 並以事件物件當 key 寫入 overrides，旅程從未真正建立、各清單皆不顯示。改為 onClick={() => openTripSheet()}
- 為什麼：使用者回報按 + 新增旅程後不會出現在任何清單

## 2026-06-15 20:00
- 範圍：styles/global.css（.app）
- 做了什麼：修正內容過長時底部導航與 FAB 跟著頁面捲走的問題。.app 由 min-height 改為固定 height（手機 100vh、桌機 calc(100vh - 56px)），讓 .scroll 成為唯一的內部捲動容器，position:absolute 的 .bottomnav 與 .fab 因此固定貼齊視窗底部
- 為什麼：使用者回報頁面太長時，捲到最上方看不到最下方的 nav 列與 + 按鈕

## 2026-06-15 20:02
- 範圍：screens/HomeScreen.jsx
- 做了什麼：刪除首頁標題 h1「你的旅程」
- 為什麼：使用者要求移除

## 2026-06-15 20:08
- 範圍：screens/TripsScreen.jsx
- 做了什麼：旅程分頁加入與首頁一致的篩選 chips（全部 / 規劃中 / 進行中 / 已完成 / 收藏 / 封存）。收藏以 t.favorite 判斷、封存切換顯示已封存旅程；加上「找不到符合的旅程」空狀態；底部「已封存的旅程會收在這裡」提示改為僅在非封存檢視時顯示
- 為什麼：使用者要求旅程頁也要能依狀態篩選

## 2026-06-15 20:14
- 範圍：store.jsx、screens/HomeScreen.jsx
- 做了什麼：收藏狀態收進 store 並持久化。store 新增 toggleFav(id)（透過既有 editTrip 寫 favorite，種子走 overrides、自建原地更新，隨 TRIP_KEY 存進 localStorage）。HomeScreen 移除原本的暫存 favs Set 與本地 toggleFav，改用旅程的 t.favorite 欄位顯示與篩選、點星呼叫 store.toggleFav。TripsScreen 的收藏篩選本就讀 t.favorite，現自動與首頁一致
- 為什麼：原本首頁收藏只存在頁面暫存狀態、重整即失，且與旅程頁的 favorite 欄位不一致

## 2026-06-15 20:18
- 範圍：screens/HomeScreen.jsx
- 做了什麼：修正進行中旅程封存後仍顯示在首頁的問題。首頁「進行中」hero 大卡的 ongoing 取值由 find(status==='ongoing') 改為 find(status==='ongoing' && !archived)
- 為什麼：原本 ongoing 未排除已封存旅程，封存後雖從清單消失，hero 大卡仍會撈出顯示

## 2026-06-15 20:30
- 範圍：screens/TripsScreen.jsx、screens/HomeScreen.jsx
- 做了什麼：刪除旅程頁誤導的「已封存的旅程會收在這裡」提示文字（封存改僅由篩選 chip 檢視，採方案 1）。兩頁 FILTERS 將「收藏」移到第一位，且收藏 chip 只顯示星號、不顯示文字（加 aria-label="收藏" 維持無障礙）
- 為什麼：使用者選擇方案 1（封存只用 chip、不做底部封存區），並要求收藏置首且只留星號，首頁與旅程頁一致

## 2026-06-15 20:45
- 範圍：screens/HomeScreen.jsx、screens/TripsScreen.jsx
- 做了什麼：解決首頁與旅程頁功能重複。(1) 首頁「所有旅程」小卡全部加上預算進度條（沿用 MiniBudget，已花/剩餘 + 進度條），不分狀態。(2) 旅程 tab 改為直接重導向目前旅程：優先進行中、其次最近即將出發（規劃中依出發日最近），兩者皆無時才退回原本的篩選清單；用 <Navigate replace> 實作
- 為什麼：兩頁原本都是帶篩選的旅程清單、功能重疊，依使用者決定讓首頁當總覽、旅程 tab 當「直接進入當前旅程」的捷徑

## 2026-06-15 20:52
- 範圍：components/BottomNav.jsx
- 做了什麼：旅程詳情頁（/trip/:id 及其子頁）讓底部「旅程」tab 顯示為 active。isActive 改為接收 tab 物件，trips tab 額外匹配 /trips 與 /trip/ 開頭路徑
- 為什麼：旅程 tab 改成直接進入當前旅程後，停在 /trip/:id 時底部導航沒有任何 tab 亮起，使用者要求當前旅程頁也算 active

## 2026-06-15 20:58
- 範圍：styles/global.css（.trip-card.small）
- 做了什麼：小卡 min-height 由 150px 提高為 190px
- 為什麼：小卡加入預算進度條後 body 變高往上頂，國家城市那行被擠到與左上角狀態標籤重疊

## 2026-06-15 21:08
- 範圍：screens/HomeScreen.jsx
- 做了什麼：(1) 小卡已完成旅程不再顯示「已結束」灰字（移除底部該欄）。(2) 規劃中旅程的「出發倒數 X 天」移到左上角狀態標籤旁，以半透明深底白字 chip 呈現。(3) MiniBudget 進度條依使用率配色：<50% 綠（--accent）、50–85% 橘（--amber）、≥85% 紅（--danger），同時套用於首頁小卡與進行中 hero
- 為什麼：使用者要求調整小卡資訊呈現與預算條配色

## 2026-06-15 21:18
- 範圍：lib/format.js、screens/HomeScreen.jsx（間接）、TripOverviewScreen.jsx、TripsScreen.jsx、BudgetScreen.jsx
- 做了什麼：(1) countdown() 倒數文字由「出發倒數 X 天」改為「倒數 X 天」（僅小卡規劃中 chip 使用）。(2) 統一所有預算進度條/環形配色為 <50% 綠、50–85% 橘、≥85% 紅：TripOverviewScreen 預算進度與百分比、TripsScreen 清單卡進度條（原僅綠/紅，補橘）、BudgetScreen 環形
- 為什麼：使用者要求統一閾值為 50/85，倒數文字精簡

## 2026-06-15 21:26
- 範圍：data/seed.js（BUDGET_ALERTS）、screens/BudgetScreen.jsx
- 做了什麼：預算提醒級距對齊 50/85 配色。BUDGET_ALERTS 由 50/75/90/100 改為 50（已使用一半，橘）/85（即將超支，紅）/100（已超支，紅），移除 75 級距、50% 顏色由綠改橘；BudgetScreen 級距說明文字的觸發判斷同步改為 100/85/50
- 為什麼：使用者要求把預算級距文字與清單一併對齊新的 50/85 進度條配色，避免畫面內 75/90 與 50/85 不一致

## 2026-06-15 21:55
- 範圍：screens/TripOverviewScreen.jsx、MapScreen.jsx、ExpensesScreen.jsx、HomeScreen.jsx、components/AddExpenseSheet.jsx、store.jsx、App.jsx
- 做了什麼：補上四個「點了沒反應」的入口。
  1. 旅程總覽分享鈕：接 Web Share API（navigator.share），不支援時複製旅程資訊到剪貼簿
  2. 快速入口「地圖」：改導向該趟專屬 /trip/:id/map；新增該路由；MapScreen 讀 useParams id 決定旅程（無則退回進行中/第一筆）
  3. 記帳明細可編輯/刪除：store 加 editExpense/removeExpense、add 狀態加 editId、openAdd 加 editId 參數；AddExpenseSheet 支援編輯模式（帶入既有資料、儲存變更、刪除）；ExpensesScreen 點單筆改開編輯（原為 alert 示意）
  4. 首頁鈴鐺：改為通知面板（底部 sheet），由現有資料導出出發倒數、進行中、預算達 50/85/100 提醒；鈴鐺顯示未讀數紅點 badge，點通知跳對應旅程
- 為什麼：使用者要求先把點了沒反應的小坑補起來

## 2026-07-19 09:10
- 範圍：package.json、package-lock.json、index.html、public/manifest.webmanifest、public/sw.js、CLAUDE.md、README.md、design-outline.html、src/store.jsx、src/lib/ai.js、src/lib/settings.js、src/lib/theme.js、src/screens/StubScreen.jsx、src/screens/SummaryScreen.jsx
- 做了什麼：專案名稱由 yotrip 改為 luyo。更新所有標題/顯示文字、package name、manifest、service worker cache 名稱（yotrip-cache-v1 → luyo-cache-v1），並將 localStorage key 前綴由 `yotrip:` 改為 `luyo:`（經確認後一併更動，代表瀏覽器內既有 yotrip: 開頭的資料不會被新版讀到）。CHANGELOG.zh.md 過去條目與 docs/superpowers 底下的歷史規劃/設計文件維持原樣不動
- 為什麼：使用者要求專案改名為 luyo

## 2026-07-19 10:36
- 範圍：src/styles/global.css、src/components/BottomNav.jsx
- 做了什麼：修手機版三個版面問題。根因是 `.app` 用 `height: 100vh`——手機瀏覽器 100vh 是網址列收起後的最大視口，網址列在時 app 比可視區高、外層 body 可滑動且露出白底，底部 nav 也跟著被推出可視區。修法：`.app` 高度補 `100dvh`（保留 100vh 當舊瀏覽器 fallback，桌機媒體查詢同步補 `calc(100dvh - 56px)`）、`html/body` 加 `overflow: hidden` 與 `overscroll-behavior: none` 鎖外層捲動、`html` 補 canvas 背景色避免橡皮筋過捲露白。另把底部 nav icon 由 22 調大到 26、文字由 10.5px 調到 11px。build 驗證通過
- 為什麼：使用者回報部署後手機上「上下有白色滑動空間、底部 nav 沒固定、icon 太小」
