import { initialActivities, initialSupporters } from '../../../domain.ts'
import type { TalentProfile, TalentSkill, TalentStore } from '../types.ts'
import { normalizeSkill } from '../services/skill-normalization-service.ts'
import { extractSkills } from '../services/skill-extraction-service.ts'
import { prepareAgreementStore } from '../services/skill-agreement-service.ts'
import { CASUAL_SKILL_EXAMPLES } from '../data/casual-skill-examples.ts'

const seededAt = '2026-09-22T09:00:00.000Z'
const electionRoles = [
  ['写真撮影', 'ビラ配り', '初参加者フォロー'], ['音響対応', '写真撮影', 'ビラ配り'],
  ['音響対応', '写真撮影', 'ビラ配り'], ['音響対応', '写真撮影'],
  ['初参加者フォロー', 'ハガシ', 'ビラ配り'], ['音響対応', 'ハガシ'],
  ['初参加者フォロー', 'ビラ配り'], ['ハガシ', '初参加者フォロー'],
  ['写真撮影', 'ビラ配り'], ['ビラ配り', 'ハガシ'],
  ['初参加者フォロー', 'ビラ配り'], ['音響対応', '写真撮影'],
  ['ビラ配り', '初参加者フォロー'], ['ビラ配り', 'ハガシ'],
  ['初参加者フォロー', '写真撮影'], ['音響対応', 'ハガシ'], ['ビラ配り'], ['写真撮影'],
]

/** Add the new fictional examples once, including to existing local demo stores. */
export function prepareCasualDemoSkills<T extends TalentStore>(store: T): T {
  if ((store.demoSkillRevision ?? 0) >= 1) return store
  const profiles = new Map(store.profiles.map(profile => [profile.id, profile]))
  for (const [index, example] of CASUAL_SKILL_EXAMPLES.entries()) {
    const profile = profiles.get(example.profileId)
    if (!profile || profile.talents.some(skill => skill.normalizedName === example.name || skill.originalText === example.name)) continue
    const normalized = normalizeSkill(example.name)
    profile.talents.push({id:`seed-casual-${example.profileId}-${index + 1}`,originalText:example.name,...normalized,category:example.category,source:'self',evidenceId:null,approvedAt:seededAt})
  }
  store.demoSkillRevision = 1
  return store
}

/** Independent copies of fictional demo records; never used to seed an external database. */
export function createSeedStore(): TalentStore {
  const evidence: TalentStore['evidence'] = []
  const profiles: TalentProfile[] = structuredClone(initialSupporters).map((profile, index) => {
    const approved = new Map<string, TalentSkill>()
    const add = (name: string, source: TalentSkill['source'], description: string) => {
      const normalized = normalizeSkill(name)
      if (approved.has(normalized.normalizedName)) return
      const id = `seed-${profile.id}-${approved.size + 1}`
      evidence.push({ id: `evidence-${id}`, profileId: profile.id, source, description, reference: null, occurredAt: seededAt })
      approved.set(normalized.normalizedName, { id, originalText: name, ...normalized, source, evidenceId: `evidence-${id}`, approvedAt: seededAt })
    }
    for (const skill of profile.skills) add(skill.name, skill.source === 'recommended' ? 'recommendation' : 'self', `サンプル本人確認済み：「${skill.name}」`)
    for (const role of electionRoles[index]) add(role, 'self', `架空の地域活動で「${role}」を担当した経験を本人が登録`)
    return {
      ...profile, name: index === 0 ? '田中 美咲' : profile.name,
      location: index < 14 ? '神奈川県横浜市' : profile.location,
      talents: [...approved.values()],
      participation: index === 16 ? ['resting'] : index === 15 ? ['remote'] : index % 3 === 0 ? ['election_active', 'regular'] : ['sometimes'],
      availabilityDetails: {
        regions: index < 14 ? ['神奈川県横浜市', '東京都'] : [profile.location],
        weekdays: index < 14 ? ['土', '日'] : ['日'],
        timeSlots: index < 14 ? ['午後', '夜'] : ['午前'], remote: index % 4 !== 3, onsite: index !== 15,
      },
      workExperience: profile.headline,
      personalExperience: index === 0 ? '趣味で写真を撮り、一眼レフでイベントの記録撮影をしています。' : `${profile.skills[0]?.name ?? '地域活動'}の経験を活動でも活かしています。`,
      electionExperience: `${electionRoles[index].join('、')}の担当経験があります（架空のサンプル）。`,
      communityExperience: profile.experience.map(item => item.title).join('、'),
      policyInterests: index === 0 ? ['行政DX', '情報アクセシビリティ'] : index === 2 ? ['教育', '情報アクセシビリティ'] : index === 8 ? ['データに基づく政策立案'] : [],
      policyAdviceTopics: index === 0 ? ['行政DX'] : index === 2 ? ['情報アクセシビリティ'] : index === 8 ? ['データに基づく政策立案'] : [],
      policyAdvicePerspective: index === 0 ? '広報の実務でデジタルサービスを使う立場から、利用者に伝わる導線について助言できます。' : index === 2 ? 'デザイナーとして、情報の読みやすさや使いやすさの観点から助言できます。' : index === 8 ? '調査データを集計・分析する実務経験から、指標の読み方について助言できます。' : '',
    }
  })
  const suggestions = [
    ...extractSkills('会計の集計を仕事で担当しています。', { profileId: 's1', origin: 'interview', reference: '架空のインタビュー' }).filter(suggestion => suggestion.normalizedName === '会計'),
    ...extractSkills('対話会の司会を担当した進行がわかりやすかったです。', { profileId: 's1', origin: 'recommendation', reference: 'seed-recommendation-1' }),
  ].map((suggestion, index) => ({ ...suggestion, id: `seed-suggestion-${index + 1}`, createdAt: seededAt }))
  return prepareCasualDemoSkills(prepareAgreementStore({
    version: 2, profiles, activities: structuredClone(initialActivities), evidence, suggestions,
    recommendations: [{ id: 'seed-recommendation-1', fromId: 's8', fromName: profiles[7].name, toId: 's1', text: '対話会の司会を担当した進行がわかりやすかったです。', source: 'recommendation', createdAt: seededAt, suggestionIds: suggestions.filter(suggestion => suggestion.origin === 'recommendation').map(suggestion => suggestion.id) }],
    interviews: [],
    pairingPreferences: [],
    teams: [], skillAgreements: [],
  }))
}

export const DEMO_STAFF = { id: 'staff-demo', name: '議員・党職員・エリアサポーター', role: 'staff' as const }
