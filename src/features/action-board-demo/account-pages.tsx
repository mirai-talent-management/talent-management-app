'use client'

import { ArrowRight, Award, BadgeCheck, CalendarDays, ChevronRight, CircleHelp, ExternalLink, History, LockKeyhole, MapPin, ShieldCheck, Sparkles, Sprout, Trophy, UserRound } from 'lucide-react'
import type { BoardBootstrap } from './model'
import { TalentAvatar } from '../talent/components/talent-ui'
import { TalentIllustration } from '../talent/components/talent-illustration'

type Navigate = (view:string)=>void
const when = (value:string) => new Date(value).toLocaleDateString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit'})

/** A local proposal mirroring the public /users/[id] section order. */
export function BoardMyPage({data,navigate}:{data:BoardBootstrap;navigate:Navigate}) {
  const profile=data.profiles.find(item=>item.id===data.actor.id)
  if(!profile)return null
  const achievements=data.board.achievements
  const level=Math.max(1,Math.floor(data.board.points/200)+1)
  return <div className="ab-account-stack">
    <section className="ab-official-profile-card" aria-label="既存のマイページ情報のデモ"><TalentAvatar profile={profile} large/><div><strong>{profile.name}</strong><div><b>LV. <em>{level}</em></b><span><MapPin size={17}/>{profile.location}</span></div><p>{data.board.points.toLocaleString()} ポイント（デモ）</p></div><button className="ab-original-link" onClick={()=>navigate('settings')}>アカウント設定<ChevronRight size={16}/></button></section>
    <section className="ab-original-card"><h2>獲得バッジ</h2>{achievements.length?<span className="ab-original-badge"><Award size={18}/>デモミッションを達成しました</span>:<p>このデモで獲得したバッジはまだありません。</p>}</section>
    <section className="ab-original-card"><h2>ミッション達成状況</h2><div className="ab-total-achievements"><span><Trophy size={18}/>総達成数</span><strong>{achievements.length}<small> 回</small></strong></div>{achievements.slice(0,4).map(item=><div className="ab-original-row" key={item.id}><span>{item.title}</span><b>1 <small>回</small></b></div>)}<button className="ab-original-link" onClick={()=>navigate('missions')}>ミッションを見る<ChevronRight size={16}/></button></section>
    <section className="ab-original-card"><h2>活動タイムライン</h2>{achievements.length?achievements.slice(0,3).map(item=><div className="ab-timeline-row" key={item.id}><span className="ab-timeline-dot"/><div><strong>「{item.title}」を達成しました！</strong><small>{when(item.occurredAt)} · サンプル活動</small></div></div>):<p>このデモでの活動はまだありません。</p>}<button className="ab-original-link" onClick={()=>navigate('history')}>活動履歴を見る<ChevronRight size={16}/></button></section>
    <section className="ab-original-card"><h2>シーズン履歴</h2><div className="ab-season-row"><span>ローカル・デモシーズン</span><b>Lv.{level}　{data.board.points.toLocaleString()} ポイント</b></div></section>
    <section className="ab-account-addition" aria-label="追加提案：マイタレント"><div className="ab-addition-mark"><Sparkles size={17}/>追加提案 · マイタレント</div><div className="ab-addition-body"><TalentIllustration scene="people"/><div><h2>活動で見つかった「得意」も、マイページに。</h2><div className="ab-addition-skills">{profile.talents.slice(0,4).map(skill=><span key={skill.id}>{skill.normalizedName}</span>)}</div><button className="ab-button primary" onClick={()=>navigate('talent')}>マイタレントを開く<ArrowRight size={16}/></button></div></div></section>
  </div>
}

/** The existing Account settings are shown as a read-only local shell. */
export function BoardAccountSettings({data,navigate}:{data:BoardBootstrap;navigate:Navigate}) {
  const profile=data.profiles.find(item=>item.id===data.actor.id)
  if(!profile)return null
  const prefecture=profile.location.match(/.{2,3}[都道府県]/)?.[0]||profile.location
  return <div className="ab-settings-stack"><p className="ab-settings-explainer"><ShieldCheck size={18}/>本家の既存アカウント設定を置き換えない配置例です。この独立デモでは既存の認証・メール・退会・個人情報には接続しません。</p>
    <section className="ab-settings-card"><header><h2>プロフィール設定</h2><p>公開されるプロフィール情報を編集します。</p></header><div className="ab-settings-fields"><div className="ab-settings-avatar"><span>{profile.name.slice(0,1)}</span><button disabled title="本家アカウントには接続しません">画像を変更する</button></div><label>ニックネーム<input value={profile.name} readOnly aria-readonly="true"/></label><label>生年月日<small>この項目は公開されません</small><input value="本家アカウントの情報は取得しません" readOnly aria-readonly="true"/></label><p className="ab-settings-help"><CircleHelp size={15}/>なぜ生年月日が必要ですか？</p><label>都道府県<input value={prefecture} readOnly aria-readonly="true"/></label><label>郵便番号(ハイフンなし半角7桁)<small>この項目は公開されません</small><input value="本家アカウントの情報は取得しません" readOnly aria-readonly="true"/></label><p className="ab-settings-help"><CircleHelp size={15}/>なぜ郵便番号が必要ですか？</p><label>X(旧Twitter)のユーザー名 <small>オプション</small><input value="" placeholder="@を除いたユーザー名" readOnly aria-readonly="true"/></label><label>GitHubのユーザー名 <small>オプション</small><input value="" placeholder="GitHubのユーザー名" readOnly aria-readonly="true"/></label></div><footer><button disabled>更新する</button></footer></section>
    <section className="ab-settings-card"><header><h2>ログイン設定</h2></header><div className="ab-settings-fields"><strong>ログイン方法</strong><p>本家の認証情報は取得しません</p><strong>メールアドレス</strong><p>本家のメールアドレスは取得しません</p><button disabled className="ab-settings-outline">メールアドレスを変更する</button></div></section>
    <section className="ab-settings-extras"><h3>外部サービス連携</h3><div><ExternalLink size={18}/> TikTok連携 <ChevronRight size={16}/></div><div><ExternalLink size={18}/> YouTube連携 <ChevronRight size={16}/></div></section>
    <button disabled className="ab-settings-delete">アクションボードを退会する</button>
    <section className="ab-account-addition ab-settings-addition"><div className="ab-addition-mark"><Sprout size={17}/>追加提案 · マイタレント</div><div className="ab-addition-body"><TalentIllustration scene="praise"/><div><h2>マイタレント</h2><p>得意・経験・活動条件を本人が管理します。</p><div className="ab-addition-actions"><button className="ab-button primary" onClick={()=>navigate('talent')}>タレント概要<ArrowRight size={16}/></button><button className="ab-button" onClick={()=>navigate('profile')}>得意・活動条件を編集</button></div></div></div></section>
    <p className="ab-settings-caption"><LockKeyhole size={14}/>既存設定の表示は公開ソースに基づくサンプルです。本家の値や変更機能は読み込んでいません。</p>
  </div>
}
