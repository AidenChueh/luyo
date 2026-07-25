import { supabase } from './supabase'

export async function fetchState(userId) {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? data.data : null
}

export async function pushState(userId, data) {
  const { error } = await supabase
    .from('app_state')
    .upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
