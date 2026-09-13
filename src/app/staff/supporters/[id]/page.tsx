import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { requireStaff } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

type TagRow = { tag_id: string; tags: { name: string } | null }
type EndorsedRow = { tag_id: string; tags: { name: string } | null }

const MOTIVATION_LABELS: Record<number, string> = {
  1: '低い',
  2: 'やや低い',
  3: '普通',
  4: 'やや高い',
  5: '高い',
}

export default async function SupporterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff()
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, email, bio')
    .eq('id', id)
    .eq('role', 'supporter')
    .maybeSingle()

  if (!profile) notFound()

  const { data: supporterProfile } = await supabase
    .from('supporter_profiles')
    .select('motivation_level, experience, availability')
    .eq('profile_id', id)
    .maybeSingle()

  const { data: selfSkills } = await supabase
    .from('supporter_skills')
    .select('tag_id, tags(name)')
    .eq('supporter_id', id)
    .eq('source', 'self')
    .returns<TagRow[]>()

  const { data: approvedEndorsements } = await supabase
    .from('skill_endorsements')
    .select('tag_id, tags(name)')
    .eq('supporter_id', id)
    .eq('status', 'approved')
    .returns<EndorsedRow[]>()

  const { data: interests } = await supabase
    .from('supporter_interests')
    .select('tag_id, tags(name)')
    .eq('supporter_id', id)
    .returns<TagRow[]>()

  const endorsedByTag = new Map<string, { name: string; count: number }>()
  for (const row of approvedEndorsements ?? []) {
    const name = row.tags?.name ?? '(不明なタグ)'
    const current = endorsedByTag.get(row.tag_id)
    endorsedByTag.set(row.tag_id, { name, count: (current?.count ?? 0) + 1 })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={profile.display_name}
        action={
          <Link
            href={`/staff/supporters/${profile.id}/contact/email`}
            className={buttonVariants('primary')}
          >
            連絡する(メール)
          </Link>
        }
      />

      <Card className="flex flex-col gap-5">
        {profile.bio && (
          <p className="whitespace-pre-wrap text-sm text-zinc-600">
            {profile.bio}
          </p>
        )}

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-400">モチベーション</dt>
            <dd className="mt-0.5 text-sm text-zinc-800">
              {MOTIVATION_LABELS[supporterProfile?.motivation_level ?? 3] ??
                '普通'}
            </dd>
          </div>
          {supporterProfile?.experience && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-400">経験・実績</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">
                {supporterProfile.experience}
              </dd>
            </div>
          )}
          {supporterProfile?.availability && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-400">活動可能条件</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-800">
                {supporterProfile.availability}
              </dd>
            </div>
          )}
        </dl>

        <section>
          <h2 className="text-xs font-semibold text-zinc-400">スキル</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(selfSkills ?? []).map((skill) => (
              <Badge key={skill.tag_id}>{skill.tags?.name}</Badge>
            ))}
            {(selfSkills ?? []).length === 0 && (
              <span className="text-sm text-zinc-400">登録なし</span>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-zinc-400">
            他サポーターから推薦されたスキル
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...endorsedByTag.entries()].map(([tagId, { name, count }]) => (
              <Badge key={tagId} tone="accent">
                {name}(他{count}名から推薦)
              </Badge>
            ))}
            {endorsedByTag.size === 0 && (
              <span className="text-sm text-zinc-400">なし</span>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-zinc-400">興味・関心</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {(interests ?? []).map((interest) => (
              <Badge key={interest.tag_id}>{interest.tags?.name}</Badge>
            ))}
            {(interests ?? []).length === 0 && (
              <span className="text-sm text-zinc-400">登録なし</span>
            )}
          </div>
        </section>
      </Card>
    </div>
  )
}
