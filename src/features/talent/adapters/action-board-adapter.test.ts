import assert from 'node:assert/strict'
import test from 'node:test'
import {
  achievementsToActivityRecords,
  activityRecordsToTalentCandidates,
  MockActionBoardActivityAdapter,
  mockActivityEvidence,
} from './action-board-adapter.ts'
import type { ActionBoardActivityRecord } from './action-board-adapter.ts'

const record: ActionBoardActivityRecord = {
  id: 'achievement-1', externalUserId: 'auth-user-1', missionId: 'mission-1',
  title: 'イベントへの参加', occurredAt: '2026-09-12T02:00:00.000Z', reference: null, source: 'action_board',
}

test('参加実績をイベント運営能力と推論しない', () => {
  const records = achievementsToActivityRecords('auth-user-1', [{
    id: record.id, mission_id: record.missionId, user_id: record.externalUserId, created_at: record.occurredAt,
  }], [{ id: record.missionId, title: 'イベント運営体験会への参加', content: '撮影や音響を体験できます' }])
  const candidates = activityRecordsToTalentCandidates({ profileId: 'talent-1', externalUserId: 'auth-user-1' }, records)
  assert.equal(candidates.evidence.length, 1)
  assert.match(candidates.evidence[0].description, /担当役割や運営能力は未確認/)
  assert.equal(candidates.evidence[0].profileId, 'talent-1')
  assert.deepEqual(candidates.suggestions, [])
})

test('明示された担当の候補も本人承認前のpendingに限定する', () => {
  const candidates = activityRecordsToTalentCandidates({ profileId: 'talent-1', externalUserId: 'auth-user-1' }, [{
    ...record, recordedRole: { name: 'ハガシ', evidenceText: '候補者との会話終了・交代を促す担当をしました', reference: 'mock:role:1' },
  }])
  assert.equal(candidates.suggestions[0].normalizedName, 'ハガシ')
  assert.equal(candidates.suggestions[0].status, 'pending')
  assert.equal(candidates.suggestions[0].reviewedAt, null)
  assert.equal(candidates.suggestions[0].source, 'activity')
  assert.equal(candidates.suggestions[0].origin, 'action_board')
  assert.equal(candidates.suggestions[0].evidence.reference, 'mock:role:1')
  assert.ok(!candidates.suggestions[0].relatedTerms.some((term) => term.includes('ポスター')))
})

test('明示identity mappingで他人の実績を除外し重複を抑制する', () => {
  const candidates = activityRecordsToTalentCandidates({ profileId: 'talent-1', externalUserId: 'auth-user-1' }, [
    record, { ...record }, { ...record, id: 'other', externalUserId: 'auth-user-2' },
  ])
  assert.equal(candidates.evidence.length, 1)
})

test('null userや参照不明mission、不正な日時から証拠を生成しない', () => {
  const records = achievementsToActivityRecords('auth-user-1', [
    { id: 'null-user', user_id: null, mission_id: 'mission-1', created_at: record.occurredAt },
    { id: 'missing', user_id: 'auth-user-1', mission_id: 'missing', created_at: record.occurredAt },
    { id: 'bad-date', user_id: 'auth-user-1', mission_id: 'mission-1', created_at: 'invalid' },
  ], [{ id: 'mission-1', title: '地域活動' }])
  assert.deepEqual(records, [])
})

test('推測された健康・人物評価や空の担当根拠はスキル候補にならない', () => {
  for (const recordedRole of [
    { name: '健康状態が良い', evidenceText: '元気そうだった', reference: null },
    { name: '音響', evidenceText: ' ', reference: null },
  ]) {
    const candidates = activityRecordsToTalentCandidates({ profileId: 'talent-1', externalUserId: 'auth-user-1' }, [{ ...record, recordedRole }])
    assert.deepEqual(candidates.suggestions, [])
  }
})

test('Mock adapterはユーザーごとに複製を返し、サンプルは根拠にも明記する', async () => {
  const adapter = new MockActionBoardActivityAdapter([record, { ...record, id: 'other', externalUserId: 'auth-user-2' }])
  const records = await adapter.listActivityRecords('auth-user-1')
  assert.equal(adapter.mode, 'mock')
  assert.equal(records.length, 1)
  records[0].title = '変更'
  assert.equal((await adapter.listActivityRecords('auth-user-1'))[0].title, record.title)
  const mock = mockActivityEvidence('talent-1')
  assert.equal(mock.evidence.length, 2)
  assert.equal(mock.suggestions.length, 1)
  assert.ok(mock.evidence.every((evidence) => evidence.description.includes('サンプル')))
  assert.ok(mock.suggestions.every((suggestion) => suggestion.status === 'pending'))
})
