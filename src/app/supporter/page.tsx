import { getCurrentProfile } from '@/lib/dal'

export default async function SupporterHomePage() {
  const profile = await getCurrentProfile()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">サポーターダッシュボード</h1>
      <p className="mt-2 text-sm text-gray-500">
        ようこそ、{profile.display_name} さん。
      </p>
      <p className="mt-6 text-sm text-gray-400">
        スキル登録・他サポーターへの推薦は準備中です。
      </p>
    </main>
  )
}
