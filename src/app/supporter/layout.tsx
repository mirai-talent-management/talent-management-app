import type { ReactNode } from 'react'

import { AppShell } from '@/components/app-shell'
import { getCurrentProfile } from '@/lib/dal'

const NAV_ITEMS = [
  { href: '/supporter', label: 'ダッシュボード' },
  { href: '/supporter/skills', label: 'スキル・興味' },
  { href: '/supporter/endorse', label: 'スキル推薦' },
  { href: '/supporter/endorsements', label: '承認待ち' },
]

export default async function SupporterLayout({
  children,
}: {
  children: ReactNode
}) {
  const profile = await getCurrentProfile()

  return (
    <AppShell
      role="supporter"
      displayName={profile.display_name}
      navItems={NAV_ITEMS}
    >
      {children}
    </AppShell>
  )
}
