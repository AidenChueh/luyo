import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const AuthCtx = createContext(null)

const zh = (msg) => {
  const m = String(msg || '')
  if (/at least 6|Password should be/i.test(m)) return '密碼至少 6 個字'
  if (/already registered|already exists/i.test(m)) return '這個 email 已經註冊過了'
  if (/Invalid login credentials/i.test(m)) return '帳號或密碼錯誤'
  if (/Unable to validate email|invalid.*email/i.test(m)) return 'email 格式不正確'
  if (/network|fetch/i.test(m)) return '網路連線有問題，請稍後再試'
  return m || '發生錯誤，請再試一次'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) }).catch(() => setLoading(false))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error ? zh(error.message) : null }
  }
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? zh(error.message) : null }
  }
  const signOut = async () => { await supabase.auth.signOut() }

  return (
    <AuthCtx.Provider value={{ session, user: session?.user || null, loading, signUp, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 內')
  return ctx
}
