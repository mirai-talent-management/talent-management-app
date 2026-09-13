import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { requireStaff } from '@/lib/dal'

const SHORTCUTS = [
  {
    href: '/staff/activities',
    title: '活動一覧・登録',
    description: '企画している活動を登録し、必要なスキルタグを設定します。',
  },
  {
    href: '/staff/search',
    title: 'サポーター検索',
    description: 'スキル・モチベーション・推薦をもとにマッチング検索します。',
  },
]

export default async function StaffHomePage() {
  const profile = await requireStaff()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="議員・スタッフダッシュボード"
        description={`ようこそ、${profile.display_name} さん。`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SHORTCUTS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition hover:border-indigo-300 hover:shadow-md">
              <p className="font-medium text-zinc-900">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
