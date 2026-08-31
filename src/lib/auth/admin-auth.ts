import { createClient } from '@/lib/supabase/server'

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';

export async function requireAdminAccess(minRole: AdminRole = 'ADMIN') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  if (minRole === 'SUPER_ADMIN' && profile.role !== 'SUPER_ADMIN') {
    return null
  }

  if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
    return null
  }

  return { user, profile }
}
