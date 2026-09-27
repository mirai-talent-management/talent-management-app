import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeedStore } from '../mocks/seed.ts'
import { executeTalentAction } from '../actions/execute-action.ts'
import { projectBootstrap } from '../loaders/bootstrap.ts'
import { prepareAgreementStore } from './skill-agreement-service.ts'
import type { Actor } from '../types.ts'

const actor = (id:string,role:'supporter'|'staff'='supporter'):Actor=>({id,role,name:id})
test('other supporters agree once, see a public count, and can take agreement back',()=>{
  const store=createSeedStore()
  const skill=store.profiles[0].talents.find(item=>item.source==='recommendation')!
  const recommender=store.recommendations.find(item=>item.id===skill.recommendationId)!
  const voterId=store.profiles.map(item=>item.id).find(id=>id!=='s1'&&id!==recommender.fromId)!
  const secondId=store.profiles.map(item=>item.id).find(id=>id!=='s1'&&id!==recommender.fromId&&id!==voterId)!
  let result=executeTalentAction(store,actor(voterId),{action:'skill.agreement.toggle',skillId:skill.id}) as {count:number;agreed:boolean}
  assert.deepEqual({count:result.count,agreed:result.agreed},{count:1,agreed:true})
  result=executeTalentAction(store,actor(secondId),{action:'skill.agreement.toggle',skillId:skill.id}) as {count:number;agreed:boolean}
  assert.equal(result.count,2)
  const publicView=projectBootstrap(store,actor('staff-demo','staff'))
  assert.equal(publicView.agreementSummaries[skill.id].count,2)
  assert.equal(publicView.agreementSummaries[skill.id].canAgree,true)
  assert.deepEqual(Object.keys(publicView.agreementSummaries[skill.id]).sort(),['agreed','canAgree','count'])
  assert.equal(projectBootstrap(store,actor(voterId)).agreementSummaries[skill.id].agreed,true)
  result=executeTalentAction(store,actor('staff-demo','staff'),{action:'skill.agreement.toggle',skillId:skill.id}) as {count:number;agreed:boolean}
  assert.equal(result.count,3)
  result=executeTalentAction(store,actor(voterId),{action:'skill.agreement.toggle',skillId:skill.id}) as {count:number;agreed:boolean}
  assert.deepEqual({count:result.count,agreed:result.agreed},{count:2,agreed:false})
})
test('target and recommender cannot agree; pending, self and unknown skills cannot be endorsed',()=>{
  const store=createSeedStore(),skill=store.profiles[0].talents.find(item=>item.source==='recommendation')!
  const recommender=store.recommendations.find(item=>item.id===skill.recommendationId)!
  const input={action:'skill.agreement.toggle',skillId:skill.id}
  for(const id of ['s1',recommender.fromId]) assert.throws(()=>executeTalentAction(store,actor(id),input))
  for(const skillId of [store.profiles[0].talents.find(item=>item.source==='self')!.id,store.suggestions[0].id,'unknown']) assert.throws(()=>executeTalentAction(store,actor('s18'),{...input,skillId}))
  assert.throws(()=>executeTalentAction(store,actor('s18'),{...input,actorId:'s1'}))
  assert.equal(store.skillAgreements.length,0)
})
test('recommendation stays pending until owner approval; original recommender remains excluded',()=>{
  const store=createSeedStore()
  executeTalentAction(store,actor('s3'),{action:'recommendation.send',toId:'s1',text:'音響の準備を担当しました。'})
  const rec=store.recommendations.at(-1)!,suggestion=store.suggestions.find(item=>rec.suggestionIds.includes(item.id))!
  assert.equal(projectBootstrap(store,actor('s4')).agreementSummaries[suggestion.id],undefined)
  executeTalentAction(store,actor('s1'),{action:'suggestion.review',id:suggestion.id,decision:'approved'})
  const skill=store.profiles[0].talents.at(-1)!
  assert.equal(skill.recommendationId,rec.id)
  assert.throws(()=>executeTalentAction(store,actor('s3'),{action:'skill.agreement.toggle',skillId:skill.id}))
  assert.equal(projectBootstrap(store,actor('s4')).agreementSummaries[skill.id].canAgree,true)
})
test('saved pre-agreement sample stores gain deterministic provenance without erasing edits',()=>{
  const old=createSeedStore()
  old.skillAgreements=undefined as unknown as typeof old.skillAgreements
  old.recommendations=old.recommendations.filter(rec=>!rec.id.startsWith('seed-approved-'))
  old.profiles.flatMap(profile=>profile.talents).forEach(skill=>{if(skill.id.startsWith('seed-')) delete skill.recommendationId})
  const name=old.profiles[0].name
  prepareAgreementStore(old)
  const count=old.recommendations.length
  prepareAgreementStore(old)
  assert.equal(old.recommendations.length,count)
  assert.deepEqual(old.skillAgreements,[])
  assert.equal(old.profiles[0].name,name)
  assert.ok(old.profiles[0].talents.some(skill=>skill.source==='recommendation'&&skill.recommendationId))
})
