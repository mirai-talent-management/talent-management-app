import { redirect } from 'next/navigation'

import { getCurrentProfile } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const profile = await getCurrentProfile()

  if (profile.role === 'staff') {
    redirect('/staff')
  }

  const supabase = await createClient()
  const { data: supporterProfile } = await supabase
    .from('supporter_profiles')
    .select('profile_id')
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!supporterProfile) {
    redirect('/onboarding/profile')
  }

  redirect('/supporter')
}
