// 極簡 Markdown → HTML，足夠日誌使用（標題 / 粗體 / 斜體 / 清單 / 段落）
export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

export function renderMarkdown(src = '') {
  const lines = src.split('\n')
  const out = []
  let list = null
  const closeList = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null } }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^###\s+/.test(line)) { closeList(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`) }
    else if (/^##\s+/.test(line)) { closeList(); out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`) }
    else if (/^#\s+/.test(line)) { closeList(); out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`) }
    else if (/^[-*]\s+/.test(line)) { (list ||= []).push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`) }
    else if (line.trim() === '') { closeList() }
    else { closeList(); out.push(`<p>${inline(line)}</p>`) }
  }
  closeList()
  return out.join('')
}
