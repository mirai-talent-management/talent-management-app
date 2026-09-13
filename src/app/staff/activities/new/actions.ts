'use server'

import { redirect } from 'next/navigation'

import { requireStaff } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { findOrCreateTag } from '@/lib/tags'

export async function createActivity(formData: FormData) {
  const staff = await requireStaff()
  const supabase = await createClient()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  const startsAtRaw = String(formData.get('starts_at') ?? '')
  const requiredHeadcountRaw = String(formData.get('required_headcount') ?? '')
  const tagsRaw = String(formData.get('required_tags') ?? '')

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      title,
      description: String(formData.get('description') ?? '') || null,
      starts_at: startsAtRaw ? new Date(startsAtRaw).toISOString() : null,
      location: String(formData.get('location') ?? '') || null,
      recruitment_details: String(formData.get('recruitment_details') ?? '') || null,
      desired_persona: String(formData.get('desired_persona') ?? '') || null,
      required_headcount: requiredHeadcountRaw ? Number(requiredHeadcountRaw) : null,
      other_conditions: String(formData.get('other_conditions') ?? '') || null,
      created_by: staff.id,
    })
    .select('id')
    .single()

  if (error || !activity) {
    console.error('createActivity insert failed:', error)
    return
  }

  const tagNames = tagsRaw
    .split(/[,、]/)
    .map((name) => name.trim())
    .filter(Boolean)

  for (const name of tagNames) {
    const tagId = await findOrCreateTag(supabase, 'skill', name)
    if (tagId) {
      await supabase
        .from('activity_required_tags')
        .insert({ activity_id: activity.id, tag_id: tagId })
    }
  }

  redirect(`/staff/activities/${activity.id}`)
}
