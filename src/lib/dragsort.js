import { useRef, useState } from 'react'

// 用 pointer 事件而非 HTML5 draggable：後者在 iOS / Android 觸控上完全不觸發
export function useDragSort(ids, onReorder) {
  const [dragId, setDragId] = useState(null)
  const st = useRef({ id: null, order: null, moved: false, until: 0 })

  const begin = (id) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    st.current = { id, order: [...ids], moved: false, until: 0 }
    setDragId(id)
  }

  const move = (e) => {
    const s = st.current
    if (!s.id) return
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-dragid]')?.dataset?.dragid
    if (!over || over === s.id) return
    const from = s.order.indexOf(s.id)
    const to = s.order.indexOf(over)
    if (from < 0 || to < 0) return
    s.order.splice(to, 0, ...s.order.splice(from, 1))
    s.moved = true
    onReorder([...s.order])
  }

  const end = () => {
    const s = st.current
    s.until = s.moved ? Date.now() + 400 : 0
    s.id = null
    s.order = null
    setDragId(null)
  }

  return {
    dragId,
    // 拖曳結束後瀏覽器仍會補發一次 click，用時間窗擋掉避免誤開編輯
    justDragged: () => Date.now() < st.current.until,
    handle: (id) => ({
      onPointerDown: begin(id),
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: end,
      onClick: (e) => e.stopPropagation(),
      style: { touchAction: 'none', cursor: 'grab' },
    }),
    item: (id) => ({ 'data-dragid': id, style: { opacity: dragId === id ? 0.45 : 1 } }),
  }
}
