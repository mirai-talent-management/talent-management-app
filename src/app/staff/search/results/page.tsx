import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { requireStaff } from '@/lib/dal'
import { computeMatchScore } from '@/lib/matching/score'
import { createClient } from '@/lib/supabase/server'
import { normalizeTagName } from '@/lib/tags'

type SupporterRow = {
  id: string
  display_name: string
  supporter_profiles: { motivation_level: number } | null
}

const MOTIVATION_LABELS: Record<number, string> = {
  1: '低い',
  2: 'やや低い',
  3: '普通',
  4: 'やや高い',
  5: '高い',
}

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string }>
}) {
  await requireStaff()
  const { tags: tagsParam } = await searchParams
  const supabase = await createClient()

  const requestedNames = (tagsParam ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  const normalizedNames = requestedNames.map(normalizeTagName)

  const { data: matchedTagRows } = normalizedNames.length
    ? await supabase
        .from('tags')
        .select('id, name')
        .eq('type', 'skill')
        .in('normalized_name', normalizedNames)
    : { data: [] }

  const requiredTagIds = (matchedTagRows ?? []).map((t) => t.id)

  const { data: supporters } = await supabase
    .from('profiles')
    .select('id, display_name, supporter_profiles(motivation_level)')
    .eq('role', 'supporter')
    .returns<SupporterRow[]>()

  const { data: skillRows } = requiredTagIds.length
    ? await supabase
        .from('supporter_skills')
        .select('supporter_id, tag_id')
        .in('tag_id', requiredTagIds)
    : { data: [] }

  const { data: endorsementRows } = requiredTagIds.length
    ? await supabase
        .from('skill_endorsements')
        .select('supporter_id, tag_id')
        .eq('status', 'approved')
        .in('tag_id', requiredTagIds)
    : { data: [] }

  const supporterTagIds = new Map<string, Set<string>>()
  for (const row of skillRows ?? []) {
    if (!supporterTagIds.has(row.supporter_id)) {
      supporterTagIds.set(row.supporter_id, new Set())
    }
    supporterTagIds.get(row.supporter_id)!.add(row.tag_id)
  }

  const endorsementCounts = new Map<string, Map<string, number>>()
  for (const row of endorsementRows ?? []) {
    if (!endorsementCounts.has(row.supporter_id)) {
      endorsementCounts.set(row.supporter_id, new Map())
    }
    const tagCounts = endorsementCounts.get(row.supporter_id)!
    tagCounts.set(row.tag_id, (tagCounts.get(row.tag_id) ?? 0) + 1)
  }

  const tagNameById = new Map((matchedTagRows ?? []).map((t) => [t.id, t.name]))

  const results = (supporters ?? [])
    .map((supporter) => {
      const tagIds = [...(supporterTagIds.get(supporter.id) ?? [])]
      const match = computeMatchScore({
        requiredTagIds,
        supporterTagIds: tagIds,
        motivationLevel: supporter.supporter_profiles?.motivation_level ?? 3,
        endorsementCountByTag: endorsementCounts.get(supporter.id) ?? new Map(),
      })
      return { supporter, match }
    })
    .filter((r) => r.match.matchedTagIds.length > 0)
    .sort((a, b) => b.match.score - a.match.score)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="検索結果"
        description={`検索タグ: ${requestedNames.join(', ') || '(なし)'}`}
      />

      <div className="flex flex-col gap-3">
        {results.map(({ supporter, match }) => (
          <Link key={supporter.id} href={`/staff/supporters/${supporter.id}`}>
            <Card className="transition hover:border-indigo-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-zinc-900">
                  {supporter.display_name}
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${Math.round(match.score * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    {Math.round(match.score * 100)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                一致タグ:{' '}
                {match.matchedTagIds
                  .map((id) => tagNameById.get(id))
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                モチベーション:{' '}
                {MOTIVATION_LABELS[
                  supporter.supporter_profiles?.motivation_level ?? 3
                ] ?? '普通'}
              </p>
            </Card>
          </Link>
        ))}
        {results.length === 0 && (
          <Card className="text-sm text-zinc-400">
            該当するサポーターが見つかりませんでした
          </Card>
        )}
      </div>
    </div>
  )
}
