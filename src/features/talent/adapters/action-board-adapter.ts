import type { SkillCategory, SkillEvidence, SkillSuggestion } from '../types.ts'

/** Read model based on Action Board develop at 1b269081aaee4a145a125af46d5c90b88d9e5a4e. */
export interface ActionBoardAchievement {
  id: string
  mission_id: string | null
  user_id: string | null
  created_at: string
  season_id?: string | null
}

export interface ActionBoardMission {
  id: string
  title: string
  content?: string | null
  slug?: string
}

/** A role must come from an explicit record, never be inferred from attending a mission. */
export interface ActionBoardRecordedRole {
  name: string
  evidenceText: string
  reference: string | null
}

export interface ActionBoardActivityRecord {
  id: string
  externalUserId: string
  missionId: string
  title: string
  occurredAt: string
  reference: string | null
  source: 'action_board'
  recordedRole?: ActionBoardRecordedRole
}

/** Future server-side Supabase implementation must authenticate and authorize the caller. */
export interface ActionBoardActivityAdapter {
  readonly mode: 'mock' | 'supabase'
  listActivityRecords(externalUserId: string): Promise<ActionBoardActivityRecord[]>
}

export interface ActionBoardTalentIdentity {
  profileId: string
  /** Action Board auth.users.id. Kept separate from a prototype profile identifier. */
  externalUserId: string
}

export interface ActionBoardTalentCandidates {
  evidence: SkillEvidence[]
  suggestions: SkillSuggestion[]
}

/** Plain achievements prove completion only; they do not prove the person's role or capability. */
export function achievementsToActivityRecords(
  externalUserId: string,
  achievements: readonly ActionBoardAchievement[],
  missions: readonly ActionBoardMission[],
): ActionBoardActivityRecord[] {
  const byMissionId = new Map(missions.map((mission) => [mission.id, mission]))
  const seen = new Set<string>()
  return achievements.flatMap((achievement): ActionBoardActivityRecord[] => {
    if (achievement.user_id !== externalUserId || !achievement.mission_id || seen.has(achievement.id)) return []
    const mission = byMissionId.get(achievement.mission_id)
    if (!mission || !Number.isFinite(Date.parse(achievement.created_at))) return []
    seen.add(achievement.id)
    return [{
      id: achievement.id,
      externalUserId,
      missionId: mission.id,
      title: mission.title,
      occurredAt: achievement.created_at,
      reference: `action-board:achievement:${achievement.id}`,
      source: 'action_board',
    }]
  })
}

const ROLE_CATEGORIES: Readonly<Record<string, SkillCategory>> = {
  'ポスター貼り': 'election',
  'ビラ配り': 'election',
  'ハガシ': 'election',
  '撮影': 'professional',
  '音響': 'professional',
  '受付': 'community',
  '設営': 'community',
  'イベント運営': 'community',
  '初参加者フォロー': 'community',
}

/** Explicit, one-way identity mapping; no direct production connection and no automatic approval. */
export function activityRecordsToTalentCandidates(
  identity: ActionBoardTalentIdentity,
  records: readonly ActionBoardActivityRecord[],
): ActionBoardTalentCandidates {
  const evidence: SkillEvidence[] = []
  const suggestions: SkillSuggestion[] = []
  const seen = new Set<string>()
  for (const record of records) {
    if (record.externalUserId !== identity.externalUserId || seen.has(record.id) || !Number.isFinite(Date.parse(record.occurredAt))) continue
    seen.add(record.id)
    const recordedRole = record.recordedRole
    const category = recordedRole ? ROLE_CATEGORIES[recordedRole.name] : undefined
    const role = category && recordedRole?.evidenceText.trim() ? recordedRole : undefined
    evidence.push({
      id: `action-board-evidence:${identity.profileId}:${record.id}`,
      profileId: identity.profileId,
      source: 'activity',
      description: role?.evidenceText.trim()
        ? `${record.title} — 記録された担当：${role.name}。${role.evidenceText}`
        : `${record.title} — 活動・ミッションの参加／達成記録。担当役割や運営能力は未確認。`,
      reference: record.reference,
      occurredAt: record.occurredAt,
    })
    if (!role || !category || !role.evidenceText.trim()) continue
    suggestions.push({
      id: `action-board-suggestion:${identity.profileId}:${record.id}`,
      profileId: identity.profileId,
      originalText: role.evidenceText,
      normalizedName: role.name,
      relatedTerms: role.name === 'ハガシ' ? ['会話終了・交代の声かけ', '街頭活動の進行補助'] : [],
      category,
      source: 'activity',
      origin: 'action_board',
      evidence: { text: role.evidenceText, reference: role.reference ?? record.reference, confidence: 0.9 },
      status: 'pending',
      createdAt: record.occurredAt,
      reviewedAt: null,
    })
  }
  return { evidence, suggestions }
}

/** Entirely local fixture adapter. It never calls Action Board or Supabase. */
export class MockActionBoardActivityAdapter implements ActionBoardActivityAdapter {
  readonly mode = 'mock' as const
  private readonly records: readonly ActionBoardActivityRecord[]

  constructor(records: readonly ActionBoardActivityRecord[] = []) {
    this.records = records
  }

  async listActivityRecords(externalUserId: string): Promise<ActionBoardActivityRecord[]> {
    return this.records.filter((record) => record.externalUserId === externalUserId).map((record) => ({
      ...record,
      recordedRole: record.recordedRole ? { ...record.recordedRole } : undefined,
    }))
  }
}

/** Local demonstration only: both the attendance and explicit role below are fictional. */
export function mockActivityEvidence(profileId: string): ActionBoardTalentCandidates {
  const externalUserId = `mock-action-board-user:${profileId}`
  const records: ActionBoardActivityRecord[] = [{
    id: `mock-meetup:${profileId}`,
    externalUserId,
    missionId: 'mock-community-meetup',
    title: '【サンプル】地域ミートアップへの参加',
    occurredAt: '2026-09-06T05:00:00.000Z',
    reference: `mock:action-board:meetup:${profileId}`,
    source: 'action_board',
  }, {
    id: `mock-posters:${profileId}`,
    externalUserId,
    missionId: 'mock-poster-activity',
    title: '【サンプル】ポスター貼りミッション',
    occurredAt: '2026-09-12T02:00:00.000Z',
    reference: `mock:action-board:posters:${profileId}`,
    source: 'action_board',
    recordedRole: {
      name: 'ポスター貼り',
      evidenceText: '【架空の担当記録】地域のポスター貼りを担当し、作業完了を記録しました。',
      reference: `mock:action-board:poster-role:${profileId}`,
    },
  }]
  return activityRecordsToTalentCandidates({ profileId, externalUserId }, records)
}
