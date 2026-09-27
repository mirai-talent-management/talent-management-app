import test from 'node:test'
import assert from 'node:assert/strict'
import {createBoardSeed,executeBoardAction,projectBoard} from './model.ts'
import {createSeedStore} from '../talent/mocks/seed.ts'
import type {Actor} from '../talent/types.ts'
import {prepareAgreementStore} from '../talent/services/skill-agreement-service.ts'

const supporter:Actor={id:'s1',name:'田中',role:'supporter'}
const staff:Actor={id:'staff-demo',name:'スタッフ',role:'staff'}
test('mission completion records explicit role, pending source and points without granting a skill',()=>{
  const store=createBoardSeed(),before=store.profiles[0].talents.length
  executeBoardAction(store,supporter,{action:'board.complete',missionId:'demo-poster',performedRole:true})
  assert.equal(store.profiles[0].talents.length,before)
  assert.equal(store.suggestions.length,1)
  assert.equal(store.suggestions[0].source,'activity')
  assert.equal(store.suggestions[0].status,'pending')
  assert.equal(projectBoard(store,supporter).board.points,150)
  const beforeSearch = executeBoardAction(store,staff,{action:'search',query:'ポスター貼りをお願いできる人'}) as {results:{profileId:string}[]}
  assert.equal(beforeSearch.results.some(item=>item.profileId===supporter.id),false)
  executeBoardAction(store,supporter,{action:'suggestion.review',id:store.suggestions[0].id,decision:'approved'})
  assert.equal(store.profiles[0].talents.at(-1)?.source,'activity')
  assert.equal(store.profiles[0].talents.at(-1)?.normalizedName,'ポスター貼り')
  const afterSearch = executeBoardAction(store,staff,{action:'search',query:'ポスター貼りをお願いできる人'}) as {results:{profileId:string}[]}
  assert.equal(afterSearch.results.some(item=>item.profileId===supporter.id),true)
})
test('repeated completion is idempotent for points, evidence and suggestions',()=>{
  const store=createBoardSeed(),input={action:'board.complete',missionId:'demo-photo',performedRole:true}
  executeBoardAction(store,supporter,input)
  const before=JSON.stringify(store)
  executeBoardAction(store,supporter,input)
  assert.equal(JSON.stringify(store),before)
})
test('attendance alone does not imply the role or event-management skills',()=>{
  const store=createBoardSeed()
  executeBoardAction(store,supporter,{action:'board.complete',missionId:'demo-meetup',performedRole:false})
  executeBoardAction(store,supporter,{action:'board.complete',missionId:'demo-photo',performedRole:false})
  assert.equal(store.suggestions.length,0)
  assert.ok(store.boardAchievements.every(item=>item.recordedRole===null))
})
test('staff, forged user/points, external mission ID and forged role are rejected',()=>{
  const store=createBoardSeed(),input={action:'board.complete',missionId:'demo-photo',performedRole:true}
  assert.throws(()=>executeBoardAction(store,staff,input))
  for(const body of [{...input,profileId:'s2'},{...input,points:99999},{...input,missionId:'official-mission'},{...input,performedRole:'音響'},{...input,missionId:'demo-meetup'}])assert.throws(()=>executeBoardAction(store,supporter,body))
  assert.equal(store.boardAchievements.length,0)
})
test('staff cannot read personal achievements or private talent candidates',()=>{
  const store=createBoardSeed()
  executeBoardAction(store,supporter,{action:'board.complete',missionId:'demo-poster',performedRole:true})
  const dto=projectBoard(store,staff)
  assert.equal(dto.board.achievements.length,0)
  assert.equal(dto.suggestions.length,0)
  assert.equal(JSON.stringify(dto).includes('privateNote'),false)
  assert.equal(projectBoard(store,{...supporter,id:'s2'}).board.achievements.length,0)
})
test('integration fixture is independent of standalone v0.2 and resets no existing state',()=>{
  const legacy=createSeedStore(),snapshot=JSON.stringify(legacy),store=createBoardSeed()
  executeBoardAction(store,supporter,{action:'board.complete',missionId:'demo-poster',performedRole:true})
  store.profiles[0].name='変更'
  assert.equal(JSON.stringify(legacy),snapshot)
  assert.equal(createBoardSeed().boardAchievements.length,0)
})
test('approved sample recommendations retain provenance and agreement affordance',()=>{
  const store=createBoardSeed(),skill=store.profiles[0].talents.find(item=>item.source==='recommendation')!
  assert.ok(store.recommendations.some(item=>item.id===skill.recommendationId))
  assert.equal(projectBoard(store,{...supporter,id:'s18'}).agreementSummaries[skill.id].canAgree,true)
  store.recommendations=[]
  prepareAgreementStore(store)
  assert.ok(store.recommendations.some(item=>item.id===skill.recommendationId))
})
