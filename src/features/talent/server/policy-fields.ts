import type { TalentStore } from '../types.ts'

const demoExamples: Record<string, { interests: string[]; topics: string[]; perspective: string }> = {
  s1: { interests: ['行政DX', '情報アクセシビリティ'], topics: ['行政DX'], perspective: '広報の実務でデジタルサービスを使う立場から、利用者に伝わる導線について助言できます。' },
  s3: { interests: ['教育', '情報アクセシビリティ'], topics: ['情報アクセシビリティ'], perspective: 'デザイナーとして、情報の読みやすさや使いやすさの観点から助言できます。' },
  s9: { interests: ['データに基づく政策立案'], topics: ['データに基づく政策立案'], perspective: '調査データを集計・分析する実務経験から、指標の読み方について助言できます。' },
}

/** Older local demo files predate the self-reported policy-advice fields. */
export function preparePolicyFields<T extends TalentStore>(store: T): T {
  for (const profile of store.profiles) {
    const legacy = profile.policyAdviceTopics === undefined
    if (legacy && !profile.policyInterests.length) profile.policyInterests = demoExamples[profile.id]?.interests ?? []
    profile.policyAdviceTopics ??= demoExamples[profile.id]?.topics ?? []
    profile.policyAdvicePerspective ??= demoExamples[profile.id]?.perspective ?? ''
  }
  return store
}
