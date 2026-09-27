import type { PairingConstraint, TalentProfile, TeamAssignment, TeamComposition, TeamSlot } from '../types.ts'
import { checkAvailability, parseSearchConstraints, skillMatches } from './semantic-search-service.ts'
import { normalizeSkill } from './skill-normalization-service.ts'

const knownRoles = '音響対応|音響|PA|写真撮影|撮影|カメラ|ハガシ|はがし|ビラ配り|ビラ|チラシ配り|チラシ配布|初参加者フォロー|初参加フォロー|初参加|フォロー|受付・案内|受付|司会・進行|司会|配信|動画編集|SNS運用|イベント運営'

/** Role counts are explicit. Unknown requested roles remain unfilled, never guessed. */
export function parseTeamSlots(request: string): TeamSlot[] {
  const normalized = request.normalize('NFKC').replace(/一人/gu, '1人').replace(/二人/gu, '2人').replace(/三人/gu, '3人').replace(/四人/gu, '4人')
  const slots: TeamSlot[] = []
  const add = (raw: string, count: number, unknownRole = false) => {
    const clean = raw.trim().replace(/^(?:と|、|,|・|および)+/u, '')
    const role = unknownRole ? clean : /^(?:初参加|フォロー)$/u.test(clean) ? '初参加者フォロー' : normalizeSkill(clean).normalizedName
    const existing = slots.find(slot => slot.role === role)
    if (existing) existing.count += count
    else if (role && count > 0) slots.push({ role, count })
  }
  const expression = new RegExp(`(${knownRoles})\\s*(?:を|が|は|担当)?\\s*([0-9]{1,3})\\s*(?:人|名)?`, 'giu')
  const ranges: [number, number][] = []
  for (const match of normalized.matchAll(expression)) { add(match[1], Number(match[2])); ranges.push([match.index!, match.index! + match[0].length]) }
  // Catch separately delimited roles not in the dictionary (e.g. 手話通訳2人).
  const unknown = /(?:^|[、,・;；\n])\s*([^、,・;；\n\d]{1,24}?)\s*([0-9]{1,3})\s*(?:人|名)?(?=$|[、,・;；\s。])/gu
  for (const match of normalized.matchAll(unknown)) {
    if (ranges.some(([start, end]) => match.index! < end && match.index! + match[0].length > start)) continue
    add(match[1], Number(match[2]), true)
  }
  if (!slots.length) {
    const oneEach = new RegExp(knownRoles, 'giu')
    const found = [...normalized.matchAll(oneEach)].map(match => match[0])
    for (const role of [...new Set(found)]) add(role, 1)
  }
  return slots
}

export const MAX_TEAM_SIZE = 40
interface PartialTeam { assignments: TeamAssignment[]; ids: Set<string>; avoid: number; strongTogether: number; together: number }
const pairHas = (preference: PairingConstraint, a: string, b: string) => (preference.ownerId === a && preference.targetId === b) || (preference.ownerId === b && preference.targetId === a)
const compare = (a: PartialTeam, b: PartialTeam) => b.assignments.length - a.assignments.length || a.avoid - b.avoid || b.strongTogether - a.strongTogether || b.together - a.together || a.assignments.map(item => item.profileId).join(',').localeCompare(b.assignments.map(item => item.profileId).join(','))

/** Local bounded search. Preference notes are neither read nor returned. */
export function buildTeam(profiles: TalentProfile[], preferences: PairingConstraint[], request: string): TeamComposition {
  const constraints = parseSearchConstraints(request)
  const slots = parseTeamSlots(request)
  if (slots.reduce((sum, slot) => sum + slot.count, 0) > MAX_TEAM_SIZE) return { id: crypto.randomUUID(), request, slots, assignments: [], unfilled: slots, status: 'proposal', createdAt: new Date().toISOString(), notice: `ローカルの規則によるサンプルは最大${MAX_TEAM_SIZE}人まで対応しています。人数を減らして再実行してください。外部AIは利用していません。` }
  const eligible = profiles.filter(profile => checkAvailability(profile, constraints).eligible)
  const candidates = new Map(slots.map(slot => [slot.role, eligible.filter(profile => skillMatches(profile, slot.role).length > 0)]))
  const expanded = slots.flatMap(slot => Array.from({ length: slot.count }, () => slot.role))
    .sort((a, b) => (candidates.get(a)?.length ?? 0) - (candidates.get(b)?.length ?? 0))
  let beam: PartialTeam[] = [{ assignments: [], ids: new Set(), avoid: 0, strongTogether: 0, together: 0 }]
  for (const role of expanded) {
    const next: PartialTeam[] = []
    for (const partial of beam) {
      next.push(partial)
      for (const profile of candidates.get(role) ?? []) {
        if (partial.ids.has(profile.id)) continue
        if (preferences.some(preference => preference.kind === 'hard_avoid' && [...partial.ids].some(id => pairHas(preference, id, profile.id)))) continue
        const pairPreferences = preferences.filter(preference => [...partial.ids].some(id => pairHas(preference, id, profile.id)))
        const assignment: TeamAssignment = { profileId: profile.id, role, reasons: [`本人確認済みの「${role}」を登録`, '1人1役で配置'], confirmations: checkAvailability(profile, constraints).confirmations }
        next.push({ assignments: [...partial.assignments, assignment], ids: new Set([...partial.ids, profile.id]),
          avoid: partial.avoid + pairPreferences.filter(preference => preference.kind === 'prefer_avoid').length,
          strongTogether: partial.strongTogether + pairPreferences.filter(preference => preference.kind === 'strong_prefer_together').length,
          together: partial.together + pairPreferences.filter(preference => preference.kind === 'prefer_together').length })
      }
    }
    const seen = new Set<string>()
    beam = next.sort(compare).filter(partial => {
      const key = partial.assignments.map(assignment => `${assignment.profileId}:${assignment.role}`).sort().join('|')
      if (seen.has(key)) return false
      seen.add(key); return true
    }).slice(0, 320)
  }
  const assignments = (beam.sort(compare)[0]?.assignments ?? []).sort((a, b) => slots.findIndex(slot => slot.role === a.role) - slots.findIndex(slot => slot.role === b.role))
  const unfilled = slots.map(slot => ({ role: slot.role, count: slot.count - assignments.filter(assignment => assignment.role === slot.role).length })).filter(slot => slot.count > 0)
  return { id: crypto.randomUUID(), request, slots, assignments, unfilled, status: 'proposal', createdAt: new Date().toISOString(),
    notice: `ローカルの規則による編成案です。外部AIは利用していません。${!slots.length ? '役割と人数を明記してください。' : unfilled.length ? '満たせない役割は不足として表示しています。' : ''}登録された地域・曜日・時間帯で照合しています。当日の参加可否、役割の詳細、機材は本人に確認してください。` }
}
