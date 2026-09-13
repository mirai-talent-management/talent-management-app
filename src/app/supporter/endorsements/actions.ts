'use server'

import { revalidatePath } from 'next/cache'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

export async function approveEndorsement(formData: FormData) {
  await verifySession()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase.rpc('approve_endorsement', { p_endorsement_id: id })

  revalidatePath('/supporter/endorsements')
  revalidatePath('/supporter/skills')
}

export async function rejectEndorsement(formData: FormData) {
  await verifySession()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase.rpc('reject_endorsement', { p_endorsement_id: id })

  revalidatePath('/supporter/endorsements')
}
