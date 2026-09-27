import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSeedStore } from '../mocks/seed.ts'
import type { Actor, ProfilePatch, TalentStore } from '../types.ts'
import { projectBootstrap } from '../loaders/bootstrap.ts'
import { executeTalentAction } from '../actions/execute-action.ts'
import { buildTeam } from '../services/team-builder-service.ts'
import { assertDemoRequest, signDemoSession, verifyDemoSession } from './session-core.ts'
import { ActionBoardIdentityAdapter } from './auth-adapter.ts'
import { TalentError } from './errors.ts'
import { preparePolicyFields } from './policy-fields.ts'
import { splitResidenceLocation } from '../services/supporter-directory.ts'

const staff: Actor = {id:'staff-demo',role:'staff',name:'スタッフ'}
const s1: Actor = {id:'s1',role:'supporter',name:'本人'}
const s2: Actor = {id:'s2',role:'supporter',name:'別のサポーター'}
const secret = 'test-secret-at-least-thirty-two-characters'
function assertStatus(run: () => unknown, status: number) {
  assert.throws(run,(error: unknown) => error instanceof TalentError && error.status === status)
}
function sensitiveStore(): TalentStore {
  const store = createSeedStore()
  store.suggestions.push({id:'secret-candidate',profileId:s1.id,originalText:'非公開の面談原文',normalizedName:'写真撮影',relatedTerms:['カメラ'],category:'personal',source:'ai',origin:'interview',evidence:{text:'非公開の面談原文',reference:'private-interview',confidence:0.72},status:'pending',createdAt:'2026-09-22',reviewedAt:null})
  store.suggestions.push({id:'legacy-slack',profileId:s1.id,originalText:'非公開Slack原文',normalizedName:'音響対応',relatedTerms:[],category:'professional',source:'ai',origin:'slack',evidence:{text:'非公開Slack原文',reference:'https://private.slack.example/message',confidence:0.72},status:'pending',createdAt:'2026-09-22',reviewedAt:null})
  store.interviews.push({id:'private-interview',profileId:s1.id,messages:[{id:'answer',role:'user',content:'秘密の面談回答'}],step:1,status:'active',updatedAt:'2026-09-22'})
  store.pairingPreferences.push({id:'private-preference',ownerId:s1.id,targetId:s2.id,kind:'hard_avoid',privateNote:'秘密の人間関係メモ',updatedAt:'2026-09-22'})
  store.recommendations.push({id:'private-recommendation',fromId:s2.id,fromName:s2.name,toId:s1.id,text:'非公開の推薦原文',source:'recommendation',createdAt:'2026-09-22',suggestionIds:[]})
  return store
}
function patch(store: TalentStore): ProfilePatch {
  const profile = store.profiles.find(profile => profile.id === s1.id)!
  const keys = ['name','kana','headline','bio','email','slack','hoursPerMonth','interests','motivation','experience','workExperience','personalExperience','electionExperience','communityExperience','participation','availabilityDetails','policyInterests','policyAdviceTopics','policyAdvicePerspective'] as const
  return {...Object.fromEntries(keys.map(key => [key,structuredClone(profile[key])])),municipality:splitResidenceLocation(profile.location).municipality} as ProfilePatch
}

test('staff bootstrap excludes candidates, interviews, preferences and unrelated recommendation prose',() => {
  const data = projectBootstrap(sensitiveStore(),staff)
  const serialized = JSON.stringify(data)
  for (const secret of ['非公開Slack原文','private.slack.example','秘密の面談回答','秘密の人間関係メモ','非公開の推薦原文','pairingPreferences','privateNote']) assert.equal(serialized.includes(secret),false,secret)
  assert.deepEqual(data.suggestions,[])
  assert.equal(data.interview,null)
})
test('team action ignores pairing records retained in an older local store',() => {
  const store = sensitiveStore()
  const request = '横浜で音響1人、撮影1人'
  const expected = buildTeam(store.profiles, [], request)
  const result = executeTalentAction(store, staff, {action:'team.build', request}) as typeof expected
  assert.deepEqual(result.assignments, expected.assignments)
  assert.deepEqual(result.unfilled, expected.unfilled)
  assert.doesNotMatch(JSON.stringify(result), /privateNote|hard_avoid|秘密の人間関係メモ/u)
})
test('supporter sees only their private candidates/interview and their own contact details',() => {
  const store = sensitiveStore()
  const mine = projectBootstrap(store,s1)
  assert.ok(mine.suggestions.some(item => item.id === 'secret-candidate'))
  assert.equal(mine.suggestions.some(item => item.id === 'legacy-slack'),false)
  assert.equal(mine.interview?.profileId,s1.id)
  assert.ok(mine.profiles.find(item => item.id === s1.id)?.email)
  const other = projectBootstrap(store,s2)
  assert.equal(other.suggestions.some(item => item.id === 'secret-candidate'),false)
  assert.equal(other.interview,null)
  assert.equal(other.profiles.find(item => item.id === s1.id)?.email,'')
  assert.equal(other.profiles.find(item => item.id === s1.id)?.slack,'')
})
test('Slack由来の旧候補は表示せず、抽出と承認のAPIも停止する',() => {
  const store = sensitiveStore()
  assertStatus(() => executeTalentAction(store,s1,{action:'slack.analyze',text:'音響を担当しました'}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'suggestion.review',id:'legacy-slack',decision:'approved'}),410)
  assert.equal(store.profiles.find(item => item.id === s1.id)!.talents.some(item => item.originalText === '非公開Slack原文'),false)
})
test('政策の関心・助言分野・助言の立場は本人が別々に登録する',() => {
  const store = createSeedStore()
  const ownPatch = patch(store)
  ownPatch.policyInterests = ['教育', '行政DX']
  ownPatch.policyAdviceTopics = ['教育']
  ownPatch.policyAdvicePerspective = '学校での実務経験から助言します。'
  assertStatus(() => executeTalentAction(store,s2,{action:'profile.save',profile:ownPatch,profileId:s1.id}),400)
  executeTalentAction(store,s1,{action:'profile.save',profile:ownPatch})
  const profile = projectBootstrap(store,staff).profiles.find(item => item.id === s1.id)!
  assert.deepEqual(profile.policyInterests,['教育','行政DX'])
  assert.deepEqual(profile.policyAdviceTopics,['教育'])
  assert.equal(profile.policyAdvicePerspective,'学校での実務経験から助言します。')
  assert.equal(profile.talents.some(item => item.normalizedName === '教育'),false)
})
test('旧ローカルデータへ政策サンプルを補い、後から入力した内容は上書きしない',() => {
  const store = createSeedStore()
  const profile = store.profiles[0]
  delete (profile as Partial<typeof profile>).policyAdviceTopics
  delete (profile as Partial<typeof profile>).policyAdvicePerspective
  profile.policyInterests = []
  preparePolicyFields(store)
  assert.deepEqual(profile.policyInterests,['行政DX','情報アクセシビリティ'])
  assert.deepEqual(profile.policyAdviceTopics,['行政DX'])
  profile.policyAdviceTopics = ['教育']
  preparePolicyFields(store)
  assert.deepEqual(profile.policyAdviceTopics,['教育'])
})
test('public evidence uses only approved final expression and drops raw references',() => {
  const store = sensitiveStore()
  const profile = store.profiles.find(item => item.id === s1.id)!
  profile.talents.push({id:'approved-test',originalText:'イベントの記録写真を撮れます',normalizedName:'写真撮影',relatedTerms:[],category:'personal',source:'ai',evidenceId:'private-evidence',approvedAt:'2026-09-22'})
  store.evidence.push({id:'private-evidence',profileId:s1.id,source:'ai',description:'非公開Slack原文',reference:'https://private.slack.example/message',occurredAt:'2026-09-22'})
  const evidence = projectBootstrap(store,staff).evidence.find(item => item.id === 'private-evidence')!
  assert.equal(evidence.reference,null)
  assert.equal(evidence.description,'イベントの記録写真を撮れます')
})
test('candidate approval is owner-only, preserves source and is idempotent',() => {
  const store = sensitiveStore()
  const before = store.profiles.find(item => item.id === s1.id)!.talents.length
  assertStatus(() => executeTalentAction(store,s2,{action:'suggestion.review',id:'secret-candidate',decision:'approved'}),404)
  assertStatus(() => executeTalentAction(store,staff,{action:'suggestion.review',id:'secret-candidate',decision:'approved'}),403)
  executeTalentAction(store,s1,{action:'suggestion.review',id:'secret-candidate',decision:'approved',text:'写真撮影が得意です'})
  executeTalentAction(store,s1,{action:'suggestion.review',id:'secret-candidate',decision:'approved',text:'写真撮影が得意です'})
  const talents = store.profiles.find(item => item.id === s1.id)!.talents
  assert.equal(talents.length,before+1)
  assert.equal(talents.at(-1)?.source,'ai')
  assert.equal(talents.at(-1)?.originalText,'写真撮影が得意です')
  assertStatus(() => executeTalentAction(store,s1,{action:'suggestion.review',id:'secret-candidate',decision:'rejected'}),409)
})
test('rejected and pending candidates never enter approved profile skills',() => {
  const store = sensitiveStore()
  const before = structuredClone(store.profiles.find(item => item.id === s1.id)!.talents)
  executeTalentAction(store,s1,{action:'suggestion.review',id:'secret-candidate',decision:'rejected'})
  assert.deepEqual(store.profiles.find(item => item.id === s1.id)!.talents,before)
})

test('approval retains each extracted skill when multiple candidates share one sentence',() => {
  const store = createSeedStore()
  executeTalentAction(store,staff,{action:'recommendation.send',toId:s1.id,text:'写真撮影と音響対応を担当しました'})
  const recommendation = store.recommendations.at(-1)!
  const candidates = store.suggestions.filter(item => recommendation.suggestionIds.includes(item.id))
  assert.ok(candidates.length >= 2)
  for (const candidate of candidates) {
    executeTalentAction(store,s1,{action:'suggestion.review',id:candidate.id,decision:'approved',text:candidate.originalText})
    assert.equal(store.profiles.find(item => item.id === s1.id)!.talents.at(-1)?.normalizedName,candidate.normalizedName)
  }
})

test('free-form recommendation outside mock dictionary is retained for owner approval',() => {
  const store = createSeedStore()
  executeTalentAction(store,staff,{action:'recommendation.send',toId:s1.id,text:'黙々と細かい作業を続けられる人です'})
  const recommendation = store.recommendations.at(-1)!
  const candidate = store.suggestions.find(item => recommendation.suggestionIds.includes(item.id))!
  assert.equal(candidate.originalText,'黙々と細かい作業を続けられる人です')
  assert.equal(candidate.status,'pending')
  assert.equal(candidate.source,'recommendation')
})
test('self skills can be edited and removed while other profiles and non-self sources stay read-only',() => {
  const store = sensitiveStore()
  executeTalentAction(store,s1,{action:'skill.add',text:'茶道の経験があります',category:'personal'})
  const skill = store.profiles.find(item => item.id === s1.id)!.talents.at(-1)!
  assertStatus(() => executeTalentAction(store,s2,{action:'skill.update',id:skill.id,text:'改変',category:'personal'}),404)
  assertStatus(() => executeTalentAction(store,s2,{action:'skill.remove',id:skill.id}),404)
  executeTalentAction(store,s1,{action:'skill.update',id:skill.id,text:'茶道教室で教えていました',category:'strength'})
  assert.equal(skill.originalText,'茶道教室で教えていました')
  assert.equal(skill.source,'self')
  executeTalentAction(store,s1,{action:'skill.remove',id:skill.id})
  assert.equal(store.profiles.find(item => item.id === s1.id)!.talents.some(item => item.id === skill.id),false)
  for (const source of ['ai','recommendation','activity'] as const) {
    const candidate = {...skill,id:`protected-${source}`,source}
    store.profiles.find(item => item.id === s1.id)!.talents.push(candidate)
    assertStatus(() => executeTalentAction(store,s1,{action:'skill.update',id:candidate.id,text:'変更',category:'personal'}),403)
    assertStatus(() => executeTalentAction(store,s1,{action:'skill.remove',id:candidate.id}),403)
  }
})
test('skill edits preserve source and reject canonical duplicates',() => {
  const store = sensitiveStore()
  const profile = store.profiles.find(item => item.id === s1.id)!
  profile.talents = []
  executeTalentAction(store,s1,{action:'skill.add',text:'写真撮影ができます',category:'personal'})
  executeTalentAction(store,s1,{action:'skill.add',text:'茶道',category:'personal'})
  const id = profile.talents.at(-1)!.id
  assertStatus(() => executeTalentAction(store,s1,{action:'skill.update',id,text:'カメラが得意です',category:'personal'}),409)
  assertStatus(() => executeTalentAction(store,s1,{action:'skill.update',id,text:'茶道',category:'personal',source:'activity'}),400)
  assert.equal(profile.talents.at(-1)!.normalizedName,'茶道')
})
test('mutation contracts reject actor/source changes, unknown category and oversized text',() => {
  const store = sensitiveStore()
  assertStatus(() => executeTalentAction(store,s1,{action:'skill.add',text:'カメラ',category:'personal',actorId:s2.id}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'skill.add',text:'カメラ',category:'personal',source:'activity'}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'skill.add',text:'カメラ',category:'invalid'}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'skill.add',text:'a'.repeat(501),category:'personal'}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'suggestion.review',id:'secret-candidate',decision:'pending'}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'unrecognized'}),400)
})
test('profile edits whitelist fields and cannot change role, identity or skill provenance',() => {
  const store = sensitiveStore()
  const before = structuredClone(store.profiles.find(item => item.id === s1.id)!.talents)
  const valid = patch(store)
  executeTalentAction(store,s1,{action:'profile.save',profile:{...valid,name:'更新した名前'}})
  assert.equal(store.profiles.find(item => item.id === s1.id)!.name,'更新した名前')
  assert.deepEqual(store.profiles.find(item => item.id === s1.id)!.talents,before)
  for (const input of [{...valid,id:s2.id},{...valid,role:'staff'},{...valid,talents:[]},{...valid,hoursPerMonth:745},{...valid,participation:['unknown']}]) assertStatus(() => executeTalentAction(store,s1,{action:'profile.save',profile:input}),400)
})
test('profile edits allow only municipality and preserve the linked prefecture',() => {
  const store = sensitiveStore()
  const valid = patch(store)
  executeTalentAction(store,s1,{action:'profile.save',profile:{...valid,municipality:'川崎市'}})
  assert.equal(store.profiles.find(item => item.id === s1.id)!.location,'神奈川県川崎市')
  assertStatus(() => executeTalentAction(store,s1,{action:'profile.save',profile:{...valid,location:'東京都渋谷区'}}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'profile.save',profile:{...valid,municipality:'東京都渋谷区'}}),400)
  assert.equal(store.profiles.find(item => item.id === s1.id)!.location,'神奈川県川崎市')
})
test('staff-only actions reject supporter even when body claims staff',() => {
  const store = sensitiveStore()
  assertStatus(() => executeTalentAction(store,s1,{action:'activity.save',activity:store.activities[0]}),403)
  assertStatus(() => executeTalentAction(store,s1,{action:'team.build',request:'撮影1名'}),403)
  assertStatus(() => executeTalentAction(store,s1,{action:'team.review',id:'missing'}),403)
})
test('recommendation sender is server-derived and staff may recommend without approving target',() => {
  const store = sensitiveStore()
  executeTalentAction(store,staff,{action:'recommendation.send',toId:s1.id,text:'写真撮影が得意です'})
  const rec = store.recommendations.at(-1)!
  assert.equal(rec.fromId,staff.id)
  assert.ok(rec.suggestionIds.length)
  assert.ok(store.suggestions.filter(item => rec.suggestionIds.includes(item.id)).every(item => item.profileId === s1.id && item.status === 'pending' && item.source === 'recommendation'))
  assertStatus(() => executeTalentAction(store,s1,{action:'recommendation.send',toId:s1.id,text:'写真撮影が得意です'}),400)
  assertStatus(() => executeTalentAction(store,s1,{action:'recommendation.send',toId:s2.id,text:'写真撮影',fromId:staff.id}),400)
})
test('signed demo session rejects tampering, wrong secret, expiry and malformed tokens',() => {
  const token = signDemoSession(s1.id,secret,1000)
  assert.equal(verifyDemoSession(token,secret,2000),s1.id)
  assertStatus(() => verifyDemoSession(token,'wrong',2000),401)
  assertStatus(() => verifyDemoSession(token,secret,1000+86400000),401)
  assertStatus(() => verifyDemoSession(`${token}tampered`,secret,2000),401)
  assertStatus(() => verifyDemoSession('fake',secret,2000),401)
})
test('demo request guards reject non-local host, cross-origin mutation and production by default',() => {
  const valid = new Request('http://localhost:3000/api/talent',{method:'POST',headers:{Origin:'http://localhost:3000'}})
  assert.doesNotThrow(() => assertDemoRequest(valid,true,'development'))
  assertStatus(() => assertDemoRequest(valid,true,'production'),403)
  assert.doesNotThrow(() => assertDemoRequest(valid,true,'production','true'))
  assertStatus(() => assertDemoRequest(new Request('https://public.example/api/talent'),false,'development'),403)
  assertStatus(() => assertDemoRequest(new Request('http://localhost:3000/api/talent',{method:'POST',headers:{Origin:'https://evil.example'}}),true,'development'),403)
  assertStatus(() => assertDemoRequest(new Request('http://localhost:3000/api/talent',{method:'POST'}),true,'development'),403)
})
test('ActionBoard identity adapter requires verified user and matching profile identity',async () => {
  const valid = new ActionBoardIdentityAdapter({getVerifiedAuthUser:async () => ({id:'verified'}),getPublicUserProfile:async () => ({authUserId:'verified',name:'User',role:'staff'})})
  assert.equal((await valid.resolveActor('verified-token')).id,'verified')
  const mismatch = new ActionBoardIdentityAdapter({getVerifiedAuthUser:async () => ({id:'verified'}),getPublicUserProfile:async () => ({authUserId:'forged',name:'User',role:'staff'})})
  await assert.rejects(() => mismatch.resolveActor('token'))
  const anonymous = new ActionBoardIdentityAdapter({getVerifiedAuthUser:async () => null,getPublicUserProfile:async () => ({authUserId:'forged',name:'User',role:'staff'})})
  await assert.rejects(() => anonymous.resolveActor('token'))
})

test('Next normalized localhost URL accepts loopback Host but Origin must match browser Host',() => {
  const request = (host: string, origin: string) => new Request('http://localhost:3000/api/talent',{method:'POST',headers:{Host:host,Origin:origin}})
  assert.doesNotThrow(() => assertDemoRequest(request('127.0.0.1:3000','http://127.0.0.1:3000'),true,'development'))
  for (const [host,origin] of [['public.example:3000','http://public.example:3000'],['127.0.0.1:3000','http://localhost:3000'],['127.0.0.1:4000','http://127.0.0.1:4000'],['user@localhost:3000','http://localhost:3000']]) {
    assertStatus(() => assertDemoRequest(request(host,origin),true,'development'),403)
  }
})
