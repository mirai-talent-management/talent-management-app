import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { getCurrentProfile } from '@/lib/dal'

const SHORTCUTS = [
  {
    href: '/supporter/skills',
    title: 'スキル・興味の登録',
    description: 'できること、興味のある活動を登録します。',
  },
  {
    href: '/supporter/endorse',
    title: '他サポーターへのスキル推薦',
    description: '「この人は○○もできる」を推薦できます。',
  },
  {
    href: '/supporter/endorsements',
    title: '推薦の承認待ち',
    description: '自分宛の推薦を確認・承認します。',
  },
  {
    href: '/onboarding/profile',
    title: 'プロフィール編集',
    description: 'モチベーションや経験・実績を更新します。',
  },
]

export default async function SupporterHomePage() {
  const profile = await getCurrentProfile()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="サポーターダッシュボード"
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
