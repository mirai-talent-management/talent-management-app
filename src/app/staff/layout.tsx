import type { ReactNode } from 'react'

import { AppShell } from '@/components/app-shell'
import { requireStaff } from '@/lib/dal'

const NAV_ITEMS = [
  { href: '/staff', label: 'ダッシュボード' },
  { href: '/staff/activities', label: '活動一覧' },
  { href: '/staff/search', label: 'サポーター検索' },
]

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const profile = await requireStaff()

  return (
    <AppShell role="staff" displayName={profile.display_name} navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  )
}
