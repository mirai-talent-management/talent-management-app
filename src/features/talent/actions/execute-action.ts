import { randomUUID } from 'node:crypto'
import type { Actor, TalentProfile, TalentStore } from '../types.ts'
import { TalentError } from '../server/errors.ts'
import { activityInput, choice, object, onlyKeys, profilePatch, skillCategory, text } from '../server/validation.ts'
import { normalizeSkill } from '../services/skill-normalization-service.ts'
import { toggleSkillAgreement } from '../services/skill-agreement-service.ts'
import { extractSkills } from '../services/skill-extraction-service.ts'
import { advanceInterview } from '../services/interview-service.ts'
import { semanticSearch } from '../services/semantic-search-service.ts'
import { buildTeam } from '../services/team-builder-service.ts'
import { formatResidenceLocation, splitResidenceLocation } from '../services/supporter-directory.ts'

function staff(actor: Actor) { if (actor.role !== 'staff') throw new TalentError('議員・スタッフのみ利用できます。',403) }
function ownProfile(store: TalentStore, actor: Actor): TalentProfile {
  const profile = store.profiles.find(item => item.id === actor.id)
  if (actor.role !== 'supporter' || !profile) throw new TalentError('本人のサポーターアカウントで操作してください。',403)
  return profile
}
function syncLegacySkills(profile: TalentProfile) {
  profile.skills = profile.talents.map(skill => ({name:skill.normalizedName,source:skill.source === 'recommendation' ? 'recommended' : 'self',endorsers:[]}))
}

export function executeTalentAction(store: TalentStore, actor: Actor, input: unknown): unknown {
  const body = object(input)
  const action = text(body.action,'操作',60)
  const now = new Date().toISOString()
  switch (action) {
    case 'skill.agreement.toggle': {
      onlyKeys(body,['action','skillId'])
      return toggleSkillAgreement(store,actor,text(body.skillId,'スキルID',100))
    }
    case 'profile.save': {
      onlyKeys(body,['action','profile'])
      const profile = ownProfile(store,actor)
      const patch = profilePatch(body.profile)
      const { municipality, ...profileFields } = patch
      const { prefecture } = splitResidenceLocation(profile.location)
      Object.assign(profile,profileFields,{location:formatResidenceLocation(prefecture,municipality)})
      profile.availability = [...patch.availabilityDetails.weekdays,...patch.availabilityDetails.timeSlots,...(patch.availabilityDetails.remote ? ['オンライン'] : []),...(patch.availabilityDetails.onsite ? ['現地参加'] : [])]
      return {ok:true}
    }
    case 'skill.add': {
      onlyKeys(body,['action','text','category'])
      const profile = ownProfile(store,actor)
      const originalText = text(body.text,'スキル',500)
      const category = skillCategory(body.category)
      const normalized = normalizeSkill(originalText)
      if (profile.talents.some(skill => skill.normalizedName.toLocaleLowerCase() === normalized.normalizedName.toLocaleLowerCase() && skill.source === 'self')) throw new TalentError('この本人申告スキルは登録済みです。',409)
      profile.talents.push({id:randomUUID(),originalText,normalizedName:normalized.normalizedName,relatedTerms:normalized.relatedTerms,category,source:'self',evidenceId:null,approvedAt:now})
      syncLegacySkills(profile)
      return {ok:true}
    }
    case 'skill.update': {
      onlyKeys(body,['action','id','text','category'])
      const profile = ownProfile(store,actor)
      const id = text(body.id,'スキルID',100)
      const skill = profile.talents.find(item => item.id === id)
      if (!skill) throw new TalentError('自分のスキルだけ編集できます。',404)
      if (skill.source !== 'self') throw new TalentError('編集できるのは本人申告のスキルだけです。',403)
      const originalText = text(body.text,'スキル',500)
      const category = skillCategory(body.category)
      const normalized = normalizeSkill(originalText)
      if (profile.talents.some(item => item.id !== id && item.source === 'self' && item.normalizedName.toLocaleLowerCase() === normalized.normalizedName.toLocaleLowerCase())) throw new TalentError('この本人申告スキルは登録済みです。',409)
      Object.assign(skill,{originalText,normalizedName:normalized.normalizedName,relatedTerms:normalized.relatedTerms,category})
      syncLegacySkills(profile)
      return {ok:true}
    }
    case 'skill.remove': {
      onlyKeys(body,['action','id'])
      const profile = ownProfile(store,actor)
      const id = text(body.id,'スキルID',100)
      const skill = profile.talents.find(item => item.id === id)
      if (!skill) throw new TalentError('自分のスキルだけ削除できます。',404)
      if (skill.source !== 'self') throw new TalentError('削除できるのは本人申告のスキルだけです。',403)
      profile.talents = profile.talents.filter(item => item.id !== id)
      syncLegacySkills(profile)
      return {ok:true}
    }
    case 'suggestion.review': {
      onlyKeys(body,['action','id','decision','text'])
      const profile = ownProfile(store,actor)
      const id = text(body.id,'候補ID',100)
      const decision = choice(body.decision,['approved','rejected'],'確認結果')
      const suggestion = store.suggestions.find(item => item.id === id && item.profileId === actor.id)
      if (!suggestion) throw new TalentError('自分のスキル候補だけ確認できます。',404)
      if (suggestion.origin === 'slack') throw new TalentError('Slack由来の候補機能は現在停止中です。',410)
      const finalText = body.text === undefined ? suggestion.originalText : text(body.text,'スキルの表現',500)
      if (suggestion.status !== 'pending') {
        if (suggestion.status === decision) return {ok:true}
        throw new TalentError('この候補は確認済みです。',409)
      }
      suggestion.status = decision
      suggestion.reviewedAt = now
      if (decision === 'approved') {
        const normalized = finalText === suggestion.originalText
          ? {normalizedName:suggestion.normalizedName,relatedTerms:suggestion.relatedTerms,category:suggestion.category}
          : normalizeSkill(finalText)
        const evidenceId = randomUUID()
        store.evidence.push({id:evidenceId,profileId:actor.id,source:suggestion.source,description:finalText,reference:null,occurredAt:now})
        const recommendationId = suggestion.source === 'recommendation' ? store.recommendations.find(item => item.toId === actor.id && item.suggestionIds.includes(suggestion.id))?.id ?? null : null
        profile.talents.push({id:randomUUID(),originalText:finalText,normalizedName:normalized.normalizedName,relatedTerms:normalized.relatedTerms,category:suggestion.category,source:suggestion.source,evidenceId,approvedAt:now,recommendationId})
        syncLegacySkills(profile)
      }
      return {ok:true}
    }
    case 'interview.answer': {
      onlyKeys(body,['action','answer'])
      ownProfile(store,actor)
      const answer = text(body.answer,'回答',5000,false)
      const existing = store.interviews.find(session => session.profileId === actor.id) ?? null
      const next = advanceInterview(existing,actor.id,answer)
      store.interviews = [...store.interviews.filter(session => session.profileId !== actor.id),next.session]
      store.suggestions.push(...next.suggestions)
      return {ok:true}
    }
    case 'interview.restart': {
      onlyKeys(body,['action'])
      ownProfile(store,actor)
      const session = store.interviews.find(item => item.profileId === actor.id)
      if (session?.status !== 'completed') throw new TalentError('完了したインタビューだけやり直せます。',409)
      store.interviews = store.interviews.filter(item => item.profileId !== actor.id)
      return {ok:true}
    }
    case 'interview.pause': {
      onlyKeys(body,['action'])
      ownProfile(store,actor)
      const session = store.interviews.find(item => item.profileId === actor.id)
      if (session && session.status !== 'completed') {session.status = 'paused';session.updatedAt = now}
      return {ok:true}
    }
    case 'recommendation.send': {
      onlyKeys(body,['action','toId','text'])
      const toId = text(body.toId,'推薦先',100)
      const recommendationText = text(body.text,'推薦内容',2000)
      if (toId === actor.id) throw new TalentError('自分への推薦はできません。')
      if (!store.profiles.some(item => item.id === toId)) throw new TalentError('推薦先が見つかりません。',404)
      const suggestions = extractSkills(recommendationText,{profileId:toId,origin:'recommendation'})
      if (!suggestions.length) throw new TalentError('具体的にできることを含めて推薦してください。')
      store.recommendations.push({id:randomUUID(),fromId:actor.id,fromName:actor.name,toId,text:recommendationText,source:'recommendation',createdAt:now,suggestionIds:suggestions.map(item => item.id)})
      store.suggestions.push(...suggestions)
      return {ok:true}
    }
    case 'activity.save': {
      onlyKeys(body,['action','activity']); staff(actor)
      const activity = activityInput(body.activity)
      store.activities = [...store.activities.filter(item => item.id !== activity.id),activity]
      return {ok:true}
    }
    case 'search': {
      onlyKeys(body,['action','query'])
      return semanticSearch(store.profiles,text(body.query,'検索条件',2000))
    }
    case 'team.build': {
      onlyKeys(body,['action','request']); staff(actor)
      const team = buildTeam(store.profiles,[],text(body.request,'募集条件',5000))
      store.teams.unshift(team)
      return team
    }
    case 'team.review': {
      onlyKeys(body,['action','id']); staff(actor)
      const id = text(body.id,'チームID',100)
      const team = store.teams.find(item => item.id === id)
      if (!team) throw new TalentError('チーム案が見つかりません。',404)
      team.status = 'reviewed'
      return {ok:true}
    }
    default: throw new TalentError('対応していない操作です。')
  }
}
