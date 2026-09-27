'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink, Mail, MessageCircle, Sparkles } from 'lucide-react'
import type { Activity, TalentProfile } from '../types'

export type ContactChannel = 'email' | 'slack'

function makeDraft(profile: TalentProfile, activity?: Activity) {
  const subject = activity
    ? `【チームみらい】「${activity.title}」ご協力のお願い`
    : '【チームみらい】活動へのご協力のお願い'
  const activityDetails = activity
    ? `「${activity.title}」で、ぜひお力をお借りしたくご連絡しました。\n\n${activity.description}\n\n日時：${new Date(activity.date).toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' })}\n場所：${activity.location}\n募集内容：${activity.recruitment}\n必要なスキル：${activity.requiredSkills.join('、') || '指定なし'}\n`
    : 'プロフィールを拝見し、活動へのご協力についてご相談したくご連絡しました。\n'
  return {
    subject,
    body: `${profile.name}さん\n\nこんにちは。チームみらいのスタッフです。\n${activityDetails}\nご興味がありましたら、ご都合や協力できる内容をお知らせいただけますと幸いです。\nどうぞよろしくお願いします。`,
  }
}

export function ContactDraft({ profile, activities, initialChannel = 'email', onNotify }: {
  profile: TalentProfile
  activities: Activity[]
  initialChannel?: ContactChannel
  onNotify: (text: string) => void
}) {
  const [channel, setChannel] = useState<ContactChannel>(initialChannel)
  const [activityId, setActivityId] = useState('')
  const [subject, setSubject] = useState(() => makeDraft(profile).subject)
  const [body, setBody] = useState(() => makeDraft(profile).body)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const recipient = channel === 'email' ? profile.email : profile.slack

  function applyTemplate() {
    if (dirty && !window.confirm('編集中の連絡文を、選択した活動のテンプレートに置き換えますか？')) return
    const draft = makeDraft(profile, activities.find(activity => activity.id === activityId))
    setSubject(draft.subject)
    setBody(draft.body)
    setDirty(false)
    setSent(false)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(channel === 'email' ? `件名：${subject}\n\n${body}` : body)
      setError('')
      onNotify('連絡文をコピーしました')
    } catch {
      setError('コピーできませんでした。連絡文を選択して手動でコピーしてください。')
    }
  }

  function simulateSend() {
    if (!recipient || !body.trim() || (channel === 'email' && !subject.trim())) {
      setError('宛先・件名・連絡文を確認してください。')
      return
    }
    setError('')
    setSent(true)
    onNotify(`${channel === 'email' ? 'メール' : 'Slack DM'}のデモ送信を確認しました（実際には送信されません）`)
  }

  return <div className="t-dialog-body">
    <div className="t-alert">架空の宛先を使うデモです。「デモ送信」は画面内で完了を表示するだけで、実際のメール・Slackには届きません。</div>
    <div className="t-form-grid">
      <label className="t-field">連絡方法<select className="t-input" value={channel} onChange={event => { setChannel(event.target.value as ContactChannel); setSent(false) }}><option value="email">メール</option><option value="slack">Slack DM</option></select></label>
      <label className="t-field">活動情報<select className="t-input" value={activityId} onChange={event => setActivityId(event.target.value)}><option value="">活動を指定しない</option>{activities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}</select></label>
    </div>
    <p className="t-muted">宛先：{recipient || '未登録'}（サンプル）</p>
    <button type="button" className="t-button" onClick={applyTemplate}><Sparkles size={16} />テンプレートを反映</button>
    {channel === 'email' && <label className="t-field">件名<input className="t-input" value={subject} maxLength={200} onChange={event => { setSubject(event.target.value); setDirty(true); setSent(false) }} /></label>}
    <label className="t-field">連絡文<textarea className="t-textarea" value={body} rows={11} maxLength={5000} onChange={event => { setBody(event.target.value); setDirty(true); setSent(false) }} /></label>
    {error && <p className="t-alert t-alert-error" role="alert">{error}</p>}
    {sent && <p className="t-alert" role="status"><Check size={16} />デモ送信を確認しました。実際の連絡は行われていません。</p>}
    <div className="t-contact-actions">
      <button type="button" className="t-button" onClick={copy}><Copy size={16} />連絡文をコピー</button>
      <button type="button" className="t-button t-button-primary" onClick={simulateSend} disabled={!recipient || !body.trim() || (channel === 'email' && !subject.trim())}>{channel === 'email' ? <Mail size={16} /> : <MessageCircle size={16} />}デモ送信を試す</button>
      {channel === 'email'
        ? <a className="t-button" href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}><ExternalLink size={16} />メールアプリを開く</a>
        : <a className="t-button" href="https://app.slack.com/" target="_blank" rel="noreferrer"><ExternalLink size={16} />Slackを開く</a>}
    </div>
    <p className="t-muted">外部アプリでは宛先と文面を確認し、必要な場合だけご自身で送信してください。サンプルの宛先は自動入力しません。</p>
  </div>
}
