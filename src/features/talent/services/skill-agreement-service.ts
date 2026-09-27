import type { Actor, AgreementSummary, TalentStore } from '../types.ts'
import { TalentError } from '../server/errors.ts'

/** Keeps JSON stores created before agreements were introduced readable. */
export function prepareAgreementStore<T extends TalentStore>(store: T): T {
  if (store.skillAgreements === undefined) store.skillAgreements = []
  if (!Array.isArray(store.skillAgreements)) throw new Error('スキル同意の保存形式を確認してください。')
  for (const [index, profile] of store.profiles.entries()) {
    for (const skill of profile.talents) {
      if (skill.source !== 'recommendation') continue
      if (skill.recommendationId && store.recommendations.some(rec => rec.id === skill.recommendationId && rec.toId === profile.id)) continue
      const linked = store.recommendations.find(rec => rec.toId === profile.id && rec.suggestionIds.some(id => store.suggestions.some(s => s.id === id && s.status === 'approved' && s.originalText === skill.originalText)))
      if (linked) { skill.recommendationId = linked.id; continue }
      // Older sample skills had no recommendation record. Give only these
      // fictional seed skills a deterministic fictional provenance record.
      if (!skill.id.startsWith('seed-')) continue
      const from = store.profiles[(index + 1) % store.profiles.length]
      if (!from || from.id === profile.id) continue
      const id = `seed-approved-recommendation:${skill.id}`
      skill.recommendationId = id
      if (!store.recommendations.some(rec => rec.id === id)) store.recommendations.push({id,fromId:from.id,fromName:from.name,toId:profile.id,text:`【架空のサンプル推薦】${skill.originalText}の経験を一緒の活動で見ました。`,source:'recommendation',createdAt:skill.approvedAt,suggestionIds:[]})
    }
  }
  return store
}

function eligible(store: TalentStore, actor: Actor, skillId: string) {
  const profile = store.profiles.find(profile => profile.talents.some(skill => skill.id === skillId))
  const skill = profile?.talents.find(skill => skill.id === skillId)
  if (!profile || !skill || skill.source !== 'recommendation' || !skill.approvedAt || !skill.recommendationId) throw new TalentError('承認済みの推薦スキルが見つかりません。',404)
  const recommendation = store.recommendations.find(rec => rec.id === skill.recommendationId && rec.toId === profile.id)
  if (!recommendation) throw new TalentError('推薦の出典を確認できません。',404)
  return {profile,recommendation}
}

export function agreementSummaries(store: TalentStore, actor: Actor): Record<string, AgreementSummary> {
  const summaries: Record<string, AgreementSummary> = {}
  for (const profile of store.profiles) for (const skill of profile.talents) {
    if (skill.source !== 'recommendation' || !skill.recommendationId) continue
    const recommendation = store.recommendations.find(rec => rec.id === skill.recommendationId && rec.toId === profile.id)
    if (!recommendation) continue
    const votes = store.skillAgreements.filter(item => item.skillId === skill.id)
    summaries[skill.id] = {count:new Set(votes.map(item => item.actorId)).size,agreed:votes.some(item => item.actorId === actor.id),canAgree:actor.id !== profile.id}
  }
  return summaries
}

export function toggleSkillAgreement(store: TalentStore, actor: Actor, skillId: string) {
  const {profile} = eligible(store,actor,skillId)
  if (actor.id === profile.id) throw new TalentError('本人は自分のスキルにいいねできません。',403)
  const found = store.skillAgreements.some(item => item.skillId === skillId && item.actorId === actor.id)
  store.skillAgreements = store.skillAgreements.filter(item => !(item.skillId === skillId && item.actorId === actor.id))
  if (!found) store.skillAgreements.push({skillId,actorId:actor.id,createdAt:new Date().toISOString()})
  return {ok:true,agreed:!found,count:store.skillAgreements.filter(item => item.skillId === skillId).length}
}
