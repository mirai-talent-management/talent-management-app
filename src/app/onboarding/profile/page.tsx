import { getCurrentProfile } from '@/lib/dal'

import { OnboardingForm } from './onboarding-form'

export default async function OnboardingProfilePage() {
  const profile = await getCurrentProfile()

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold">プロフィール登録</h1>
      <p className="mt-1 text-sm text-gray-500">
        あなたのことを教えてください。あとから編集できます。
      </p>

      <OnboardingForm defaultDisplayName={profile.display_name} />
    </main>
  )
}
