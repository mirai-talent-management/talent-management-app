'use client'

import { useActionState } from 'react'

import { saveOnboardingProfile, type OnboardingState } from './actions'

const initialState: OnboardingState = { status: 'idle' }

export function OnboardingForm({
  defaultDisplayName,
}: {
  defaultDisplayName: string
}) {
  const [state, formAction, pending] = useActionState(
    saveOnboardingProfile,
    initialState
  )

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        表示名
        <input
          name="display_name"
          defaultValue={defaultDisplayName}
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        自己PR
        <textarea
          name="bio"
          rows={3}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend>活動へのモチベーション</legend>
        <select
          name="motivation_level"
          defaultValue={3}
          className="rounded border border-gray-300 px-3 py-2"
        >
          <option value={1}>低い</option>
          <option value={2}>やや低い</option>
          <option value={3}>普通</option>
          <option value={4}>やや高い</option>
          <option value={5}>高い</option>
        </select>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        経験・実績
        <textarea
          name="experience"
          rows={3}
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        活動可能条件
        <textarea
          name="availability"
          rows={2}
          placeholder="例: 平日夜、土日のみ、月2回程度 など"
          className="rounded border border-gray-300 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? '保存中...' : '保存する'}
      </button>

      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  )
}
