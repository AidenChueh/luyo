// 開啟檔案選擇器，讀圖後縮放壓縮成 dataURL（避免 localStorage 爆掉）
export function pickImage(onResult, { max = 760, quality = 0.72, onError } = {}) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onerror = () => onError?.('讀取檔案失敗，請再試一次。')
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => onError?.('這個圖片格式無法讀取，請改用 JPG 或 PNG。')
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        try { onResult(canvas.toDataURL('image/jpeg', quality)) }
        catch { onResult(reader.result) }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
