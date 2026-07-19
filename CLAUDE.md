# luyo — 專案脈絡

## 專案目標

個人旅遊規劃 App。一站式管理旅程的規劃、執行、記錄與回顧。

## 設計約束（必須遵守）

- 設計原則：Apple Human Interface Guidelines，強調直覺導航與無障礙
- 視覺風格：Airbnb + Google Travel + Notion 混搭，放鬆、乾淨、專業的旅遊感
- 不可出現明顯的 AI 生成設計元素
- 暖色系配色、16px 圓角、柔和陰影
- Mobile-first 響應式
- 底部導航：Home / Trips / Map / Expenses / Profile

## 範圍

首頁儀表板、旅程總覽、行程規劃、地圖、記帳、預算、日誌、相簿、行前準備、機票、住宿、地點庫、同行者、旅程總結、AI 功能、進階功能（離線 / PWA / 雲端同步等）。

## 版號慣例

- 每次 push 前，把 `src/screens/StubScreen.jsx`「關於」區的版號 +0.01（v1.01 → v1.02 → …），並在 CHANGELOG 該筆紀錄註明版號
- package.json 的 semver 版本不動，顯示版號以 StubScreen 為準

## 現況

- React + Vite 高保真互動原型開發中，資料以 localStorage 持久化。
- 變更紀錄見 `CHANGELOG.zh.md`。
