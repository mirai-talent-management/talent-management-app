import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { buttonVariants } from '@/components/ui/button'
import { requireStaff } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

export default async function ActivitiesPage() {
  await requireStaff()
  const supabase = await createClient()

  const { data: activities } = await supabase
    .from('activities')
    .select('id, title, starts_at, required_headcount')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="活動一覧"
        action={
          <Link href="/staff/activities/new" className={buttonVariants('primary')}>
            + 新規登録
          </Link>
        }
      />

      <div className="flex flex-col gap-3">
        {(activities ?? []).map((activity) => (
          <Link key={activity.id} href={`/staff/activities/${activity.id}`}>
            <Card className="transition hover:border-indigo-300 hover:shadow-md">
              <p className="font-medium text-zinc-900">{activity.title}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {activity.starts_at
                  ? new Date(activity.starts_at).toLocaleString('ja-JP')
                  : '日時未定'}
                {activity.required_headcount &&
                  ` ・必要人数 ${activity.required_headcount}名`}
              </p>
            </Card>
          </Link>
        ))}
        {(activities ?? []).length === 0 && (
          <Card className="text-sm text-zinc-400">
            まだ活動が登録されていません
          </Card>
        )}
      </div>
    </div>
  )
}
