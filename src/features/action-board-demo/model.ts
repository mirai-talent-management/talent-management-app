import type { Actor, BootstrapData, TalentStore } from '../talent/types.ts'
import { createSeedStore } from '../talent/mocks/seed.ts'
import { projectBootstrap } from '../talent/loaders/bootstrap.ts'
import { activityRecordsToTalentCandidates } from '../talent/adapters/action-board-adapter.ts'
import { executeTalentAction } from '../talent/actions/execute-action.ts'
import { object, onlyKeys, text } from '../talent/server/validation.ts'
import { TalentError } from '../talent/server/errors.ts'

export interface DemoMission {
  id: string; title: string; category: '地域で参加' | 'オンライン'; description: string
  points: number; difficulty: number; icon: 'poster' | 'camera' | 'people' | 'sns'
  location: string; role: string | null; duration: string; steps: string[]
}
/** Fictional fixtures, not official mission IDs, schedules or point rules. */
export const DEMO_MISSIONS: DemoMission[] = [
  {id:'demo-poster',title:'まちにポスターを届けよう',category:'地域で参加',description:'地域の仲間と、ポスター掲示の準備・作業に参加するサンプルミッションです。',points:150,difficulty:2,icon:'poster',location:'横浜エリア（架空）',role:'ポスター貼り',duration:'約60分',steps:['活動内容と担当を確認する','掲示作業を体験した想定で完了する','担当経験から生まれたスキル候補を確認する']},
  {id:'demo-photo',title:'イベントの「いま」を写真に',category:'地域で参加',description:'地域ミートアップの記録撮影を担当。写真撮影の経験を次の活動へつなげます。',points:100,difficulty:2,icon:'camera',location:'横浜エリア（架空）',role:'撮影',duration:'約90分',steps:['撮影担当として参加する想定で内容を確認','担当した役割を選び、デモの達成を記録','撮影スキルの候補を本人が確認']},
  {id:'demo-meetup',title:'はじめての地域ミートアップ',category:'地域で参加',description:'地域の仲間と出会うミッション。参加記録だけで運営スキルが登録されることはありません。',points:50,difficulty:1,icon:'people',location:'横浜エリア（架空）',role:null,duration:'約60分',steps:['イベントに参加した想定で内容を確認','参加記録を残す','興味や経験をAIインタビューで振り返る']},
  {id:'demo-guide',title:'活動ガイドを読んでみよう',category:'オンライン',description:'自分に合う参加の仕方を見つける、はじめの一歩。オンライン参加のサンプルです。',points:30,difficulty:1,icon:'sns',location:'オンライン',role:null,duration:'約10分',steps:['活動の流れを確認する','自分のペースで参加方法を考える','マイタレントに得意なことを登録する']},
]
export interface DemoAchievement {id:string;profileId:string;missionId:string;title:string;points:number;occurredAt:string;recordedRole:string|null;suggestionIds:string[]}
export interface BoardStore extends TalentStore {boardVersion:1;boardAchievements:DemoAchievement[]}
export interface BoardBootstrap extends BootstrapData {board:{missions:DemoMission[];achievements:DemoAchievement[];points:number}}
export function createBoardSeed(): BoardStore {
  const base = createSeedStore()
  return {...base,suggestions:[],recommendations:base.recommendations.filter(item=>item.id.startsWith('seed-approved-recommendation:')),boardVersion:1,boardAchievements:[]}
}
export function projectBoard(store: BoardStore, actor: Actor): BoardBootstrap {
  const achievements = store.boardAchievements.filter(item => item.profileId === actor.id)
  return {...projectBootstrap(store,actor),board:{missions:DEMO_MISSIONS,achievements,points:achievements.reduce((total,item)=>total+item.points,0)}}
}
export function executeBoardAction(store: BoardStore, actor: Actor, input: unknown): unknown {
  const body = object(input)
  if (body.action !== 'board.complete') return executeTalentAction(store,actor,input)
  onlyKeys(body,['action','missionId','performedRole'])
  if (actor.role !== 'supporter' || !store.profiles.some(profile => profile.id === actor.id)) throw new TalentError('サポーター本人で体験してください。',403)
  const mission = DEMO_MISSIONS.find(item=>item.id===text(body.missionId,'ミッション',100))
  if (!mission) throw new TalentError('サンプルミッションが見つかりません。',404)
  if (typeof body.performedRole !== 'boolean' || (body.performedRole && !mission.role)) throw new TalentError('担当した役割を確認してください。')
  const previous = store.boardAchievements.find(item=>item.profileId===actor.id && item.missionId===mission.id)
  if (previous) return {ok:true,achievement:previous,alreadyCompleted:true}
  const occurredAt = new Date().toISOString()
  const id = `board-${actor.id}-${mission.id}`
  const recordedRole = body.performedRole ? mission.role : null
  const mapped = activityRecordsToTalentCandidates({profileId:actor.id,externalUserId:actor.id},[{
    id,externalUserId:actor.id,missionId:mission.id,title:`【統合デモ】${mission.title}`,occurredAt,reference:`local-demo:${id}`,source:'action_board',
    recordedRole: recordedRole ? {name:recordedRole,evidenceText:`【架空の活動記録】「${mission.title}」で${recordedRole}を担当したと本人がデモ登録しました。`,reference:`local-demo:${id}`} : undefined,
  }])
  const achievement: DemoAchievement = {id,profileId:actor.id,missionId:mission.id,title:mission.title,points:mission.points,occurredAt,recordedRole,suggestionIds:mapped.suggestions.map(item=>item.id)}
  store.boardAchievements.unshift(achievement)
  store.evidence.push(...mapped.evidence)
  store.suggestions.push(...mapped.suggestions)
  return {ok:true,achievement,alreadyCompleted:false}
}
