'use server'

import { revalidatePath } from 'next/cache'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { findOrCreateTag } from '@/lib/tags'

export async function submitEndorsement(formData: FormData) {
  const { userId } = await verifySession()
  const supporterId = String(formData.get('supporterId') ?? '')
  const name = String(formData.get('name') ?? '').trim()

  if (!supporterId || !name || supporterId === userId) return

  const supabase = await createClient()
  const tagId = await findOrCreateTag(supabase, 'skill', name)
  if (!tagId) return

  await supabase.from('skill_endorsements').insert({
    supporter_id: supporterId,
    endorser_id: userId,
    tag_id: tagId,
  })

  revalidatePath('/supporter/endorse')
}
