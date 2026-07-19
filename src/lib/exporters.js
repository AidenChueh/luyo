// 純前端匯出：CSV（Excel 可開）與 列印/存 PDF
import { esc } from './markdown'

const download = (filename, text, type) => {
  const blob = new Blob(['﻿' + text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCSV = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\n')

export const exportCSV = (filename, rows) => download(filename, toCSV(rows), 'text/csv;charset=utf-8')

export const exportExpensesCSV = (trip, expenses) => {
  const rows = [['日期', '分類', '項目', '地點', `金額(${trip.currency})`, '付款人', '分攤人數']]
  for (const e of expenses) rows.push([e.date, e.cat, e.title, e.loc || '', e.amt, e.payer || 'me', (e.split || ['me']).length])
  exportCSV(`${trip.name}-記帳.csv`, rows)
}

export const exportItineraryCSV = (trip, itin) => {
  const rows = [['天', '開始', '結束', '分類', '標題', '地點', '預估', '備註']]
  Object.keys(itin).sort().forEach((d) => {
    ;[...itin[d]].sort((a, b) => a.start.localeCompare(b.start)).forEach((it) => {
      rows.push([d, it.start, it.end, it.cat, it.title, it.loc || '', it.est || 0, it.note || ''])
    })
  })
  exportCSV(`${trip.name}-行程.csv`, rows)
}

// 開新視窗、寫入乾淨 HTML、呼叫列印（使用者可選「另存 PDF」）
export const printHTML = (title, bodyHtml) => {
  const w = window.open('', '_blank')
  if (!w) { alert('請允許彈出視窗以列印 / 匯出 PDF'); return }
  w.document.write(`<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    body{font-family:'Noto Sans TC',-apple-system,sans-serif;color:#1C1917;max-width:720px;margin:0 auto;padding:40px 28px;line-height:1.7}
    h1{font-size:24px;margin:0 0 4px} .sub{color:#78716C;font-size:13px;margin-bottom:20px}
    h2{font-size:16px;border-bottom:1px solid #E7E5E4;padding-bottom:6px;margin:24px 0 10px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0}
    th,td{border:1px solid #E7E5E4;padding:6px 9px;text-align:left}
    th{background:#F5F5F4}
    .big{font-size:28px;font-weight:700} .grid{display:flex;gap:24px;flex-wrap:wrap;margin:8px 0}
    .grid div b{display:block;font-size:22px}
    @media print{body{padding:0}}
  </style></head><body>${bodyHtml}
  <script>window.onload=()=>{window.print()}<\/script></body></html>`)
  w.document.close()
}
