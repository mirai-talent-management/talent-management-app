import type { Activity, ProfilePatch, SkillCategory } from '../types.ts'
import { TalentError } from './errors.ts'

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TalentError('入力形式が正しくありません。')
  return value as Record<string, unknown>
}
export function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TalentError('許可されていない入力項目があります。')
}
export function text(value: unknown, label: string, max = 2000, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new TalentError(`${label}の入力を確認してください（${max}文字以内）。`)
  return value.trim()
}
export function choice<T extends string>(value: unknown, choices: readonly T[], label: string): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new TalentError(`${label}の値が正しくありません。`)
  return value as T
}
function strings(value: unknown, label: string, maxItems = 40, maxLength = 100): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new TalentError(`${label}の項目数を確認してください。`)
  return [...new Set(value.map(item => text(item, label, maxLength)))]
}
function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) throw new TalentError(`${label}は${min}〜${max}の整数で入力してください。`)
  return value
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new TalentError(`${label}の値が正しくありません。`)
  return value
}
const categories = ['professional', 'personal', 'election', 'community', 'policy', 'strength'] as const
export const skillCategory = (value: unknown): SkillCategory => choice(value, categories, 'カテゴリ')
const participation = ['election_active', 'regular', 'sometimes', 'remote', 'events_only', 'resting'] as const

export function profilePatch(value: unknown): ProfilePatch {
  const p = object(value)
  onlyKeys(p, ['name','kana','headline','location','bio','email','slack','hoursPerMonth','interests','motivation','experience','workExperience','personalExperience','electionExperience','communityExperience','participation','availabilityDetails','policyInterests','policyAdviceTopics','policyAdvicePerspective'])
  const availability = object(p.availabilityDetails)
  onlyKeys(availability, ['regions','weekdays','timeSlots','remote','onsite'])
  if (!Array.isArray(p.experience) || p.experience.length > 50) throw new TalentError('経験・実績の項目数を確認してください。')
  const email = text(p.email, 'メールアドレス', 320, false)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TalentError('メールアドレスの形式を確認してください。')
  return {
    name: text(p.name, '名前', 100), kana: text(p.kana, 'よみがな', 100, false),
    headline: text(p.headline, 'ひとこと', 200, false), location: text(p.location, '地域', 200, false),
    bio: text(p.bio, '自己紹介', 10000, false), email, slack: text(p.slack, 'Slack', 200, false),
    hoursPerMonth: integer(p.hoursPerMonth, '活動時間', 0, 744), interests: strings(p.interests, '関心'),
    motivation: choice(p.motivation, ['high','medium','low'], 'モチベーション'),
    experience: p.experience.map(value => { const row = object(value); onlyKeys(row, ['title','description','date']); return {title:text(row.title,'実績名',200),description:text(row.description,'実績の説明',10000,false),date:text(row.date,'実績の時期',100,false)} }),
    workExperience: text(p.workExperience,'仕事の経験',10000,false), personalExperience: text(p.personalExperience,'プライベートの経験',10000,false),
    electionExperience: text(p.electionExperience,'選挙活動の経験',10000,false), communityExperience: text(p.communityExperience,'平時の活動経験',10000,false),
    participation: strings(p.participation,'参加スタンス',6).map(value => choice(value,participation,'参加スタンス')),
    availabilityDetails: {regions:strings(availability.regions,'活動地域'),weekdays:strings(availability.weekdays,'曜日',7),timeSlots:strings(availability.timeSlots,'時間帯',10),remote:boolean(availability.remote,'オンライン'),onsite:boolean(availability.onsite,'現地参加')},
    policyInterests: strings(p.policyInterests,'政策への関心'),
    policyAdviceTopics: strings(p.policyAdviceTopics,'助言できる政策分野'),
    policyAdvicePerspective: text(p.policyAdvicePerspective,'助言の立場・経験',1000,false),
  }
}
export function activityInput(value: unknown): Activity {
  const a = object(value)
  onlyKeys(a, ['id','title','description','date','location','recruitment','requiredSkills','idealPerson','headcount','conditions','status'])
  const date = text(a.date,'活動日時',100)
  if (!Number.isFinite(Date.parse(date))) throw new TalentError('活動日時の形式を確認してください。')
  return {id:text(a.id,'活動ID',100),title:text(a.title,'活動名',200),description:text(a.description,'活動内容',10000,false),date,location:text(a.location,'活動場所',200,false),recruitment:text(a.recruitment,'募集内容',10000,false),requiredSkills:strings(a.requiredSkills,'必要スキル',60,100),idealPerson:text(a.idealPerson,'求める人物像',10000,false),headcount:integer(a.headcount,'募集人数',1,10000),conditions:text(a.conditions,'条件',10000,false),status:choice(a.status,['recruiting','closed'],'募集状態')}
}
