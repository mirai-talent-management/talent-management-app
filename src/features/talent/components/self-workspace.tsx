'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, Check, HeartHandshake, Lightbulb, LockKeyhole, MessageCircle, Pause, Play, Plus, Save, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { CATEGORY_LABELS, PARTICIPATION_LABELS, SOURCE_LABELS, type BootstrapData, type ProfilePatch, type SkillCategory, type SkillSuggestion, type TalentProfile, type TalentSkill } from '../types'
import { talentApi, type TalentClient } from '../services/client-api'
import { TalentAvatar, completeness } from './talent-ui'
import { TalentIllustration } from './talent-illustration'
import { SkillAgreementButton } from './skill-agreement-button'
import { matchesSupporterName, matchesSupporterPrefecture, PREFECTURES, splitResidenceLocation } from '../services/supporter-directory'

interface SelfWorkspaceProps {
  api?: TalentClient
  view: 'profile' | 'interview' | 'suggestions' | 'recommendations'
  data: BootstrapData
  onAction: (payload: Record<string, unknown>) => Promise<void>
  onRefresh: () => Promise<void>
  onNavigate: (view: string) => void
}

const displayDate = (value: string) => new Date(value).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
const words = (value: FormDataEntryValue | null) => [...new Set(String(value ?? '').split(/[、,\n]/u).map(item => item.trim()).filter(Boolean))]
const errorMessage = (error: unknown) => error instanceof Error ? error.message : '保存できませんでした。もう一度お試しください。'

function useOperation() {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('')
  async function run(operation: () => Promise<void>, message: string) {
    setBusy(true); setError(''); setSuccess('')
    try { await operation(); setSuccess(message); return true }
    catch (cause) { setError(errorMessage(cause)); return false }
    finally { setBusy(false) }
  }
  return { busy, error, success, run }
}

function Feedback({ error, success }: { error: string; success: string }) {
  return <>{error && <div className="t-alert t-alert-error" role="alert">{error}</div>}{success && <div className="t-alert" role="status"><Check size={17} /><span>{success}</span></div>}</>
}

function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="t-panel t-form-section"><h2 className="t-section-title">{title}</h2>{description && <p className="t-muted">{description}</p>}{children}</section>
}

export function SelfWorkspace(props: SelfWorkspaceProps) {
  const own = props.data.profiles.find(profile => profile.id === props.data.actor.id)
  if (props.view === 'recommendations') return <Recommendations {...props} />
  if (props.data.actor.role !== 'supporter' || !own) return <div className="t-panel t-empty"><LockKeyhole size={30} /><h2>サポーター本人専用の画面です</h2><p>右上からサポーターのデモアカウントを選んでください。</p></div>
  if (props.view === 'profile') return <ProfileEditor {...props} profile={own} />
  if (props.view === 'interview') return <Interview {...props} />
  return <Suggestions {...props} />
}

function ProfileEditor({ profile, data, onAction, onNavigate }: SelfWorkspaceProps & { profile: TalentProfile }) {
  const operation = useOperation(), skillOperation = useOperation()
  const [experience, setExperience] = useState(profile.experience)
  const residence = splitResidenceLocation(profile.location)
  const progress = completeness(profile)
  const pending = data.suggestions.filter(item => item.profileId === profile.id && item.status === 'pending').length
  const recommendations = data.recommendations.filter(item => item.toId === profile.id)
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const value = (name: string) => String(fields.get(name) ?? '').trim()
    const patch: ProfilePatch = {
      name: value('name'), kana: value('kana'), headline: value('headline'), municipality: value('municipality'), bio: value('bio'),
      email: value('email'), slack: value('slack'), hoursPerMonth: Number(fields.get('hoursPerMonth')),
      interests: words(fields.get('interests')), policyInterests: words(fields.get('policyInterests')),
      policyAdviceTopics: words(fields.get('policyAdviceTopics')), policyAdvicePerspective: value('policyAdvicePerspective'), motivation: profile.motivation,
      workExperience: value('workExperience'), personalExperience: value('personalExperience'), electionExperience: value('electionExperience'), communityExperience: value('communityExperience'),
      experience,
      participation: fields.getAll('participation') as ProfilePatch['participation'],
      availabilityDetails: { regions: words(fields.get('regions')), weekdays: fields.getAll('weekdays').map(String), timeSlots: fields.getAll('timeSlots').map(String), remote: fields.has('remote'), onsite: fields.has('onsite') },
    }
    await operation.run(() => onAction({ action: 'profile.save', profile: patch }), 'プロフィールを保存しました。')
  }
  async function addSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget, fields = new FormData(form)
    if (await skillOperation.run(() => onAction({ action: 'skill.add', text: String(fields.get('text') ?? ''), category: fields.get('category') }), '本人申告のスキルを追加しました。')) form.reset()
  }
  return <div className="t-self-grid">
    <div className="t-self-stack">
      <section className="t-panel t-profile-summary">
        <div className="t-between"><div className="t-mini-profile"><TalentAvatar profile={profile} large /><div><h2>{profile.name}</h2><p>{profile.headline}</p><span className="t-source">本人のプロフィール</span></div></div><strong>{progress.score}%</strong></div>
        <label className="t-field">プロフィールの充実度<progress max={100} value={progress.score} aria-label="プロフィールの充実度" /></label>
        {progress.missing.length > 0 && <p className="t-muted">次に追加するとよい情報：{progress.missing.join('、')}</p>}
        <div className="t-chip-row"><button className="t-button" onClick={() => onNavigate('interview')}><Sparkles size={16} />会話からスキルを発見</button><button className="t-button" onClick={() => onNavigate('suggestions')}>確認待ちの候補 {pending}件<ArrowRight size={16} /></button></div>
      </section>
      <form className="t-self-stack" onSubmit={save}>
        <fieldset disabled={operation.busy} style={{ border: 0, padding: 0, margin: 0 }} className="t-self-stack">
          <FormSection title="基本プロフィール">
            <div className="t-form-grid"><label className="t-field">表示名<input className="t-input" name="name" defaultValue={profile.name} required maxLength={100} /></label><label className="t-field">ふりがな<input className="t-input" name="kana" defaultValue={profile.kana} maxLength={100} /></label></div>
            <label className="t-field">ひとこと紹介<input className="t-input" name="headline" defaultValue={profile.headline} placeholder="例：写真と発信で、活動の魅力を伝えたい" maxLength={200} /></label>
            <label className="t-field">自己紹介・自己PR<textarea className="t-textarea" name="bio" defaultValue={profile.bio} rows={4} maxLength={5000} /></label>
            <div className="t-form-grid"><label className="t-field">都道府県（アクションボードから連携）<input className="t-input" value={residence.prefecture || '未設定'} readOnly aria-readonly="true" /></label><label className="t-field">市区町村（マイタレントで入力）<input className="t-input" name="municipality" defaultValue={residence.municipality} placeholder="例：横浜市" maxLength={100} /></label></div>
            <p className="t-muted">都道府県はデモアカウントの架空情報を表示しています。本番ではアクションボードの登録情報を参照し、市区町村だけをここで登録する想定です。</p>
            <div className="t-form-grid"><label className="t-field">メールアドレス<input className="t-input" type="email" name="email" defaultValue={profile.email} maxLength={254} /></label><label className="t-field">Slackアカウント<input className="t-input" name="slack" defaultValue={profile.slack} maxLength={100} /></label></div>
          </FormSection>
          <FormSection title="仕事も、暮らしの中の経験も" description="肩書きや資格がなくても大丈夫。実際に担当したこと、続けてきたことを書いてみましょう。">
            <div className="t-form-grid">{([
              ['workExperience', '仕事・専門スキル', '例：営業として提案・交渉を担当。業務でCanvaも使います。'],
              ['personalExperience', 'プライベートのスキル・経験', '例：趣味で写真撮影、地域の音楽イベントで音響を担当。'],
              ['electionExperience', '選挙活動の経験', '例：ビラ配り、街宣の受付、ハガシを担当しました。'],
              ['communityExperience', '平時の活動経験', '例：地域ミートアップの企画や初参加者への案内。'],
            ] as const).map(([name, label, placeholder]) => <label className="t-field" key={name}>{label}<textarea className="t-textarea" name={name} defaultValue={profile[name]} rows={4} placeholder={placeholder} maxLength={5000} /></label>)}</div>
          </FormSection>
          <FormSection title="関心のある活動" description="活動への関心を記録します。政策については次の欄で分けて登録できます。">
            <label className="t-field">興味のある活動<input className="t-input" name="interests" defaultValue={profile.interests.join('、')} placeholder="地域活動、イベント、広報・発信" /></label>
          </FormSection>
          <FormSection title="政策への関心・助言" description="本人申告の任意項目です。政策への関心と助言できる経験を分けて記録し、資格や専門性の認証とは扱いません。分野は読点（、）やカンマで区切れます。">
            <label className="t-field">どの政策に興味がありますか？<input className="t-input" name="policyInterests" defaultValue={profile.policyInterests.join('、')} placeholder="例：教育、行政DX、情報アクセシビリティ" maxLength={4000} /></label>
            <label className="t-field">どの政策なら助言できますか？<input className="t-input" name="policyAdviceTopics" defaultValue={(profile.policyAdviceTopics ?? []).join('、')} placeholder="例：教育、子育て支援" maxLength={4000} /></label>
            <label className="t-field">どんな立場・経験からの助言ですか？<textarea className="t-textarea" name="policyAdvicePerspective" defaultValue={profile.policyAdvicePerspective ?? ''} placeholder="例：学校での実務経験から、現場で困る点を共有できます" rows={3} maxLength={1000} /></label>
          </FormSection>
          <FormSection title="今の参加スタイル" description="能力とは分けて、今の気持ちをご自身で設定できます。AIが会話から参加意欲を判断することはありません。">
            <div className="t-chip-row">{Object.entries(PARTICIPATION_LABELS).map(([key, label]) => <label className="t-chip" key={key}><input type="checkbox" name="participation" value={key} defaultChecked={profile.participation.includes(key as ProfilePatch['participation'][number])} />{label}</label>)}</div>
            <label className="t-field">ひと月に活動できそうな時間（時間）<input className="t-input" type="number" name="hoursPerMonth" defaultValue={profile.hoursPerMonth} min={0} max={300} /></label>
            <p className="t-muted">「現在は休みたい」の設定中は候補チームの編成対象から外れます。スキルの記録は残ります。</p>
          </FormSection>
          <FormSection title="活動できる場所・時間">
            <label className="t-field">活動可能な地域<input className="t-input" name="regions" defaultValue={profile.availabilityDetails.regions.join('、')} placeholder="横浜、川崎、東京都（読点区切り）" /></label>
            <fieldset><legend className="t-field">曜日</legend><div className="t-chip-row">{['月', '火', '水', '木', '金', '土', '日'].map(day => <label className="t-chip" key={day}><input type="checkbox" name="weekdays" value={day} defaultChecked={profile.availabilityDetails.weekdays.some(value => value.replace(/曜日?$/u, '') === day)} />{day}曜</label>)}</div></fieldset>
            <fieldset><legend className="t-field">時間帯</legend><div className="t-chip-row">{['午前', '午後', '夜'].map(time => <label className="t-chip" key={time}><input type="checkbox" name="timeSlots" value={time} defaultChecked={profile.availabilityDetails.timeSlots.includes(time)} />{time}</label>)}</div></fieldset>
            <fieldset><legend className="t-field">参加方法</legend><div className="t-chip-row"><label className="t-chip"><input type="checkbox" name="remote" defaultChecked={profile.availabilityDetails.remote} />在宅・オンライン</label><label className="t-chip"><input type="checkbox" name="onsite" defaultChecked={profile.availabilityDetails.onsite} />現地参加</label></div></fieldset>
          </FormSection>
          <FormSection title="経験・実績" description="活動名と、その中で担った役割を残しておきましょう。">
            <div className="t-list">{experience.map((item, index) => <div className="t-panel" key={index}><div className="t-form-grid"><label className="t-field">活動名<input className="t-input" value={item.title} onChange={event => setExperience(current => current.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} required maxLength={200} /></label><label className="t-field">活動した年月<input className="t-input" type="month" value={item.date.slice(0, 7)} onChange={event => setExperience(current => current.map((entry, i) => i === index ? { ...entry, date: event.target.value } : entry))} required /></label></div><label className="t-field">担当したこと<textarea className="t-textarea" value={item.description} onChange={event => setExperience(current => current.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} rows={2} maxLength={5000} /></label><button type="button" className="t-button" aria-label={`${item.title || '未入力の実績'}を削除`} onClick={() => setExperience(current => current.filter((_, i) => i !== index))}><Trash2 size={14} />削除</button></div>)}</div>
            <button type="button" className="t-button" onClick={() => setExperience(current => [...current, { title: '', description: '', date: '' }])}><Plus size={16} />実績を追加</button>
          </FormSection>
        </fieldset>
        <Feedback error={operation.error} success={operation.success} />
        <div className="t-form-actions"><button type="submit" className="t-button t-button-primary" disabled={operation.busy}><Save size={17} />{operation.busy ? '保存しています…' : 'プロフィールを保存'}</button></div>
      </form>
    </div>
    <aside className="t-self-stack">
      <section className="t-panel"><div className="t-section-header"><h2 className="t-section-title">あなたのスキル</h2><span>{profile.talents.length}件</span></div><p className="t-muted">仕事の経験も、「明るい」「フッ軽」などの人柄も登録できます。人を傷つける表現は避けてください。</p><div className="t-list">{profile.talents.map(skill => <RegisteredSkill key={skill.id} skill={skill} onAction={onAction} />)}</div>
        <form onSubmit={addSkill} className="t-self-stack"><label className="t-field">新しいスキル・得意なこと<textarea className="t-textarea" name="text" placeholder="フットワーク軽い、良い声、黙々作業が得意… あなたの言葉で1つずつ。" maxLength={500} rows={3} required /></label><label className="t-field">カテゴリ<select className="t-input" name="category" defaultValue="personal">{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><Feedback error={skillOperation.error} success={skillOperation.success} /><button className="t-button t-button-primary" disabled={skillOperation.busy}><Plus size={16} />{skillOperation.busy ? '追加しています…' : 'スキルを追加'}</button></form>
      </section>
      <section className="t-panel"><HeartHandshake size={22} /><h2 className="t-section-title">仲間から届いた推薦</h2>{recommendations.length ? <div className="t-list">{recommendations.slice().reverse().slice(0, 3).map(recommendation => <div key={recommendation.id}><p>{recommendation.text}</p><small className="t-muted">{recommendation.fromName} · {displayDate(recommendation.createdAt)}</small></div>)}</div> : <p className="t-muted">一緒に活動した仲間の推薦が、ここに届きます。</p>}<button className="t-button" onClick={() => onNavigate('suggestions')}>候補を確認する<ArrowRight size={16} /></button></section>
    </aside>
  </div>
}

function RegisteredSkill({ skill, onAction }: { skill: TalentSkill; onAction: SelfWorkspaceProps['onAction'] }) {
  const [editing, setEditing] = useState(false), [text, setText] = useState(skill.originalText), [category, setCategory] = useState<SkillCategory>(skill.category)
  const operation = useOperation()
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await operation.run(() => onAction({ action: 'skill.update', id: skill.id, text, category }), 'スキルの表現とカテゴリを保存しました。')) setEditing(false)
  }
  function startEditing() { setText(skill.originalText); setCategory(skill.category); setEditing(true) }
  return <article>
    <strong>{skill.normalizedName}</strong><span className={`t-source t-source-${skill.source}`}>{SOURCE_LABELS[skill.source]}</span>
    {editing && skill.source === 'self' ? <form className="t-self-stack" onSubmit={save}>
      <label className="t-field">スキルの表現<textarea className="t-textarea" value={text} onChange={event => setText(event.target.value)} rows={3} maxLength={500} required disabled={operation.busy} /></label>
      <label className="t-field">スキルのカテゴリ<select className="t-input" value={category} onChange={event => setCategory(event.target.value as SkillCategory)} disabled={operation.busy}>{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <div className="t-chip-row"><button className="t-button t-button-primary" disabled={operation.busy || !text.trim()}><Save size={14} />{operation.busy ? '保存しています…' : '変更を保存'}</button><button type="button" className="t-button" disabled={operation.busy} onClick={() => setEditing(false)}>キャンセル</button></div>
    </form> : <><p className="t-muted">{skill.originalText}</p><small className="t-muted">{CATEGORY_LABELS[skill.category]}</small>{skill.source === 'self' && <div className="t-chip-row"><button className="t-button" disabled={operation.busy} aria-label={`${skill.normalizedName}を編集`} onClick={startEditing}>編集する</button><button className="t-button" disabled={operation.busy} aria-label={`${skill.normalizedName}を削除`} onClick={() => operation.run(() => onAction({ action: 'skill.remove', id: skill.id }), '本人申告スキルを削除しました。')}><Trash2 size={14} />{operation.busy ? '削除しています…' : '削除'}</button></div>}</>}
    <Feedback error={operation.error} success={operation.success} />
  </article>
}

function Interview({ data, onAction, onNavigate }: SelfWorkspaceProps) {
  const session = data.interview?.profileId === data.actor.id ? data.interview : null
  const interviewCandidates = data.suggestions.filter(suggestion => suggestion.profileId === data.actor.id && suggestion.origin === 'interview' && suggestion.evidence.reference === session?.id)
  const [answer, setAnswer] = useState('')
  const operation = useOperation(), end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [session?.messages.length])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await operation.run(() => onAction({ action: 'interview.answer', answer }), '回答を保存しました。')) setAnswer('')
  }
  return <div className="t-self-grid"><section className="t-panel t-self-stack">
    <div className="t-between"><div><span className="t-source t-source-ai">会話から発見</span><h2 className="t-section-title">経験の中にある、あなたの強み。</h2></div><span className="t-muted">{session?.step ?? 0} / 4</span></div>
    <progress max={4} value={session?.step ?? 0} aria-label="インタビューの進捗" />
    {!session ? <div className="t-empty"><MessageCircle size={38} /><h3>まずは、得意なことをひとつ。</h3><p>仕事や趣味、何気ない活動の経験から、スキルの候補を一緒に探します。回答は途中で保存できます。</p><button className="t-button t-button-primary" disabled={operation.busy} onClick={() => operation.run(() => onAction({ action: 'interview.answer', answer: '' }), 'インタビューを始めました。')}><Play size={16} />インタビューを始める</button></div> : <>
      <div className="t-interview-chat" role="log" aria-label="インタビューの会話" aria-live="polite">{session.messages.map(message => <div key={message.id} className={`t-chat-bubble ${message.role === 'user' ? 't-chat-user' : ''}`}><small>{message.role === 'user' ? 'あなた' : 'インタビュアー'}</small><p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p></div>)}<div ref={end} /></div>
      {session.status !== 'completed' && interviewCandidates.length > 0 && <div className="t-alert"><Sparkles size={20} /><div><strong>スキル候補が{interviewCandidates.length}件見つかりました</strong><p>回答の途中でも内容を確認できます。本人が承認するまでプロフィールには公開されません。</p><button className="t-button t-button-primary" onClick={() => onNavigate('suggestions')}>発見候補を確認する<ArrowRight size={16} /></button></div></div>}
      {session.status === 'completed' ? <div className="t-alert"><Check size={20} /><div><strong>インタビューが完了しました</strong><p>{interviewCandidates.length ? `${interviewCandidates.length}件の候補が見つかりました。内容を確認し、プロフィールに載せたいものだけ承認してください。` : '今回は辞書に該当する候補がありませんでした。プロフィールから自分の得意を直接登録できます。'}</p><div className="t-chip-row"><button className="t-button t-button-primary" onClick={() => onNavigate(interviewCandidates.length ? 'suggestions' : 'profile')}>{interviewCandidates.length ? 'スキル候補を確認する' : 'プロフィールを編集する'}<ArrowRight size={16} /></button><button className="t-button" disabled={operation.busy} onClick={() => operation.run(() => onAction({ action: 'interview.restart' }), '新しいインタビューを始められます。')}>もう一度インタビューする</button></div></div></div> : session.status === 'paused' ? <div className="t-alert"><Pause size={20} /><div><p>ここまでの会話を保存しています。</p><button className="t-button t-button-primary" disabled={operation.busy} onClick={() => operation.run(() => onAction({ action: 'interview.answer', answer: '' }), '保存した会話から再開しました。')}><Play size={16} />続きから再開</button></div></div> : <form className="t-self-stack" onSubmit={submit}><label className="t-field">あなたの回答<textarea className="t-textarea" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="例：趣味で写真を撮っています。地域イベントの記録撮影を担当しました。" rows={4} required maxLength={5000} disabled={operation.busy} /></label><div className="t-between"><button className="t-button" type="button" disabled={operation.busy} onClick={() => operation.run(() => onAction({ action: 'interview.pause' }), 'インタビューを一時保存しました。')}><Pause size={16} />一時保存して中断</button><button className="t-button t-button-primary" disabled={operation.busy || !answer.trim()}><Send size={16} />{operation.busy ? '保存しています…' : '回答を送る'}</button></div></form>}
    </>}
    <Feedback error={operation.error} success={operation.success} />
  </section><aside className="t-self-stack"><section className="t-panel"><Lightbulb size={24} /><h2 className="t-section-title">小さな経験も、立派なスキル。</h2><div className="t-chip-row"><span className="t-chip">趣味で写真撮影</span><span className="t-chip">イベントの受付</span><span className="t-chip">会話の聞き役</span></div></section><section className="t-panel"><ShieldCheck size={22} /><h2 className="t-section-title">公開する内容は、あなたが決める。</h2><p className="t-muted">候補は承認するまで公開されません。活動意欲は本人が設定します。</p></section></aside></div>
}

const ORIGIN_LABELS: Record<SkillSuggestion['origin'], string> = { slack: 'Slackサンプル', interview: 'AIインタビュー', recommendation: '仲間からの推薦', action_board: 'アクションボードサンプル' }

function Suggestions({ data, onAction }: SelfWorkspaceProps) {
  const [filter, setFilter] = useState<SkillSuggestion['status']>('pending')
  const own = data.suggestions.filter(suggestion => suggestion.profileId === data.actor.id)
  const shown = own.filter(suggestion => suggestion.status === filter)
  return <div className="t-self-grid t-suggestions-layout"><div className="t-self-stack">
    <div className="t-alert"><ShieldCheck size={19} /><span>自動でスキルに登録されることはありません。根拠を確かめて、ご自身の言葉で承認・修正してください。</span></div>
    <div className="t-chip-row" role="group" aria-label="候補の状態">{([['pending', '確認待ち'], ['approved', '承認済み'], ['rejected', '却下済み']] as const).map(([status, label]) => <button className={`t-chip ${filter === status ? 't-chip-selected' : ''}`} key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{label} {own.filter(item => item.status === status).length}</button>)}</div>
    {shown.length ? shown.slice().reverse().map(suggestion => <SuggestionCard key={suggestion.id} suggestion={suggestion} onAction={onAction} />) : <div className="t-panel t-empty"><Sparkles size={30} /><h2>{filter === 'pending' ? 'いま、確認待ちの候補はありません' : 'この状態の候補はありません'}</h2></div>}
  </div></div>
}

function SuggestionCard({ suggestion, onAction }: { suggestion: SkillSuggestion; onAction: SelfWorkspaceProps['onAction'] }) {
  const [text, setText] = useState(suggestion.originalText)
  const operation = useOperation()
  const pending = suggestion.status === 'pending'
  async function review(decision: 'approved' | 'rejected') {
    await operation.run(() => onAction({ action: 'suggestion.review', id: suggestion.id, decision, ...(decision === 'approved' ? { text } : {}) }), decision === 'approved' ? 'スキルに反映しました。' : 'この候補を却下しました。')
  }
  return <article className="t-panel t-suggestion-card"><div className="t-between"><span className={`t-source t-source-${suggestion.source}`}>{ORIGIN_LABELS[suggestion.origin]}</span><small className="t-muted">{displayDate(suggestion.createdAt)}</small></div><h2 className="t-section-title">{suggestion.normalizedName}</h2><div className="t-chip-row"><span className="t-chip">{CATEGORY_LABELS[suggestion.category]}</span><span className="t-chip">{suggestion.source === 'ai' ? pending ? 'AI推定・未確定' : 'AI発見・本人確認済み' : suggestion.source === 'recommendation' ? '他者推薦' : '活動記録由来'}</span>{!pending && <span className="t-chip">{suggestion.status === 'approved' ? '承認済み' : '却下済み'}</span>}</div><blockquote><p style={{ whiteSpace: 'pre-wrap' }}>{suggestion.evidence.text}</p></blockquote>
    {pending && <><label className="t-field">プロフィールに載せる表現（編集できます）<textarea className="t-textarea" value={text} onChange={event => setText(event.target.value)} rows={2} maxLength={500} disabled={operation.busy} /></label><div className="t-form-actions"><button className="t-button t-button-primary" disabled={operation.busy || !text.trim()} onClick={() => review('approved')}><Check size={16} />{operation.busy ? '保存中…' : 'この内容で承認'}</button><button className="t-button" disabled={operation.busy} onClick={() => review('rejected')}>今回は見送る</button></div></>}
    <Feedback error={operation.error} success={operation.success} />
  </article>
}

function Recommendations({ data, onAction }: SelfWorkspaceProps) {
  const acclaimed = data.profiles.flatMap(profile=>profile.talents.filter(skill=>skill.source==='recommendation' && data.agreementSummaries[skill.id]).map(skill=>({profile,skill}))).filter(item=>item.profile.id!==data.actor.id).slice(0,8)
  const candidates = data.profiles.filter(profile => profile.id !== data.actor.id)
  const [toId, setToId] = useState(''), [text, setText] = useState('')
  const [nameQuery, setNameQuery] = useState(''), [prefecture, setPrefecture] = useState('')
  const matchingCandidates = nameQuery.trim() ? candidates.filter(profile => matchesSupporterName(profile, nameQuery) && matchesSupporterPrefecture(profile, prefecture)) : []
  const operation = useOperation()
  const history = data.recommendations.filter(item => item.fromId === data.actor.id || item.toId === data.actor.id)
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await operation.run(() => onAction({ action: 'recommendation.send', toId, text }), '推薦を保存しました。スキルへの反映は本人の承認後です。')) setText('')
  }
  return <><div className="t-self-grid"><form className="t-panel t-self-stack" onSubmit={send}><TalentIllustration scene="praise" className="t-recommend-art"/><HeartHandshake size={26} /><h2 className="t-section-title">一緒に活動して気づいた強みを。</h2><div className="t-supporter-picker"><strong>推薦するサポーターを探す</strong><div className="t-form-grid"><label className="t-field">都道府県<select className="t-input" value={prefecture} onChange={event => { setPrefecture(event.target.value); setToId('') }}><option value="">すべての都道府県</option>{PREFECTURES.map(value => <option value={value} key={value}>{value}</option>)}</select></label><label className="t-field">名前・ふりがな<input className="t-input" type="search" value={nameQuery} onChange={event => { setNameQuery(event.target.value); setToId('') }} placeholder="例：田中、美咲、たなか" maxLength={100} autoComplete="off" /></label></div>{nameQuery.trim() ? <><p className="t-muted" aria-live="polite">{matchingCandidates.length}人が見つかりました{matchingCandidates.length > 20 ? '。先頭20人を表示しています。名前を詳しく入力して絞り込んでください。' : '。'}</p><div className="t-supporter-picker-results">{matchingCandidates.slice(0, 20).map(profile => <button type="button" key={profile.id} className={toId === profile.id ? 'is-selected' : ''} aria-pressed={toId === profile.id} onClick={() => setToId(profile.id)}><TalentAvatar profile={profile}/><span><strong>{profile.name}</strong><small>{profile.kana} · {profile.location}</small></span><span>{toId === profile.id ? '選択中' : '選ぶ'}</span></button>)}</div>{toId && <p className="t-supporter-picker-selected" role="status">推薦先：{candidates.find(profile => profile.id === toId)?.name}</p>}{matchingCandidates.length === 0 && <p className="t-muted">該当する人がいません。名前や都道府県を確認してください。</p>}</> : <p className="t-muted">名前かふりがなを入力すると候補が表示されます。</p>}</div><label className="t-field">推薦文<textarea className="t-textarea" value={text} onChange={event => setText(event.target.value)} placeholder="例：地域イベントで初参加者の案内を担当してくれました。場の様子を見ながら声をかけるのが得意です。" rows={7} required maxLength={2000} /></label><Feedback error={operation.error} success={operation.success} /><button className="t-button t-button-primary" disabled={operation.busy || !toId || !text.trim()}><Send size={16} />{operation.busy ? '保存しています…' : '推薦を届ける'}</button></form><aside className="t-panel"><h2 className="t-section-title">あなたの推薦履歴</h2>{history.length ? <div className="t-list">{history.slice().reverse().map(recommendation => <article key={recommendation.id}><span className="t-source t-source-recommendation">{recommendation.fromId === data.actor.id ? '送った推薦' : '届いた推薦'}</span><h3>{recommendation.fromName} → {data.profiles.find(profile => profile.id === recommendation.toId)?.name || 'サポーター'}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{recommendation.text}</p><small className="t-muted">{displayDate(recommendation.createdAt)} · 他者推薦</small></article>)}</div> : <div className="t-empty"><HeartHandshake size={28} /><p>まだ推薦はありません。仲間の強みをひとつ、届けてみませんか。</p></div>}</aside></div><section className="t-panel t-recommend-gallery"><div><TalentIllustration scene="praise" className="t-recommend-gallery-art"/><div><span className="t-small-label">みんなからのいいね</span><h2>仲間が見つけた、すてきな得意。</h2><p>承認済みの推薦スキルに、共感や感謝を伝えられます。数は能力の点数には使いません。</p></div></div><div className="t-recommend-cards">{acclaimed.map(({profile,skill})=><article key={skill.id}><div className="t-recommend-card-top"><TalentAvatar profile={profile}/><span className="t-skill t-skill-recommendation">他者推薦</span></div><h3>{skill.normalizedName}</h3><p>{skill.originalText}</p><small>{profile.name}</small><SkillAgreementButton skillId={skill.id} summary={data.agreementSummaries[skill.id]} onToggle={id=>onAction({action:'skill.agreement.toggle',skillId:id})}/></article>)}</div></section></>
}
