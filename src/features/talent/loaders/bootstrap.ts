import type { Actor, BootstrapData, TalentStore } from '../types.ts'
import { agreementSummaries } from '../services/skill-agreement-service.ts'

export function demoAccounts(store: TalentStore): Actor[] {
  return [{id:'staff-demo',role:'staff',name:'議員・党職員・エリアサポーター（デモ）'}, ...store.profiles.map(profile => ({id:profile.id,role:'supporter' as const,name:profile.name}))]
}

/** Explicit browser projection. Never spread the repository store into a DTO. */
export function projectBootstrap(store: TalentStore, actor: Actor): BootstrapData {
  const publicEvidence = new Set(store.profiles.flatMap(profile => profile.talents.map(skill => skill.evidenceId).filter(Boolean)))
  return structuredClone({
    mode:'mock', actor,
    profiles:store.profiles.map(profile => ({...profile,email:actor.role === 'staff' || actor.id === profile.id ? profile.email : '',slack:actor.role === 'staff' || actor.id === profile.id ? profile.slack : ''})),
    activities:store.activities,
    evidence:store.evidence.filter(item => publicEvidence.has(item.id)).map(item => {
      const talent = store.profiles.find(profile => profile.id === item.profileId)?.talents.find(skill => skill.evidenceId === item.id)
      return {id:item.id,profileId:item.profileId,source:item.source,description:talent?.originalText ?? talent?.normalizedName ?? '本人が承認したスキル',reference:null,occurredAt:item.occurredAt}
    }),
    suggestions:store.suggestions.filter(item => item.profileId === actor.id && item.origin !== 'slack'),
    recommendations:store.recommendations.filter(item => item.toId === actor.id || item.fromId === actor.id),
    interview:store.interviews.find(item => item.profileId === actor.id) ?? null,
    teams:actor.role === 'staff' ? store.teams : [],
    demoAccounts:demoAccounts(store),
    agreementSummaries:agreementSummaries(store,actor),
  })
}
