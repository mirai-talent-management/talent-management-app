'use server'

import { createClient } from '@/lib/supabase/server'

export type SendMagicLinkState = {
  status: 'idle' | 'sent' | 'error'
  message?: string
}

export async function sendMagicLink(
  _prevState: SendMagicLinkState,
  formData: FormData
): Promise<SendMagicLinkState> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email) {
    return { status: 'error', message: 'メールアドレスを入力してください。' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    return {
      status: 'error',
      message: 'メール送信に失敗しました。時間をおいて再度お試しください。',
    }
  }

  return { status: 'sent', message: `${email} にログイン用リンクを送信しました。` }
}
