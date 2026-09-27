import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSkill } from './skill-normalization-service.ts'
import { extractSkills, splitSafeSentences } from './skill-extraction-service.ts'
import { advanceInterview } from './interview-service.ts'

test('自然文の元表現は候補に残し、正規化名と関連語を分離する', () => {
  const result = extractSkills('地域のお知らせをCanvaで制作しています', { profileId: 'p1', origin: 'interview' })
  assert.equal(result[0].originalText, '地域のお知らせをCanvaで制作しています')
  assert.equal(result[0].normalizedName, 'グラフィックデザイン')
  assert.ok(result[0].relatedTerms.includes('Canva'))
  assert.deepEqual(normalizeSkill('  フットワーク軽い  '), { normalizedName: 'フットワーク軽い', relatedTerms: [], category: 'personal' })
})

test('敏感情報が同じ文に含まれた場合、スキル部分だけも抽出しない', () => {
  const sentences = [
    '政治思想が同じなので音響を担当できます',
    '支持政党についての動画を制作しています',
    '健康状態が良いので写真撮影ができます',
    '障害があるが音響を担当できます',
    '家庭の事情がありますが動画編集ができます',
    '収入が低いので音響を仕事にしています',
    '彼は問題人物ですが写真撮影ができます',
    '熱心なので音響ができると思います',
  ]
  for (const sentence of sentences) {
    assert.deepEqual(extractSkills(sentence, { profileId: 'p1', origin: 'interview' }), [], sentence)
    assert.equal(splitSafeSentences(sentence).excluded, true, sentence)
  }
})

test('敏感な文の前後にある安全な独立文のみ候補化する', () => {
  const text = '写真撮影を担当しました。家庭の事情がありますが音響もできます。Canvaでバナーを制作しています。'
  const result = extractSkills(text, { profileId: 'p1', origin: 'interview', reference: 'mock:interview:123' })
  assert.equal(splitSafeSentences(text).excluded, true)
  assert.deepEqual(result.map((skill) => skill.normalizedName), ['写真撮影', 'グラフィックデザイン'])
  assert.ok(result.every((skill) => !skill.evidence.text.includes('家庭')))
  assert.ok(result.every((skill) => skill.evidence.reference === 'mock:interview:123'))
})

test('意欲、願望、未経験、否定は能力候補にしない', () => {
  for (const text of ['動画編集に興味があります', '音響を担当したい', '写真撮影はできません', 'SNS運用は未経験です', '積極性が高く写真撮影ができると思います']) {
    assert.deepEqual(extractSkills(text, { profileId: 'p1', origin: 'interview' }), [], text)
  }
})

test('抽出した候補はsource付きpendingで、重複タグを1件にする', () => {
  for (const origin of ['interview', 'recommendation', 'action_board'] as const) {
    const result = extractSkills('音響を担当しました。音響の仕事をしています。', { profileId: 'p1', origin })
    assert.equal(result.length, 1)
    assert.equal(result[0].status, 'pending')
    assert.equal(result[0].reviewedAt, null)
    assert.equal(result[0].origin, origin)
    assert.equal(result[0].profileId, 'p1')
    assert.equal(result[0].source, origin === 'recommendation' ? 'recommendation' : origin === 'action_board' ? 'activity' : 'ai')
    assert.ok(result[0].evidence.confidence >= 0 && result[0].evidence.confidence <= 1)
  }
})

test('写真の回答は機材を、仕事の回答は担当職務を深掘りする', () => {
  const photography = advanceInterview(null, 'p1', '写真撮影が得意です')
  assert.match(photography.session.messages.at(-1)?.content ?? '', /機材/)
  const work = advanceInterview(null, 'p1', '会社で営業の仕事をしています')
  assert.match(work.session.messages.at(-1)?.content ?? '', /役割.*担当/)
  assert.deepEqual(work.suggestions, [])
})

test('pausedインタビューを空回答で再開しても回答数や既存会話は増えない', () => {
  const initial = advanceInterview(null, 'p1', '写真撮影が得意です').session
  const paused = { ...initial, status: 'paused' as const }
  const resumed = advanceInterview(paused, 'p1', '')
  assert.equal(resumed.session.id, initial.id)
  assert.equal(resumed.session.status, 'active')
  assert.equal(resumed.session.step, 1)
  assert.deepEqual(resumed.session.messages, initial.messages)
  assert.equal(paused.status, 'paused')
  assert.deepEqual(resumed.suggestions, [])
})

test('4回答で完成し、最後の意欲回答から能力を抽出しない', () => {
  const first = advanceInterview(null, 'p1', '写真撮影が得意です')
  const second = advanceInterview(first.session, 'p1', '一眼レフで街の風景を撮っています')
  const third = advanceInterview(second.session, 'p1', 'Canvaでバナーを制作しています')
  assert.equal(third.session.status, 'active')
  assert.match(third.session.messages.at(-1)?.content ?? '', /頻度|時間帯/)
  const fourth = advanceInterview(third.session, 'p1', '毎週末参加できます。音響を担当できます。')
  assert.equal(fourth.session.status, 'completed')
  assert.equal(fourth.session.step, 4)
  assert.deepEqual(fourth.suggestions.map((skill) => skill.normalizedName), ['写真撮影', 'グラフィックデザイン'])
  assert.ok(fourth.suggestions.every((skill) => skill.status === 'pending' && skill.evidence.reference === fourth.session.id))
  const repeated = advanceInterview(fourth.session, 'p1', '追加で音響もできます')
  assert.deepEqual(repeated.session, fourth.session)
  assert.deepEqual(repeated.suggestions, [])
})

test('他人のインタビューは再開できない', () => {
  const initial = advanceInterview(null, 'p1', '').session
  assert.throws(() => advanceInterview(initial, 'p2', '音響が得意です'), /本人/)
})

test('日常的な健康・経済表現も除外する', () => {
  for (const text of ['腰痛なので音響を担当できます', 'お金に困っていますが動画編集を仕事にしています']) {
    assert.deepEqual(extractSkills(text, { profileId: 'p1', origin: 'interview' }), [], text)
  }
})
