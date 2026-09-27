import type { Activity, Role, Supporter } from '../../domain'

export type { Activity, Role }
export type SkillSource = 'self' | 'recommendation' | 'ai' | 'activity'
export type SkillCategory = 'professional' | 'personal' | 'election' | 'community' | 'policy' | 'strength'
export type Participation = 'election_active' | 'regular' | 'sometimes' | 'remote' | 'events_only' | 'resting'
export type SuggestionOrigin = 'slack' | 'interview' | 'recommendation' | 'action_board'
/** Slack remains a legacy stored origin only; no active extraction path accepts it. */
export type ActiveSuggestionOrigin = Exclude<SuggestionOrigin, 'slack'>
export type PairingKind = 'prefer_together' | 'strong_prefer_together' | 'prefer_avoid' | 'hard_avoid'

export interface TalentSkill {
  id: string
  originalText: string
  normalizedName: string
  relatedTerms: string[]
  category: SkillCategory
  source: SkillSource
  evidenceId: string | null
  approvedAt: string
  /** Recommendation that produced this approved skill. Never set for self/AI/activity skills. */
  recommendationId?: string | null
}
export interface SkillAgreement { skillId: string; actorId: string; createdAt: string }
export interface AgreementSummary { count: number; agreed: boolean; canAgree: boolean }
export interface AvailabilityDetails {
  regions: string[]
  weekdays: string[]
  timeSlots: string[]
  remote: boolean
  onsite: boolean
}
export interface TalentProfile extends Supporter {
  talents: TalentSkill[]
  participation: Participation[]
  availabilityDetails: AvailabilityDetails
  workExperience: string
  personalExperience: string
  electionExperience: string
  communityExperience: string
  policyInterests: string[]
  policyAdviceTopics: string[]
  policyAdvicePerspective: string
}
export interface SkillEvidence {
  id: string
  profileId: string
  source: SkillSource
  description: string
  reference: string | null
  occurredAt: string
}
export interface SkillSuggestion {
  id: string
  profileId: string
  originalText: string
  normalizedName: string
  relatedTerms: string[]
  category: SkillCategory
  source: Exclude<SkillSource, 'self'>
  origin: SuggestionOrigin
  evidence: { text: string; reference: string | null; confidence: number }
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt: string | null
}
export interface TalentRecommendation {
  id: string
  fromId: string
  fromName: string
  toId: string
  text: string
  source: 'recommendation'
  createdAt: string
  suggestionIds: string[]
}
export interface InterviewMessage { id: string; role: 'assistant' | 'user'; content: string }
export interface InterviewSession {
  id: string
  profileId: string
  messages: InterviewMessage[]
  step: number
  status: 'active' | 'paused' | 'completed'
  updatedAt: string
}
export interface PairingPreference {
  id: string
  ownerId: string
  targetId: string
  kind: PairingKind
  privateNote: string
  updatedAt: string
}
/** Only these fields may enter the team planner; private notes never cross this boundary. */
export type PairingConstraint = Pick<PairingPreference, 'ownerId' | 'targetId' | 'kind'>
export interface Actor { id: string; role: Role; name: string }
export interface SearchConstraints {
  skills: string[]
  policyTopic: string | null
  policyMode: 'interest' | 'advice' | null
  region: string | null
  weekday: string | null
  timeSlot: string | null
  mode: 'remote' | 'onsite' | null
}
export interface SearchResult {
  profileId: string
  score: number
  reasons: string[]
  matchedSkills: string[]
  confirmations: string[]
}
export interface SearchResponse {
  mode: 'mock'
  query: string
  constraints: SearchConstraints
  results: SearchResult[]
  notice: string
}
export interface TeamSlot { role: string; count: number }
export interface TeamAssignment {
  profileId: string
  role: string
  reasons: string[]
  confirmations: string[]
}
export interface TeamComposition {
  id: string
  request: string
  slots: TeamSlot[]
  assignments: TeamAssignment[]
  unfilled: TeamSlot[]
  status: 'proposal' | 'reviewed'
  createdAt: string
  notice: string
}
export interface TalentStore {
  version: 2
  profiles: TalentProfile[]
  activities: Activity[]
  evidence: SkillEvidence[]
  suggestions: SkillSuggestion[]
  recommendations: TalentRecommendation[]
  interviews: InterviewSession[]
  pairingPreferences: PairingPreference[]
  teams: TeamComposition[]
  skillAgreements: SkillAgreement[]
}
/** Only this projection may cross the server/browser boundary. Never includes pairing preferences. */
export interface BootstrapData {
  mode: 'mock'
  actor: Actor
  profiles: TalentProfile[]
  activities: Activity[]
  evidence: SkillEvidence[]
  suggestions: SkillSuggestion[]
  recommendations: TalentRecommendation[]
  interview: InterviewSession | null
  teams: TeamComposition[]
  demoAccounts: Actor[]
  /** Public totals and only the current viewer's own state; voter identities stay server-side. */
  agreementSummaries: Record<string, AgreementSummary>
}
export type ProfilePatch = Pick<TalentProfile, 'name' | 'kana' | 'headline' | 'location' | 'bio' | 'email' | 'slack' | 'hoursPerMonth' | 'interests' | 'motivation' | 'experience' | 'workExperience' | 'personalExperience' | 'electionExperience' | 'communityExperience' | 'participation' | 'availabilityDetails' | 'policyInterests' | 'policyAdviceTopics' | 'policyAdvicePerspective'>

export const SOURCE_LABELS: Record<SkillSource, string> = { self: '本人申告', recommendation: '他者推薦', ai: 'AI発見・本人承認', activity: '活動実績' }
export const CATEGORY_LABELS: Record<SkillCategory, string> = { professional: '仕事・専門', personal: 'プライベート', election: '選挙活動', community: '平時の活動', policy: '政策分野', strength: '人となり・強み' }
export const PARTICIPATION_LABELS: Record<Participation, string> = { election_active: '選挙期間は積極参加', regular: '平時も参加', sometimes: '時々参加', remote: 'オンライン中心', events_only: 'イベントのみ', resting: '現在は休みたい' }
