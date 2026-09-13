import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { requireStaff } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

type TagRow = { tag_id: string; tags: { name: string } | null }

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff()
  const { id } = await params
  const supabase = await createClient()

  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!activity) notFound()

  const { data: requiredTags } = await supabase
    .from('activity_required_tags')
    .select('tag_id, tags(name)')
    .eq('activity_id', id)
    .returns<TagRow[]>()

  const tagNames = (requiredTags ?? []).map((t) => t.tags?.name).filter(Boolean)
  const searchQuery = new URLSearchParams({ tags: tagNames.join(',') }).toString()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={activity.title} />

      <Card className="flex flex-col gap-5">
        {activity.description && (
          <p className="whitespace-pre-wrap text-sm text-zinc-600">
            {activity.description}
          </p>
        )}

        <dl className="grid gap-4 sm:grid-cols-2">
          {activity.starts_at && (
            <div>
              <dt className="text-xs text-zinc-400">活動日時</dt>
              <dd className="mt-0.5 text-sm text-zinc-800">
                {new Date(activity.starts_at).toLocaleString('ja-JP')}
              </dd>
            </div>
          )}
          {activity.location && (
            <div>
              <dt className="text-xs text-zinc-400">活動場所</dt>
              <dd className="mt-0.5 text-sm text-zinc-800">{activity.location}</dd>
            </div>
          )}
          {activity.recruitment_details && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-400">募集内容</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">
                {activity.recruitment_details}
              </dd>
            </div>
          )}
          {activity.desired_persona && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-400">求める人物像</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">
                {activity.desired_persona}
              </dd>
            </div>
          )}
          {activity.required_headcount && (
            <div>
              <dt className="text-xs text-zinc-400">必要人数</dt>
              <dd className="mt-0.5 text-sm text-zinc-800">
                {activity.required_headcount}名
              </dd>
            </div>
          )}
          {activity.other_conditions && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-400">その他条件</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">
                {activity.other_conditions}
              </dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap gap-2">
          {tagNames.map((name) => (
            <Badge key={name} tone="accent">
              {name}
            </Badge>
          ))}
        </div>

        <Link
          href={`/staff/search/results?${searchQuery}`}
          className={buttonVariants('primary', 'self-start')}
        >
          このタグでサポーターを検索
        </Link>
      </Card>
    </div>
  )
}
