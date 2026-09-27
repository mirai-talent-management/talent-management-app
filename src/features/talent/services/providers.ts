import type { ActiveSuggestionOrigin, InterviewSession, PairingConstraint, SearchResponse, SkillSuggestion, TalentProfile, TeamComposition } from '../types.ts'
import { normalizeSkill, type NormalizedSkill } from './skill-normalization-service.ts'
import { extractSkills } from './skill-extraction-service.ts'
import { advanceInterview } from './interview-service.ts'
import { semanticSearch } from './semantic-search-service.ts'
import { buildTeam } from './team-builder-service.ts'

export const SKILL_SUGGESTIONS_JSON_SCHEMA = {
  type: 'array', items: {
    type: 'object', additionalProperties: false,
    required: ['id', 'profileId', 'originalText', 'normalizedName', 'relatedTerms', 'category', 'source', 'origin', 'evidence', 'status', 'createdAt', 'reviewedAt'],
    properties: {
      id: { type: 'string', minLength: 1 }, profileId: { type: 'string', minLength: 1 },
      originalText: { type: 'string', minLength: 1 }, normalizedName: { type: 'string', minLength: 1, maxLength: 80 },
      relatedTerms: { type: 'array', items: { type: 'string' } }, category: { enum: ['professional', 'personal', 'election', 'community', 'policy', 'strength'] },
      source: { enum: ['recommendation', 'ai', 'activity'] }, origin: { enum: ['interview', 'recommendation', 'action_board'] },
      evidence: { type: 'object', additionalProperties: false, required: ['text', 'reference', 'confidence'], properties: { text: { type: 'string' }, reference: { type: ['string', 'null'] }, confidence: { type: 'number', minimum: 0, maximum: 1 } } },
      status: { const: 'pending' }, createdAt: { type: 'string', format: 'date-time' }, reviewedAt: { type: 'null' },
    },
  },
} as const

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const onlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key))

/** Reject unknown fields, invalid provenance and pre-approved model output at the provider boundary. */
export function isSkillSuggestion(value: unknown): value is SkillSuggestion {
  if (!record(value) || !onlyKeys(value, SKILL_SUGGESTIONS_JSON_SCHEMA.items.required)) return false
  if (!nonempty(value.id) || !nonempty(value.profileId) || !nonempty(value.originalText) || !nonempty(value.normalizedName) || value.normalizedName.length > 80) return false
  if (!Array.isArray(value.relatedTerms) || !value.relatedTerms.every(item => typeof item === 'string')) return false
  if (!['professional', 'personal', 'election', 'community', 'policy', 'strength'].includes(String(value.category))) return false
  if (!['recommendation', 'ai', 'activity'].includes(String(value.source)) || !['interview', 'recommendation', 'action_board'].includes(String(value.origin))) return false
  if ((value.origin === 'recommendation' && value.source !== 'recommendation') || (value.origin === 'action_board' && value.source !== 'activity') || (value.origin === 'interview' && value.source !== 'ai')) return false
  if (!record(value.evidence) || !onlyKeys(value.evidence, ['text', 'reference', 'confidence'])) return false
  if (typeof value.evidence.text !== 'string' || !(value.evidence.reference === null || typeof value.evidence.reference === 'string') || typeof value.evidence.confidence !== 'number' || !Number.isFinite(value.evidence.confidence) || value.evidence.confidence < 0 || value.evidence.confidence > 1) return false
  return value.status === 'pending' && value.reviewedAt === null && typeof value.createdAt === 'string' && /^\d{4}-\d{2}-\d{2}T/u.test(value.createdAt) && Number.isFinite(Date.parse(value.createdAt))
}

export function assertSkillSuggestions(value: unknown): asserts value is SkillSuggestion[] {
  if (!Array.isArray(value) || !value.every(isSkillSuggestion)) throw new Error('スキル候補の構造化出力がスキーマに一致しません。')
}

/** Replace this interface at the server boundary to add a real structured-output provider later. */
export interface TalentAIProvider {
  readonly mode: 'mock' | 'external'
  normalize(text: string): Promise<NormalizedSkill>
  extract(text: string, context: { profileId: string; origin: ActiveSuggestionOrigin; reference?: string }): Promise<SkillSuggestion[]>
  interview(session: InterviewSession | null, profileId: string, answer: string): Promise<{ session: InterviewSession; suggestions: SkillSuggestion[] }>
  search(profiles: TalentProfile[], query: string): Promise<SearchResponse>
  composeTeam(profiles: TalentProfile[], preferences: PairingConstraint[], request: string): Promise<TeamComposition>
}

/** No network, no SDK and no real AI model. Private notes never leave this local process. */
export const mockTalentAIProvider: TalentAIProvider = {
  mode: 'mock', normalize: async text => normalizeSkill(text),
  extract: async (text, context) => { const result = extractSkills(text, context); assertSkillSuggestions(result); return result },
  interview: async (session, profileId, answer) => advanceInterview(session, profileId, answer),
  search: async (profiles, query) => semanticSearch(profiles, query),
  composeTeam: async (profiles, preferences, request) => buildTeam(profiles, preferences, request),
}
