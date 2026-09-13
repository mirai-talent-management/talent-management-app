import { requireStaff } from '@/lib/dal'

export default async function StaffHomePage() {
  const profile = await requireStaff()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">
        議員・スタッフダッシュボード
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        ようこそ、{profile.display_name} さん。
      </p>
      <p className="mt-6 text-sm text-gray-400">
        活動登録・サポーター検索は準備中です。
      </p>
    </main>
  )
}
