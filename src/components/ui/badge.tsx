import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'accent' | 'success'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700',
  accent: 'bg-indigo-50 text-indigo-700',
  success: 'bg-emerald-50 text-emerald-700',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        TONES[tone],
        className
      )}
      {...props}
    />
  )
}
