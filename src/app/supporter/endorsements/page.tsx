import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

import { approveEndorsement, rejectEndorsement } from './actions'

type PendingRow = {
  id: string
  endorser_id: string
  tags: { name: string } | null
}

export default async function EndorsementsPage() {
  const { userId } = await verifySession()
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('skill_endorsements')
    .select('id, endorser_id, tags(name)')
    .eq('supporter_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .returns<PendingRow[]>()

  const endorserIds = [...new Set((pending ?? []).map((p) => p.endorser_id))]
  const { data: endorsers } = endorserIds.length
    ? await supabase
        .from('public_supporter_directory')
        .select('id, display_name')
        .in('id', endorserIds)
        .returns<{ id: string; display_name: string }[]>()
    : { data: [] as { id: string; display_name: string }[] }

  const nameById = new Map((endorsers ?? []).map((e) => [e.id, e.display_name]))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="推薦の承認待ち"
        description="他のサポーターから届いたスキル推薦です。承認するとあなたのスキルとして登録されます。"
      />

      <div className="flex flex-col gap-3">
        {(pending ?? []).map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <p className="text-sm text-zinc-800">
              <span className="font-medium">
                {nameById.get(item.endorser_id) ?? '(不明なユーザー)'}
              </span>{' '}
              さんから「{item.tags?.name}」の推薦
            </p>
            <div className="flex gap-2">
              <form action={approveEndorsement}>
                <input type="hidden" name="id" value={item.id} />
                <Button className="px-3 py-1.5 text-xs">承認</Button>
              </form>
              <form action={rejectEndorsement}>
                <input type="hidden" name="id" value={item.id} />
                <Button variant="outline" className="px-3 py-1.5 text-xs">
                  却下
                </Button>
              </form>
            </div>
          </Card>
        ))}
        {(pending ?? []).length === 0 && (
          <Card className="text-sm text-zinc-400">
            承認待ちの推薦はありません
          </Card>
        )}
      </div>
    </div>
  )
}
