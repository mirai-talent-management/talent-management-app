import { notFound } from 'next/navigation'
import TalentApp from '../../../features/talent/components/talent-app'

export default async function TalentPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params
  if (view === 'preferences') notFound()
  return <TalentApp initialView={view} />
}
