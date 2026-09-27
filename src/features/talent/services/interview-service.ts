import type { InterviewSession, SkillSuggestion } from '../types.ts'
import { extractSkills } from './skill-extraction-service.ts'

const firstQuestion = '仕事や趣味、これまでの活動で、得意なことを一つ教えてください。小さな経験でも大丈夫です。'

/** A four-answer local mock interview. Participation willingness is not inferred from abilities. */
export function advanceInterview(session: InterviewSession | null, profileId: string, answer: string): { session: InterviewSession; suggestions: SkillSuggestion[] } {
  if (session && session.profileId !== profileId) throw new Error('本人のインタビューだけ再開できます。')
  if (session?.status === 'completed') return { session, suggestions: [] }
  const updatedAt = new Date().toISOString()
  if (!session) {
    const started: InterviewSession = { id: crypto.randomUUID(), profileId, messages: [{ id: crypto.randomUUID(), role: 'assistant', content: firstQuestion }], step: 0, status: 'active', updatedAt }
    return answer.trim() ? advanceInterview(started, profileId, answer) : { session: started, suggestions: [] }
  }
  const next: InterviewSession = { ...session, messages: [...session.messages], status: 'active', updatedAt }
  if (!answer.trim()) return { session: next, suggestions: [] }
  next.messages.push({ id: crypto.randomUUID(), role: 'user', content: answer.trim() })
  next.step = Math.min(4, session.step + 1)
  const allAnswers = next.messages.filter(message => message.role === 'user').map(message => message.content).join('。')
  let question: string
  if (next.step === 1) question = /写真|撮影|カメラ/u.test(answer) ? '写真はどのような機材で、何を撮っていますか？人物やイベントなど、撮影した場面も教えてください。'
    : /仕事|営業|接客|会社|職場/u.test(answer) ? 'お仕事では具体的にどんな役割を担当していましたか？工夫したことや、役立った場面も教えてください。'
      : 'それを使って、実際にどんなことをしましたか？ご自身が担当した内容を教えてください。'
  else if (next.step === 2) question = /写真|撮影|カメラ/u.test(allAnswers) ? '撮影後の写真選びや編集も行っていますか？また、撮影以外に仕事や日常で得意なことはありますか？'
    : 'その経験以外にも、趣味や日常で得意なことはありますか？人からよく頼まれることでも構いません。'
  else if (next.step === 3) question = 'できることの確認はここまでです。活動に関わりたい頻度や時間帯があれば教えてください。能力とは分けて扱い、参加意欲を自動登録することはありません。'
  else {
    next.status = 'completed'
    question = 'ありがとうございます。最初の3つの回答からスキル候補を整理しました。公開前に、ご自身で内容を確認・修正してください。参加の頻度や意欲はプロフィールで別途設定できます。'
  }
  next.messages.push({ id: crypto.randomUUID(), role: 'assistant', content: question })
  const capabilityAnswers = next.messages.filter(message => message.role === 'user').slice(0, 3).map(message => message.content).join('。')
  return { session: next, suggestions: next.status === 'completed' ? extractSkills(capabilityAnswers, { profileId, origin: 'interview', reference: next.id }) : [] }
}
