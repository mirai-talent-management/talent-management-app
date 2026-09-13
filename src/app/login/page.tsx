'use client'

import { useActionState } from 'react'

import { sendMagicLink, type SendMagicLinkState } from './actions'

const initialState: SendMagicLinkState = { status: 'idle' }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState
  )

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">ログイン</h1>
        <p className="mt-1 text-sm text-gray-500">
          メールアドレスにログイン用リンクを送信します。
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? '送信中...' : 'ログインリンクを送信'}
        </button>
      </form>

      {state.status === 'sent' && (
        <p className="text-sm text-green-600">{state.message}</p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </main>
  )
}
