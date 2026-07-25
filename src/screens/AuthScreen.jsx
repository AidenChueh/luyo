import { useState } from 'react'
import Icon from '../components/Icon'
import { useAuth } from '../auth'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!email.trim() || !pw) { setErr('請填 email 和密碼'); return }
    if (mode === 'signup' && pw.length < 6) { setErr('密碼至少 6 個字'); return }
    setBusy(true)
    const fn = mode === 'signin' ? signIn : signUp
    const { error } = await fn(email.trim(), pw)
    setBusy(false)
    if (error) setErr(error)
  }

  return (
    <div className="stage">
      <div className="app auth-app" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--primary)' }}>luyo</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>你的旅程，登入後隨你走</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>密碼</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={mode === 'signup' ? '至少 6 個字' : '密碼'} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          </div>
          {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{err}</div>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 16, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
            <Icon name={mode === 'signin' ? 'user' : 'plus'} size={18} /> {busy ? '請稍候…' : mode === 'signin' ? '登入' : '註冊'}
          </button>
        </div>
        <button className="btn btn-block" style={{ marginTop: 14 }} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr('') }}>
          {mode === 'signin' ? '還沒有帳號？註冊一個' : '已經有帳號了？去登入'}
        </button>
      </div>
    </div>
  )
}
