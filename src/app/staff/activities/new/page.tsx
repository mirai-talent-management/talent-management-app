import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { requireStaff } from '@/lib/dal'

import { createActivity } from './actions'

export default async function NewActivityPage() {
  await requireStaff()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="活動登録" />

      <Card>
        <form action={createActivity} className="flex flex-col gap-4">
          <Field label="活動名">
            <Input name="title" required />
          </Field>

          <Field label="活動内容">
            <Textarea name="description" rows={3} />
          </Field>

          <Field label="活動日時">
            <Input type="datetime-local" name="starts_at" />
          </Field>

          <Field label="活動場所">
            <Input name="location" />
          </Field>

          <Field label="募集内容">
            <Textarea name="recruitment_details" rows={2} />
          </Field>

          <Field
            label="必要なスキルタグ"
            hint="カンマ区切りで入力してください"
          >
            <Input
              name="required_tags"
              placeholder="例: SNS, Instagram, 動画編集, 広報"
            />
          </Field>

          <Field label="求める人物像">
            <Textarea name="desired_persona" rows={2} />
          </Field>

          <Field label="必要人数">
            <Input type="number" min={1} name="required_headcount" />
          </Field>

          <Field label="その他条件">
            <Textarea name="other_conditions" rows={2} />
          </Field>

          <Button type="submit" className="mt-2">
            登録する
          </Button>
        </form>
      </Card>
    </div>
  )
}
