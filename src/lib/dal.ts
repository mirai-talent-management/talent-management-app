import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  role: 'supporter' | 'staff'
  display_name: string
  email: string
  bio: string | null
  avatar_url: string | null
}

/**
 * Validates the current JWT (via getClaims, not getSession/getUser) and
 * returns the authenticated user id. Redirects to /login if unauthenticated.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims) {
    redirect('/login')
  }

  return { userId: data.claims.sub as string }
})

/**
 * Loads the current user's profile row (role, display name, etc).
 * RLS restricts this to the caller's own row, so no extra filtering here.
 */
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const { userId } = await verifySession()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, display_name, email, bio, avatar_url')
    .eq('id', userId)
    .single()

  if (error || !data) {
    // Should only happen if the on_auth_user_created trigger hasn't run yet.
    redirect('/login')
  }

  return data
})

/**
 * Use in Server Actions/Route Handlers that only staff may invoke.
 * Throws rather than redirecting, since callers are not always rendering a page.
 */
export async function requireStaff(): Promise<Profile> {
  const profile = await getCurrentProfile()

  if (profile.role !== 'staff') {
    throw new Error('Forbidden: staff role required')
  }

  return profile
}
