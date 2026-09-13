import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500',
  outline:
    'border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50',
  ghost: 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'border border-red-200 text-red-600 hover:bg-red-50',
}

export function buttonVariants(variant: ButtonVariant = 'primary', className?: string) {
  return cn(BASE, VARIANTS[variant], className)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={buttonVariants(variant, className)} {...props} />
}
