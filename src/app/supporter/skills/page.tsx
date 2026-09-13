import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

import { addInterest, addSelfSkill, removeInterest, removeSelfSkill } from './actions'

type TagRow = { id: string; tags: { name: string } | null }
type EndorsedRow = { tag_id: string; tags: { name: string } | null }
type InterestRow = { tag_id: string; tags: { name: string } | null }

export default async function SupporterSkillsPage() {
  const { userId } = await verifySession()
  const supabase = await createClient()

  const [{ data: selfSkills }, { data: approvedEndorsements }, { data: interests }] =
    await Promise.all([
      supabase
        .from('supporter_skills')
        .select('id, tags(name)')
        .eq('supporter_id', userId)
        .eq('source', 'self')
        .returns<TagRow[]>(),
      supabase
        .from('skill_endorsements')
        .select('tag_id, tags(name)')
        .eq('supporter_id', userId)
        .eq('status', 'approved')
        .returns<EndorsedRow[]>(),
      supabase
        .from('supporter_interests')
        .select('tag_id, tags(name)')
        .eq('supporter_id', userId)
        .returns<InterestRow[]>(),
    ])

  const endorsedByTag = new Map<string, { name: string; count: number }>()
  for (const row of approvedEndorsements ?? []) {
    const name = row.tags?.name ?? '(不明なタグ)'
    const current = endorsedByTag.get(row.tag_id)
    endorsedByTag.set(row.tag_id, { name, count: (current?.count ?? 0) + 1 })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="スキル・興味の登録" />

      <Card>
        <h2 className="text-sm font-semibold text-zinc-700">
          自分で登録したスキル
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(selfSkills ?? []).map((skill) => (
            <form key={skill.id} action={removeSelfSkill}>
              <input type="hidden" name="skillId" value={skill.id} />
              <button className="group">
                <Badge className="gap-1.5 group-hover:bg-red-50 group-hover:text-red-600">
                  {skill.tags?.name}
                  <span className="text-zinc-300 group-hover:text-red-400">
                    ×
                  </span>
                </Badge>
              </button>
            </form>
          ))}
          {(selfSkills ?? []).length === 0 && (
            <span className="text-sm text-zinc-400">まだ登録がありません</span>
          )}
        </div>
        <form action={addSelfSkill} className="mt-4 flex gap-2">
          <Input name="name" required placeholder="例: 動画編集" className="flex-1" />
          <Button>追加</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-700">
          他サポーターから推薦されたスキル
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...endorsedByTag.entries()].map(([tagId, { name, count }]) => (
            <Badge key={tagId} tone="accent">
              {name} <span className="text-indigo-400">(他{count}名から推薦)</span>
            </Badge>
          ))}
          {endorsedByTag.size === 0 && (
            <span className="text-sm text-zinc-400">まだありません</span>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-700">興味のある活動タグ</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(interests ?? []).map((interest) => (
            <form key={interest.tag_id} action={removeInterest}>
              <input type="hidden" name="tagId" value={interest.tag_id} />
              <button className="group">
                <Badge className="gap-1.5 group-hover:bg-red-50 group-hover:text-red-600">
                  {interest.tags?.name}
                  <span className="text-zinc-300 group-hover:text-red-400">
                    ×
                  </span>
                </Badge>
              </button>
            </form>
          ))}
          {(interests ?? []).length === 0 && (
            <span className="text-sm text-zinc-400">まだ登録がありません</span>
          )}
        </div>
        <form action={addInterest} className="mt-4 flex gap-2">
          <Input
            name="name"
            required
            placeholder="例: イベント運営"
            className="flex-1"
          />
          <Button>追加</Button>
        </form>
      </Card>
    </div>
  )
}
