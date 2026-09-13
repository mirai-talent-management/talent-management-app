'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'

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
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="表示名">
        <Input name="display_name" defaultValue={defaultDisplayName} required />
      </Field>

      <Field label="自己PR">
        <Textarea name="bio" rows={3} />
      </Field>

      <Field label="活動へのモチベーション">
        <Select name="motivation_level" defaultValue={3}>
          <option value={1}>低い</option>
          <option value={2}>やや低い</option>
          <option value={3}>普通</option>
          <option value={4}>やや高い</option>
          <option value={5}>高い</option>
        </Select>
      </Field>

      <Field label="経験・実績">
        <Textarea name="experience" rows={3} />
      </Field>

      <Field
        label="活動可能条件"
        hint="例: 平日夜、土日のみ、月2回程度 など"
      >
        <Textarea name="availability" rows={2} />
      </Field>

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? '保存中...' : '保存する'}
      </Button>

      {state.status === 'error' && (
        <p className="text-sm text-red-600">{state.message}</p>
      )}
    </form>
  )
}
