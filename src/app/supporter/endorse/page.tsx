import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

import { submitEndorsement } from './actions'

type SupporterRow = { id: string; display_name: string }

export default async function EndorsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { userId } = await verifySession()
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('public_supporter_directory')
    .select('id, display_name')
    .neq('id', userId)
    .order('display_name')

  if (q) {
    query = query.ilike('display_name', `%${q}%`)
  }

  const { data: supporters } = await query.returns<SupporterRow[]>()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="他サポーターへのスキル推薦"
        description="「この人は○○もできる」というスキルを推薦できます。本人が承認するとスキルとして登録されます。"
      />

      <form method="get">
        <Input type="search" name="q" defaultValue={q} placeholder="名前で検索" />
      </form>

      <div className="flex flex-col gap-3">
        {(supporters ?? []).map((supporter) => (
          <Card key={supporter.id}>
            <p className="text-sm font-medium text-zinc-900">
              {supporter.display_name}
            </p>
            <form action={submitEndorsement} className="mt-3 flex gap-2">
              <input type="hidden" name="supporterId" value={supporter.id} />
              <Input
                name="name"
                required
                placeholder="推薦するスキル(例: 動画編集)"
                className="flex-1"
              />
              <Button>推薦する</Button>
            </form>
          </Card>
        ))}
        {(supporters ?? []).length === 0 && (
          <Card className="text-sm text-zinc-400">
            該当するサポーターがいません
          </Card>
        )}
      </div>
    </div>
  )
}
