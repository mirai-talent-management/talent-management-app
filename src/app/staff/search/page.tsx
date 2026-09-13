import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { requireStaff } from '@/lib/dal'

export default async function SearchPage() {
  await requireStaff()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="サポーター検索"
        description="必要なスキルタグをカンマ区切りで入力してください。"
      />

      <Card>
        <form action="/staff/search/results" className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="スキルタグ">
              <Input name="tags" required placeholder="例: SNS, Instagram, 動画編集" />
            </Field>
          </div>
          <Button className="whitespace-nowrap">検索</Button>
        </form>
      </Card>
    </div>
  )
}
