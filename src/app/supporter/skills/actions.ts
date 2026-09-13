'use server'

import { revalidatePath } from 'next/cache'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { findOrCreateTag } from '@/lib/tags'

export async function addSelfSkill(formData: FormData) {
  const { userId } = await verifySession()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const supabase = await createClient()
  const tagId = await findOrCreateTag(supabase, 'skill', name)
  if (!tagId) return

  await supabase
    .from('supporter_skills')
    .insert({ supporter_id: userId, tag_id: tagId, source: 'self' })

  revalidatePath('/supporter/skills')
}

export async function removeSelfSkill(formData: FormData) {
  const { userId } = await verifySession()
  const skillId = String(formData.get('skillId') ?? '')
  if (!skillId) return

  const supabase = await createClient()
  await supabase
    .from('supporter_skills')
    .delete()
    .eq('id', skillId)
    .eq('supporter_id', userId)
    .eq('source', 'self')

  revalidatePath('/supporter/skills')
}

export async function addInterest(formData: FormData) {
  const { userId } = await verifySession()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const supabase = await createClient()
  const tagId = await findOrCreateTag(supabase, 'interest', name)
  if (!tagId) return

  await supabase
    .from('supporter_interests')
    .insert({ supporter_id: userId, tag_id: tagId })

  revalidatePath('/supporter/skills')
}

export async function removeInterest(formData: FormData) {
  const { userId } = await verifySession()
  const tagId = String(formData.get('tagId') ?? '')
  if (!tagId) return

  const supabase = await createClient()
  await supabase
    .from('supporter_interests')
    .delete()
    .eq('supporter_id', userId)
    .eq('tag_id', tagId)

  revalidatePath('/supporter/skills')
}
