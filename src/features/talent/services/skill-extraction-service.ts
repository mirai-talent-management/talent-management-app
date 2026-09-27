import type { ActiveSuggestionOrigin, SkillSuggestion } from '../types.ts'
import { detectSkills, normalizeSkill } from './skill-normalization-service.ts'

/** Exclude the entire sentence, never extract the harmless fragment of a sensitive sentence. */
export const SENSITIVE_SENTENCE_PATTERN = /政治思想|支持政党|支持して|政治信条|思想|信仰|宗教|投票先|持病|病気|通院|診断|障害|健康|うつ|服薬|腰痛|頭痛|症状|手術|怪我|けが|ケガ|痛み|体調|家庭|家族|子育て|育児|介護|離婚|結婚|妊娠|子どもが|子供が|一人暮らし|収入|所得|借金|貧困|経済的|生活費|年収|お金|金銭|嫌い|嫌われ|無能|不向き|問題人物|迷惑|役立たず|苦手|下手|低評価|やる気|モチベーション|意欲|積極性|熱心|消極的/iu
const NEGATIVE_OR_DESIRE = /できない|できません|未経験|経験がない|経験はない|やったことがない|したことがない|したい|やりたい|学びたい|興味がある|興味があります|挑戦したい/iu

export function splitSafeSentences(text: string): { safe: string[]; excluded: boolean } {
  const sentences = text.split(/[。！？!?\n]+/u).map(value => value.trim()).filter(Boolean)
  return { safe: sentences.filter(value => !SENSITIVE_SENTENCE_PATTERN.test(value)), excluded: sentences.some(value => SENSITIVE_SENTENCE_PATTERN.test(value)) }
}

/** Local rules produce pending proposals only; they never update profiles or approved talents. */
export function extractSkills(text: string, context: { profileId: string; origin: ActiveSuggestionOrigin; reference?: string }): SkillSuggestion[] {
  const found = new Map<string, SkillSuggestion>()
  for (const sentence of splitSafeSentences(text).safe) {
    if (NEGATIVE_OR_DESIRE.test(sentence)) continue
    const detected = detectSkills(sentence)
    // A human's free-text recommendation may be outside the demo dictionary.
    // Preserve that expression as a proposal; do not invent related abilities.
    const candidates = detected.length || context.origin !== 'recommendation' ? detected : [normalizeSkill(sentence)]
    for (const skill of candidates) {
      if (found.has(skill.normalizedName)) continue
      found.set(skill.normalizedName, {
        id: crypto.randomUUID(), profileId: context.profileId, originalText: sentence.slice(0,500), ...skill,
        source: context.origin === 'action_board' ? 'activity' : context.origin === 'recommendation' ? 'recommendation' : 'ai',
        origin: context.origin, evidence: { text: sentence, reference: context.reference ?? null, confidence: 0.72 },
        status: 'pending', createdAt: new Date().toISOString(), reviewedAt: null,
      })
    }
  }
  return [...found.values()]
}
