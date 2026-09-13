import Link from 'next/link'
import type { ReactNode } from 'react'

import { logout } from '@/app/actions/auth'
import { Badge } from '@/components/ui/badge'

type NavItem = { href: string; label: string }

export function AppShell({
  role,
  displayName,
  navItems,
  children,
}: {
  role: 'staff' | 'supporter'
  displayName: string
  navItems: NavItem[]
  children: ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-zinc-900">
              サポーターマッチング
            </Link>
            <nav className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Badge tone={role === 'staff' ? 'accent' : 'neutral'}>
              {role === 'staff' ? '議員・スタッフ' : 'サポーター'}
            </Badge>
            <span className="text-sm text-zinc-600">{displayName}</span>
            <form action={logout}>
              <button className="text-sm text-zinc-400 transition hover:text-zinc-700">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  )
}
