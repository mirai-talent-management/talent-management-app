'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import { sendMagicLink, type SendMagicLinkState } from './actions'

const initialState: SendMagicLinkState = { status: 'idle' }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 via-white to-white px-4">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm font-semibold text-indigo-600">
          サポーターマッチング
        </p>

        <Card>
          <h1 className="text-lg font-semibold text-zinc-900">ログイン</h1>
          <p className="mt-1 text-sm text-zinc-500">
            メールアドレスにログイン用リンクを送信します。
          </p>

          <form action={formAction} className="mt-5 flex flex-col gap-3">
            <Input type="email" name="email" required placeholder="you@example.com" />
            <Button type="submit" disabled={pending}>
              {pending ? '送信中...' : 'ログインリンクを送信'}
            </Button>
          </form>

          {state.status === 'sent' && (
            <p className="mt-3 text-sm text-emerald-600">{state.message}</p>
          )}
          {state.status === 'error' && (
            <p className="mt-3 text-sm text-red-600">{state.message}</p>
          )}
        </Card>
      </div>
    </main>
  )
}
