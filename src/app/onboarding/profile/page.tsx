import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { getCurrentProfile } from '@/lib/dal'

import { OnboardingForm } from './onboarding-form'

export default async function OnboardingProfilePage() {
  const profile = await getCurrentProfile()

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <PageHeader
        title="プロフィール登録"
        description="あなたのことを教えてください。あとから編集できます。"
      />

      <Card className="mt-6">
        <OnboardingForm defaultDisplayName={profile.display_name} />
      </Card>
    </main>
  )
}
