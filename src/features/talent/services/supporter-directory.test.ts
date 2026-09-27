import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeedStore } from '../mocks/seed.ts'
import { formatResidenceLocation, matchesSupporterName, matchesSupporterPrefecture, PREFECTURES, splitResidenceLocation } from './supporter-directory.ts'

test('name search accepts partial display names and kana without spacing differences', () => {
  const profile = createSeedStore().profiles[0]
  assert.ok(matchesSupporterName(profile, '田中美咲'))
  assert.ok(matchesSupporterName(profile, profile.kana.slice(0, 2)))
  assert.equal(matchesSupporterName(profile, '存在しない名前'), false)
})

test('prefecture search distinguishes residence from declared activity area', () => {
  const profile = createSeedStore().profiles[0]
  assert.equal(PREFECTURES.length, 47)
  assert.ok(matchesSupporterPrefecture(profile, '神奈川県'))
  assert.equal(matchesSupporterPrefecture(profile, '東京都'), false)
  assert.ok(matchesSupporterPrefecture(profile, '東京都', true))
  assert.equal(matchesSupporterPrefecture(profile, '大阪府', true), false)
})
test('residence separates linked prefecture from freely entered municipality', () => {
  assert.deepEqual(splitResidenceLocation('神奈川県横浜市'),{prefecture:'神奈川県',municipality:'横浜市'})
  assert.deepEqual(splitResidenceLocation('東京都'),{prefecture:'東京都',municipality:''})
  assert.equal(formatResidenceLocation('神奈川県','川崎市'),'神奈川県川崎市')
})
