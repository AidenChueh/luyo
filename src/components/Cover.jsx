import { useState } from 'react'

// 封面：Unsplash 照片為主，載入失敗時退回暖色漸層（不會出現破圖）。
export default function Cover({ src, gradient }) {
  const [ok, setOk] = useState(true)
  return (
    <>
      <div className="cover-fallback" style={{ background: gradient }} />
      {ok && src && (
        <div
          className="cover"
          style={{ backgroundImage: `url(${src})` }}
          role="img"
        >
          <img src={src} alt="" style={{ display: 'none' }} onError={() => setOk(false)} />
        </div>
      )}
      {(!ok || !src) && <div className="cover" style={{ background: 'transparent' }} />}
    </>
  )
}
