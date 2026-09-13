import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TagType = 'skill' | 'interest'

export function normalizeTagName(name: string) {
  return name.trim().toLowerCase()
}

/**
 * Finds a tag by normalized name, creating it if it doesn't exist yet.
 * Tags are a predefined+free-add hybrid: anyone authenticated may add one.
 */
export async function findOrCreateTag(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  type: TagType,
  rawName: string
): Promise<string | null> {
  const name = rawName.trim()
  const normalized = normalizeTagName(name)
  if (!normalized) return null

  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('type', type)
    .eq('normalized_name', normalized)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('tags')
    .insert({ type, name, normalized_name: normalized })
    .select('id')
    .single()

  if (error) {
    // Likely a race with another insert of the same normalized name.
    const { data: retry } = await supabase
      .from('tags')
      .select('id')
      .eq('type', type)
      .eq('normalized_name', normalized)
      .maybeSingle()
    return retry?.id ?? null
  }

  return created.id
}
