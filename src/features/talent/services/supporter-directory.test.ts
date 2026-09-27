import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeedStore } from '../mocks/seed.ts'
import { matchesSupporterName, matchesSupporterPrefecture, PREFECTURES } from './supporter-directory.ts'

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
