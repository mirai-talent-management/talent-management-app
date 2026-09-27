import test from 'node:test'
import assert from 'node:assert/strict'
import type { PairingPreference, TalentProfile, TalentSkill } from '../types.ts'
import { createSeedStore, prepareCasualDemoSkills } from '../mocks/seed.ts'
import { CASUAL_SKILL_EXAMPLES } from '../data/casual-skill-examples.ts'
import { buildTeam, parseTeamSlots } from './team-builder-service.ts'
import { checkAvailability, parseSearchConstraints, semanticSearch } from './semantic-search-service.ts'
import { normalizeSkill } from './skill-normalization-service.ts'
import { assertSkillSuggestions, mockTalentAIProvider } from './providers.ts'
import { extractSkills } from './skill-extraction-service.ts'

const stamp = '2026-09-22T09:00:00.000Z'
const skill = (name: string): TalentSkill => ({ id: name, originalText: name, ...normalizeSkill(name), source: 'self', evidenceId: null, approvedAt: stamp })
function person(id: string, names: string[]): TalentProfile {
  return { ...createSeedStore().profiles[0], id, talents: names.map(skill) }
}
function preference(ownerId: string, targetId: string, kind: PairingPreference['kind']): PairingPreference {
  return { id: `${ownerId}-${targetId}-${kind}`, ownerId, targetId, kind, privateNote: 'NEVER_PUBLISH_OR_USE_THIS_NOTE', updatedAt: stamp }
}

test('seed contains independent approved records and two pending proposals', () => {
  const a = createSeedStore(), b = createSeedStore()
  assert.equal(a.profiles.length, 18)
  assert.equal(a.suggestions.filter(item => item.profileId === 's1' && item.status === 'pending').length, 2)
  assert.equal(a.interviews.length, 0)
  for (const pending of a.suggestions) assert.ok(!a.profiles.find(profile => profile.id === pending.profileId)?.talents.some(talent => talent.id === pending.id))
  a.profiles[0].talents.length = 0
  assert.ok(b.profiles[0].talents.length > 0)
})

test('fictional profiles include every casual example with its original wording', () => {
  const store = createSeedStore()
  assert.equal(store.demoSkillRevision, 1)
  assert.equal(CASUAL_SKILL_EXAMPLES.length, 42)
  for (const example of CASUAL_SKILL_EXAMPLES) {
    const profile = store.profiles.find(item => item.id === example.profileId)
    const matches = profile?.talents.filter(item => item.originalText === example.name)
    assert.equal(matches?.length, 1, example.name)
    assert.equal(matches[0].normalizedName, example.name)
    assert.equal(matches[0].category, example.category)
    assert.equal(matches[0].source, 'self')
  }
  assert.equal(normalizeSkill('朗らか').normalizedName, '朗らか')
  assert.equal(normalizeSkill('簿記経験').normalizedName, '簿記経験')
})

test('adding new demo examples to an existing local store preserves edits and runs once', () => {
  const store = createSeedStore()
  const profile = store.profiles[0]
  const existing = skill('自作の得意分野')
  profile.talents.push(existing)
  profile.bio = '利用者が編集した自己紹介'
  profile.talents = profile.talents.filter(item => !item.id.startsWith('seed-casual-'))
  delete store.demoSkillRevision
  prepareCasualDemoSkills(store)
  assert.equal(profile.bio, '利用者が編集した自己紹介')
  assert.ok(profile.talents.some(item => item.id === existing.id))
  assert.equal(profile.talents.filter(item => item.id.startsWith('seed-casual-')).length, 3)
  profile.talents = profile.talents.filter(item => item.originalText !== '明るい')
  prepareCasualDemoSkills(store)
  assert.ok(!profile.talents.some(item => item.originalText === '明るい'))
})

test('casual registered skills can be found with natural wording', () => {
  const profiles = createSeedStore().profiles
  const result = semanticSearch(profiles, '朗らかな人と活動したい')
  assert.ok(result.constraints.skills.includes('朗らか'))
  assert.ok(result.results.some(item => item.profileId === 's2' && item.matchedSkills.includes('朗らか')))
  assert.ok(semanticSearch(profiles, 'フッ軽な人').results.some(item => item.profileId === 's6'))
})

test('policy searches distinguish declared interest from declared advice', () => {
  const profiles = createSeedStore().profiles
  const advisers = semanticSearch(profiles,'情報アクセシビリティについて助言できる人')
  assert.deepEqual(advisers.results.map(item => item.profileId),['s3'])
  assert.ok(advisers.results[0].reasons.some(reason => reason.includes('本人申告')))
  const interested = semanticSearch(profiles,'情報アクセシビリティに関心がある人')
  assert.deepEqual(interested.results.map(item => item.profileId),['s1','s3'])
  assert.equal(interested.constraints.policyMode,'interest')
})

test('search enforces declared region, weekday, time, online mode and resting state', () => {
  const base = person('eligible', ['写真撮影'])
  const variants: TalentProfile[] = [base,
    { ...base, id: 'resting', participation: ['resting', 'election_active'] },
    { ...base, id: 'wrong-region', availabilityDetails: { ...base.availabilityDetails, regions: ['大阪府'] } },
    { ...base, id: 'wrong-day', availabilityDetails: { ...base.availabilityDetails, weekdays: ['日'] } },
    { ...base, id: 'wrong-time', availabilityDetails: { ...base.availabilityDetails, timeSlots: ['午前'] } },
    { ...base, id: 'no-remote', availabilityDetails: { ...base.availabilityDetails, remote: false } },
    { ...base, id: 'pending-only', talents: [{ ...skill('写真撮影'), approvedAt: '' }] },
  ]
  const result = semanticSearch(variants, '横浜で土曜日午後、オンラインで写真を撮影できる人')
  assert.deepEqual(result.results.map(item => item.profileId), ['eligible'])
  assert.ok(result.results[0].confirmations.some(text => text.includes('指定日の参加可否')))
  assert.ok(result.results[0].reasons.every(text => !text.includes('意欲')))
})

test('calendar dates and hour ranges constrain the entire requested period', () => {
  const afternoon = parseSearchConstraints('横浜 2026年10月10日 13〜17時 写真撮影')
  assert.equal(afternoon.weekday, '土曜日')
  assert.equal(afternoon.timeSlot, '午後')
  const spanning = parseSearchConstraints('土曜日 11〜17時')
  assert.equal(spanning.timeSlot, '午前・午後')
  assert.equal(checkAvailability(person('p', ['写真撮影']), spanning).eligible, false)
})

test('semantic score stays within 100 even if several talents match one requested skill', () => {
  const profile = person('p', ['写真撮影'])
  profile.talents.push({ ...skill('カメラ操作'), id: 'camera', normalizedName: 'カメラ操作', relatedTerms: ['写真撮影'] })
  const result = semanticSearch([profile], '写真撮影')
  assert.equal(result.results[0].matchedSkills.length, 2)
  assert.equal(result.results[0].score, 100)
  assert.equal(semanticSearch([profile], '量子機器の校正をできる人').results.length, 0)
})

test('nine-person request parses every role and yields unique, eligible assignments', () => {
  const store = createSeedStore()
  const request = '横浜で2026年10月10日 13〜17時、音響1人、撮影1人、ハガシ2人、ビラ4人、初参加フォロー1人'
  const team = buildTeam(store.profiles, [preference('s1','s2','hard_avoid')], request)
  assert.equal(team.assignments.length, 9)
  assert.equal(new Set(team.assignments.map(item => item.profileId)).size, 9)
  assert.deepEqual(team.unfilled, [])
  assert.deepEqual(team.slots.map(item => item.count), [1, 1, 2, 4, 1])
  const ids = team.assignments.map(item => item.profileId)
  assert.ok(!(ids.includes('s1') && ids.includes('s2')))
  assert.ok(team.assignments.every(item => checkAvailability(store.profiles.find(profile => profile.id === item.profileId)!, parseSearchConstraints(request)).eligible))
})

test('Hard Avoid works in either direction and overrides any positive preference', () => {
  const profiles = [person('a', ['音響対応']), person('b', ['写真撮影']), person('c', ['写真撮影'])]
  for (const pair of [preference('a', 'b', 'hard_avoid'), preference('b', 'a', 'hard_avoid')]) {
    const team = buildTeam(profiles, [pair, preference('a', 'b', 'strong_prefer_together')], '音響1人、撮影1人')
    assert.deepEqual(new Set(team.assignments.map(item => item.profileId)), new Set(['a', 'c']))
    const impossible = buildTeam(profiles.slice(0, 2), [pair], '音響1人、撮影1人')
    assert.equal(impossible.assignments.length, 1)
    assert.equal(impossible.unfilled.reduce((total, item) => total + item.count, 0), 1)
  }
})

test('Prefer Avoid outranks strong preference when an equally complete alternative exists', () => {
  const profiles = [person('a', ['音響対応']), person('b', ['写真撮影']), person('c', ['写真撮影'])]
  const team = buildTeam(profiles, [preference('b', 'a', 'prefer_avoid'), preference('a', 'b', 'strong_prefer_together')], '音響1人、撮影1人')
  assert.deepEqual(new Set(team.assignments.map(item => item.profileId)), new Set(['a', 'c']))
})

test('a strong preference outranks many ordinary preferences lexicographically', () => {
  const profiles = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => person(id, ['ビラ配り']))
  const preferences = [preference('a', 'b', 'strong_prefer_together')]
  for (const [index, first] of ['c', 'd', 'e', 'f'].entries()) for (const second of ['c', 'd', 'e', 'f'].slice(index + 1)) preferences.push(preference(first, second, 'prefer_together'))
  const ids = buildTeam(profiles, preferences, 'ビラ4人').assignments.map(item => item.profileId)
  assert.ok(ids.includes('a') && ids.includes('b'))
})

test('private notes are not accessed and public results never disclose pairing decisions', () => {
  const profiles = [person('a', ['写真撮影']), person('b', ['写真撮影']), person('c', ['写真撮影'])]
  const pair = preference('a', 'b', 'hard_avoid')
  Object.defineProperty(pair, 'privateNote', { get() { throw new Error('Private note was accessed') } })
  const team = buildTeam(profiles, [pair], '撮影2人')
  assert.doesNotThrow(() => JSON.stringify(team))
  assert.doesNotMatch(JSON.stringify(team), /hard_avoid|privateNote|非公開|相性|回避|NEVER_PUBLISH/u)
})

test('unknown roles stay unfilled and excessive size is rejected without silent truncation', () => {
  const profiles = [person('a', ['翻訳']), person('b', ['ビラ配り'])]
  assert.deepEqual(parseTeamSlots('手話通訳2人'), [{ role: '手話通訳', count: 2 }])
  const unknown = buildTeam(profiles, [], '手話通訳2人')
  assert.deepEqual(unknown.assignments, [])
  assert.equal(unknown.unfilled[0].count, 2)
  const tooLarge = buildTeam(profiles, [], 'ビラ41人')
  assert.equal(tooLarge.assignments.length, 0)
  assert.equal(tooLarge.unfilled[0].count, 41)
  assert.match(tooLarge.notice, /最大40人/u)
})

test('provider guards reject pre-approved, malformed or extra private fields', async () => {
  const candidates = await mockTalentAIProvider.extract('写真撮影が得意です。', { profileId: 'p', origin: 'interview' })
  assert.doesNotThrow(() => assertSkillSuggestions(candidates))
  assert.throws(() => assertSkillSuggestions([{ ...candidates[0], status: 'approved' }]))
  assert.throws(() => assertSkillSuggestions([{ ...candidates[0], privateNote: 'hidden' }]))
  assert.throws(() => assertSkillSuggestions([{ ...candidates[0], source: 'activity' }]))
  assert.throws(() => assertSkillSuggestions([{ ...candidates[0], evidence: { ...candidates[0].evidence, confidence: 5 } }]))
})

test('positive observed strengths are candidate skills without inferring family circumstances', () => {
  const context = { profileId: 'p', origin: 'recommendation' as const }
  const candidates = extractSkills('イベントで子供への対応が上手だった。調整役として場を和ませていました。', context)
  assert.deepEqual(candidates.map(candidate => candidate.normalizedName), ['子どもへの対応', '調整・橋渡し', '場を和ませる'])
  assert.deepEqual(extractSkills('子育てをしているので子供への対応が上手です。', context), [])
  assert.ok(candidates.every(candidate => candidate.status === 'pending' && candidate.source === 'recommendation'))
})
