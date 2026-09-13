'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

const ProfileSchema = z.object({
  display_name: z.string().trim().min(1, '表示名を入力してください。'),
  bio: z.string().trim().optional(),
  motivation_level: z.coerce.number().int().min(1).max(5),
  experience: z.string().trim().optional(),
  availability: z.string().trim().optional(),
})

export type OnboardingState = {
  status: 'idle' | 'error'
  message?: string
}

export async function saveOnboardingProfile(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { userId } = await verifySession()

  const parsed = ProfileSchema.safeParse({
    display_name: formData.get('display_name'),
    bio: formData.get('bio'),
    motivation_level: formData.get('motivation_level'),
    experience: formData.get('experience'),
    availability: formData.get('availability'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? '入力内容を確認してください。',
    }
  }

  const { display_name, bio, motivation_level, experience, availability } =
    parsed.data

  const supabase = await createClient()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name, bio: bio || null })
    .eq('id', userId)

  if (profileError) {
    return { status: 'error', message: 'プロフィールの保存に失敗しました。' }
  }

  const { error: supporterError } = await supabase
    .from('supporter_profiles')
    .upsert({
      profile_id: userId,
      motivation_level,
      experience: experience || null,
      availability: availability || null,
    })

  if (supporterError) {
    return { status: 'error', message: 'プロフィールの保存に失敗しました。' }
  }

  redirect('/supporter')
}
