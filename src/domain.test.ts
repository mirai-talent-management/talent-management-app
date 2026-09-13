import test from 'node:test';
import assert from 'node:assert/strict';
import { initialActivities, initialRecommendations, initialSupporters, matchSupporter, recommendSkillApproval } from './domain.ts';
import type { Recommendation, Supporter } from './domain.ts';

test('a full skills match ranks ahead of partial matches with the documented component scores', () => {
  const required = initialActivities[0].requiredSkills;
  const first = matchSupporter(initialSupporters[0], required);
  const second = matchSupporter(initialSupporters[1], required);
  assert.deepEqual(first, {
    score: 96, skillScore: 70, motivationScore: 20, recommendationScore: 6,
    matchedSkills: ['SNS', 'Instagram', '動画編集', '広報'], missingSkills: [],
  });
  assert.equal(second.score, 47);
  assert.ok(first.score > second.score);
  assert.deepEqual(second.missingSkills, ['動画編集', '広報']);
});

test('no matching skill gives no skill or recommendation points, while interest in participation remains visible', () => {
  const result = matchSupporter(initialSupporters[0], ['会計']);
  assert.equal(result.skillScore, 0);
  assert.equal(result.recommendationScore, 0);
  assert.equal(result.score, 20);
  assert.deepEqual(result.matchedSkills, []);
  assert.deepEqual(result.missingSkills, ['会計']);
});

test('empty criteria and duplicated or differently cased tags have stable finite scores', () => {
  const person = initialSupporters[0];
  assert.equal(matchSupporter(person, []).score, 26);
  assert.deepEqual(matchSupporter(person, ['Instagram', ' instagram ', '']), {
    score: 90, skillScore: 70, motivationScore: 20, recommendationScore: 0,
    matchedSkills: ['instagram'], missingSkills: [],
  });
});

test('recommendation points are capped and repeated or self endorsements do not inflate them', () => {
  const person: Supporter = {
    ...initialSupporters[0],
    skills: [{ name: '動画編集', source: 'recommended', endorsers: ['s2', 's2', 's3', 's4', 's5', 's6', 's7', 's1'] }],
  };
  const result = matchSupporter(person, ['動画編集']);
  assert.equal(result.recommendationScore, 10);
  assert.equal(result.score, 100);
});

test('pending recommendations do not match until explicitly approved and approval does not mutate original data', () => {
  const pending = initialRecommendations[0];
  const before = JSON.stringify(initialSupporters);
  assert.deepEqual(matchSupporter(initialSupporters[0], [pending.skill]).matchedSkills, []);
  const result = recommendSkillApproval(initialSupporters, pending);
  assert.deepEqual(result[0].skills.at(-1), { name: 'グラフィックデザイン', source: 'recommended', endorsers: ['s3'] });
  assert.equal(matchSupporter(result[0], [pending.skill]).score, 92);
  assert.equal(JSON.stringify(initialSupporters), before);
  assert.notEqual(result[0], initialSupporters[0]);
  assert.equal(result[1], initialSupporters[1]);
});

test('a repeated approval never adds a duplicate endorsement', () => {
  const once = recommendSkillApproval(initialSupporters, initialRecommendations[0]);
  const twice = recommendSkillApproval(once, { ...initialRecommendations[0], id: 'another-id', status: 'approved' });
  assert.equal(twice, once);
  assert.deepEqual(twice[0].skills.at(-1)?.endorsers, ['s3']);
});

test('approving an endorsement for a self-registered skill preserves its source', () => {
  const recommendation: Recommendation = { ...initialRecommendations[0], skill: ' instagram ' };
  const result = recommendSkillApproval(initialSupporters, recommendation);
  const instagram = result[0].skills.find((skill) => skill.name === 'Instagram');
  assert.equal(instagram?.source, 'self');
  assert.deepEqual(instagram?.endorsers, ['s3']);
  assert.equal(result[0].skills.filter((skill) => skill.name.toLowerCase() === 'instagram').length, 1);
});

test('self recommendations, rejected proposals, empty skills and missing users cannot change a profile', () => {
  for (const change of [
    { fromId: 's1' }, { fromId: 'missing' }, { toId: 'missing' },
    { status: 'rejected' as const }, { skill: '  ' },
  ]) {
    assert.equal(recommendSkillApproval(initialSupporters, { ...initialRecommendations[0], ...change }), initialSupporters);
  }
});

test('sample identities and endorsement references are consistent', () => {
  assert.equal(initialSupporters.length, 18);
  const ids = new Set(initialSupporters.map((person) => person.id));
  assert.equal(ids.size, initialSupporters.length);
  for (const person of initialSupporters) {
    assert.ok(person.email.endsWith('@example.com'));
    for (const skill of person.skills) {
      assert.ok(skill.endorsers.every((id) => ids.has(id) && id !== person.id));
    }
  }
  assert.equal(initialRecommendations.filter((item) => item.toId === 's1' && item.status === 'pending').length, 2);
});
