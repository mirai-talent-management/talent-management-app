'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowDownUp, ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Copy, ExternalLink, Filter, HeartHandshake, LayoutGrid, List, LoaderCircle, LogOut, Mail, MapPin, Menu, MessageSquare, Plus, Search, SlidersHorizontal, Sparkles, UserRound, Users, X } from 'lucide-react'
import { AVAILABILITY_OPTIONS, INTEREST_OPTIONS, MOTIVATION_LABELS, SKILL_OPTIONS, initialActivities, initialRecommendations, initialSupporters, matchSupporter, recommendSkillApproval } from './domain'
import type { Activity, Motivation, Recommendation, Role, Supporter } from './domain'
import { ActivityEditor, ProfileEditor } from './components/Editors'
import { supabase } from './lib/supabase'
import { loadBackendData, reviewBackendRecommendation, saveBackendActivity, saveBackendProfile, submitBackendRecommendation } from './lib/backend'

type Screen = 'search' | 'activities' | 'profile' | 'recommendations'
type Snapshot = { supporters: Supporter[]; activities: Activity[]; recommendations: Recommendation[] }
const STORAGE_KEY = 'mirai-connect-demo-v1'
const emptySnapshot: Snapshot = { supporters: [], activities: [], recommendations: [] }
const demoSnapshot: Snapshot = { supporters: initialSupporters, activities: initialActivities, recommendations: initialRecommendations }
const dateLabel = (date: string) => new Date(date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
const initials = (name: string) => name.replace(/\s/g, '').slice(0, 1)

function Avatar({ person, large = false }: { person: Supporter; large?: boolean }) {
  return <span className={`avatar ${large ? 'large' : ''}`} style={{ backgroundColor: `${person.color}18`, color: person.color }}>{initials(person.name)}</span>
}
function Tags({ skills, matched = [] }: { skills: Supporter['skills']; matched?: string[] }) {
  return <div className="flex flex-wrap gap-2">{skills.map(skill => <span key={skill.name} className={`skill-tag ${matched.includes(skill.name) ? 'matched' : ''} ${skill.source === 'recommended' ? 'recommended' : ''}`} title={skill.source === 'recommended' ? `他者推薦スキル・${skill.endorsers.length}名から推薦` : `本人登録${skill.endorsers.length ? `・${skill.endorsers.length}名からも推薦` : ''}`}>{skill.source === 'recommended' && <BadgeCheck size={13} />}{skill.name}{skill.endorsers.length > 0 && <small>+{skill.endorsers.length}</small>}</span>)}</div>
}
function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab') {
        const focusables = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')
        if (!focusables?.length) { e.preventDefault(); return }
        const first = focusables[0], last = focusables[focusables.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [])
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? 'wide' : ''}`}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="閉じる" onClick={onClose}><X size={22} /></button></div>{children}</div></div>
}

export default function App() {
  const [data, setData] = useState<Snapshot>(supabase ? emptySnapshot : demoSnapshot)
  const [ready, setReady] = useState(false)
  const [role, setRole] = useState<Role>('staff')
  const [selfId, setSelfId] = useState('s1')
  const [loggedIn, setLoggedIn] = useState(!supabase)
  const [screen, setScreen] = useState<Screen>('search')
  const [activityId, setActivityId] = useState(supabase ? '' : 'a1')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(supabase ? [] : ['SNS', 'Instagram', '動画編集', '広報'])
  const [query, setQuery] = useState('')
  const [interest, setInterest] = useState('')
  const [motivation, setMotivation] = useState('')
  const [availability, setAvailability] = useState('')
  const [location, setLocation] = useState('')
  const [recommendedOnly, setRecommendedOnly] = useState(false)
  const [experiencedOnly, setExperiencedOnly] = useState(false)
  const [allSkills, setAllSkills] = useState(false)
  const [sort, setSort] = useState('match')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [contact, setContact] = useState<{ person: Supporter; channel: 'email' | 'slack' } | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [activityEditor, setActivityEditor] = useState<Activity | 'new' | null>(null)
  const [recommendTarget, setRecommendTarget] = useState<Supporter | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [toast, setToast] = useState('')
  const [storageError, setStorageError] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const { supporters, activities, recommendations } = data
  const self = supporters.find(p => p.id === selfId)
  const detail = supporters.find(p => p.id === detailId)
  const activeActivity = activities.find(a => a.id === activityId)
  const pending = recommendations.filter(r => r.toId === selfId && r.status === 'pending')

  async function refreshBackend() {
    const snapshot = await loadBackendData()
    setData(snapshot); setRole(snapshot.role); setSelfId(snapshot.selfId); setLoggedIn(true)
  }
  useEffect(() => {
    if (!supabase) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed.supporters) && Array.isArray(parsed.activities) && Array.isArray(parsed.recommendations) && parsed.supporters.every((p: Supporter) => p.id && Array.isArray(p.skills) && Array.isArray(p.experience))) setData(parsed)
        }
      } catch { setStorageError('ブラウザへの保存を利用できません。変更はこの画面を開いている間だけ保持されます。') }
      setReady(true); return
    }
    let cancelled = false
    const client = supabase
    client.auth.getSession().then(async ({ data: auth, error: authError }) => {
      if (authError) throw authError
      if (auth.session && !cancelled) await refreshBackend()
    }).catch(e => setError(e.message)).finally(() => { if (!cancelled) setReady(true) })
    const { data: listener } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { setLoggedIn(false); setData(emptySnapshot); setDetailId(null); setContact(null); setEditingProfile(false); setActivityEditor(null); setRecommendTarget(null) }
    })
    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!ready || supabase) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
    catch { setStorageError('ブラウザに保存できませんでした。この画面を閉じると変更が失われます。') }
  }, [data, ready])
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer) } }, [toast])
  useEffect(() => { setPage(1) }, [query, selectedSkills, interest, motivation, availability, location, recommendedOnly, experiencedOnly, allSkills, sort])

  const results = useMemo(() => supporters.map(person => ({ person, match: matchSupporter(person, selectedSkills) })).filter(({ person, match }) => {
    const text = [person.name, person.kana, person.headline, person.bio, person.location, ...person.skills.map(s => s.name), ...person.experience.map(e => `${e.title} ${e.description}`)].join(' ').toLowerCase()
    return (!query.trim() || query.toLowerCase().trim().split(/\s+/).every(q => text.includes(q))) && (!selectedSkills.length || (allSkills ? match.missingSkills.length === 0 : match.matchedSkills.length > 0)) && (!interest || person.interests.includes(interest)) && (!motivation || person.motivation === motivation) && (!availability || person.availability.includes(availability)) && (!location || person.location.includes(location)) && (!recommendedOnly || person.skills.some(s => s.endorsers.length > 0 && (!selectedSkills.length || selectedSkills.includes(s.name)))) && (!experiencedOnly || person.experience.length > 0)
  }).sort((a, b) => sort === 'name' ? a.person.name.localeCompare(b.person.name, 'ja') : sort === 'motivation' ? matchSupporter(b.person, []).motivationScore - matchSupporter(a.person, []).motivationScore || b.match.score - a.match.score : b.match.score - a.match.score || a.person.name.localeCompare(b.person.name, 'ja')), [supporters, query, selectedSkills, interest, motivation, availability, location, recommendedOnly, experiencedOnly, allSkills, sort])
  const pageCount = Math.max(1, Math.ceil(results.length / 6))
  const currentPage = Math.min(page, pageCount)
  const pageResults = results.slice((currentPage - 1) * 6, currentPage * 6)
  const filtersCount = selectedSkills.length + [interest, motivation, availability, location, recommendedOnly, experiencedOnly, allSkills].filter(Boolean).length

  function navigate(next: Screen) { setScreen(next); setMobileNav(false); setError('') }
  function toggleSkill(skill: string) { setSelectedSkills(previous => previous.includes(skill) ? previous.filter(s => s !== skill) : [...previous, skill]) }
  function chooseActivity(id: string) { setActivityId(id); setSelectedSkills(activities.find(a => a.id === id)?.requiredSkills ?? []) }
  function clearFilters() { setSelectedSkills([]); setActivityId(''); setQuery(''); setInterest(''); setMotivation(''); setAvailability(''); setLocation(''); setRecommendedOnly(false); setExperiencedOnly(false); setAllSkills(false) }
  async function saveProfile(profile: Supporter) {
    if (role !== 'supporter' || profile.id !== selfId) throw new Error('自分のプロフィールのみ編集できます。')
    if (supabase) { await saveBackendProfile(profile); await refreshBackend() }
    else setData(previous => ({ ...previous, supporters: previous.supporters.map(p => p.id === profile.id ? profile : p) }))
    setEditingProfile(false); setToast('プロフィールを保存しました')
  }
  async function saveActivity(activity: Activity) {
    if (role !== 'staff') throw new Error('活動を登録できるのは議員・スタッフです。')
    if (supabase) { await saveBackendActivity(activity); await refreshBackend() }
    else setData(previous => ({ ...previous, activities: previous.activities.some(a => a.id === activity.id) ? previous.activities.map(a => a.id === activity.id ? activity : a) : [activity, ...previous.activities] }))
    setActivityEditor(null); setToast('活動を保存しました')
  }
  async function submitRecommendation(skill: string, message: string) {
    if (role !== 'supporter' || !recommendTarget || recommendTarget.id === selfId) throw new Error('他のサポーターへの推薦を選んでください。')
    if (recommendations.some(r => r.fromId === selfId && r.toId === recommendTarget.id && r.skill === skill && r.status !== 'rejected')) throw new Error('このスキルはすでに推薦しています。')
    const rec: Recommendation = { id: crypto.randomUUID(), fromId: selfId, toId: recommendTarget.id, skill, message, status: 'pending', createdAt: new Date().toISOString() }
    if (supabase) { await submitBackendRecommendation(rec); await refreshBackend() }
    else setData(previous => ({ ...previous, recommendations: [rec, ...previous.recommendations] }))
    setRecommendTarget(null); setToast('スキルを推薦しました。本人の承認後に反映されます')
  }
  async function reviewRecommendation(rec: Recommendation, approve: boolean) {
    if (role !== 'supporter' || rec.toId !== selfId || rec.status !== 'pending' || busyId) return
    setBusyId(rec.id)
    try {
      if (supabase) { await reviewBackendRecommendation(rec.id, approve); await refreshBackend() }
      else setData(previous => ({ ...previous, supporters: approve ? recommendSkillApproval(previous.supporters, rec) : previous.supporters, recommendations: previous.recommendations.map(r => r.id === rec.id ? { ...r, status: approve ? 'approved' : 'rejected' } : r) }))
      setToast(approve ? '推薦を承認してスキルに追加しました' : '推薦を見送りました')
    } catch (e) { setError(e instanceof Error ? e.message : '更新できませんでした') } finally { setBusyId('') }
  }
  async function logout() {
    if (supabase) { const { error: signOutError } = await supabase.auth.signOut(); if (signOutError) { setError(signOutError.message); return } }
    setLoggedIn(false); setMobileNav(false)
  }
  const titles: Record<Screen, string> = { search: role === 'staff' ? 'サポーターを探す' : '仲間のスキルを知る', activities: '活動を管理する', profile: 'マイプロフィール', recommendations: 'スキルの推薦' }

  if (!ready) return <div className="loading-screen"><img src="/favicon.svg" alt="" width="48" height="48" /><p>みらいコネクト</p><LoaderCircle className="animate-spin" size={22} /></div>
  if (!loggedIn) return <LoginScreen onLogin={async (nextRole, nextId) => { if (supabase) await refreshBackend(); else { setRole(nextRole); setSelfId(nextId); setLoggedIn(true) }; setScreen(nextRole === 'supporter' ? 'profile' : 'search') }} supporters={supporters.length ? supporters : initialSupporters} error={error} />

  return <div className="app-shell">
    {mobileNav && <div className="nav-overlay" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('search') }}><img src="/favicon.svg" alt="" width="39" height="39" /><span>みらいコネクト<small>TEAM MIRAI SUPPORTERS</small></span></a>
      <div className="workspace-label"><span className="workspace-icon"><Users size={17} /></span><div>チームみらい<small>サポーターワークスペース</small></div></div>
      <div className="nav-section-label">ワークスペース</div>
      <nav className="navigation" aria-label="メインメニュー">
        <button onClick={() => navigate('search')} className={screen === 'search' ? 'active' : ''}><Search size={19} />{role === 'staff' ? 'サポーターを探す' : 'サポーター一覧'}<ChevronRight className="nav-arrow" size={15} /></button>
        {role === 'staff' && <button onClick={() => navigate('activities')} className={screen === 'activities' ? 'active' : ''}><CalendarDays size={19} />活動を管理する</button>}
        {role === 'supporter' && <><button onClick={() => navigate('profile')} className={screen === 'profile' ? 'active' : ''}><UserRound size={19} />マイプロフィール</button><button onClick={() => navigate('recommendations')} className={screen === 'recommendations' ? 'active' : ''}><BadgeCheck size={19} />スキルの推薦{pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button></>}
      </nav>
      <div className="sidebar-bottom"><div className="connection-note"><HeartHandshake size={22} /><strong>ひとりの「できる」が、<br />みんなの力に。</strong><p>得意なことから、活動をつなごう。</p></div><button className="help-link" onClick={() => setShowHelp(true)}><CircleHelp size={17} />使い方・マッチングについて</button><div className="sidebar-version">みらいコネクト <span>MVP 0.1</span></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="flex items-center gap-3"><button className="icon-button mobile-menu" aria-label="メニューを開く" onClick={() => setMobileNav(true)}><Menu size={22} /></button><span className="breadcrumb">ワークスペース</span><ChevronRight className="breadcrumb" size={14} /><span>{titles[screen]}</span></div><div className="topbar-actions">{!supabase && <span className="demo-pill">サンプルデータ</span>}<button className="account-button" onClick={() => !supabase && setShowLogin(true)} disabled={!!supabase}><span className="account-avatar">{role === 'staff' ? '事' : initials(self?.name || 'サ')}</span><span>{role === 'staff' ? '議員・スタッフ' : self?.name}<small>{supabase ? (role === 'staff' ? 'スタッフアカウント' : 'サポーター') : 'デモアカウントを切り替え'}</small></span>{!supabase && <ChevronDown size={15} />}</button><button className="icon-button logout-button" title="ログアウト" aria-label="ログアウト" onClick={logout}><LogOut size={18} /></button></div></header>
      <main className="main-content">
        {storageError && <div className="notice warning">{storageError}</div>}
        {error && <div className="notice error" role="alert">{error}<button onClick={() => setError('')} aria-label="エラーを閉じる"><X size={17} /></button></div>}
        <div className="page-heading"><div><div className="eyebrow">{screen === 'search' ? 'FIND YOUR TEAM' : screen === 'activities' ? 'MAKE IT HAPPEN' : screen === 'profile' ? 'YOUR SKILLS, YOUR STORY' : 'RECOGNIZE EACH OTHER'}</div><h1>{titles[screen]}</h1><p>{screen === 'search' ? '得意なこと、やってみたいこと。次の活動を一緒につくる仲間を。' : screen === 'activities' ? '活動に必要なスキルを登録して、ぴったりの仲間を見つけましょう。' : screen === 'profile' ? 'あなたの得意なことと、活動への想いを伝えましょう。' : '一緒に活動して気づいた、仲間の「できる」を伝えましょう。'}</p></div>{role === 'staff' && <button className="button primary" onClick={() => setActivityEditor('new')}><Plus size={18} />活動を登録</button>}{screen === 'profile' && self && <button className="button primary" onClick={() => setEditingProfile(true)}><Plus size={17} />プロフィール・スキルを編集</button>}</div>

        {screen === 'search' && <>
          <div className="summary-strip"><div><span className="stat-icon mint"><Users size={20} /></span><span>登録サポーター<strong>{supporters.length}<small>人</small></strong></span></div><div><span className="stat-icon amber"><Sparkles size={20} /></span><span>積極的に参加したい<strong>{supporters.filter(p => p.motivation === 'high').length}<small>人</small></strong></span></div><div><span className="stat-icon blue"><CalendarDays size={20} /></span><span>募集中の活動<strong>{activities.filter(a => a.status === 'recruiting').length}<small>件</small></strong></span></div><span className="summary-caption">それぞれの得意を、<br />チームの力に。</span></div>
          {role === 'staff' && <section className="activity-match-panel"><div className="match-panel-label"><span className="match-icon"><Sparkles size={21} /></span><div><h2>活動に合わせてマッチング</h2><p>活動を選ぶと、必要なスキルが検索条件に入ります。</p></div></div><div className="activity-selector"><label className="sr-only" htmlFor="activity-select">マッチングする活動</label><select id="activity-select" value={activityId} onChange={e => chooseActivity(e.target.value)}><option value="">活動を選択してください</option>{activities.map(a => <option value={a.id} key={a.id}>{a.title}{a.status === 'closed' ? '（募集終了）' : ''}</option>)}</select><ChevronDown size={17} /><div className="activity-meta">{activeActivity ? <><CalendarDays size={13} />{dateLabel(activeActivity.date)}<span>·</span><MapPin size={13} />{activeActivity.location}</> : <span>スキルタグから直接検索することもできます</span>}</div></div></section>}
          <div className="search-workspace">
            <aside className={`filter-panel ${showFilters ? 'show-mobile' : ''}`} aria-label="検索条件"><div className="filter-heading"><h2><SlidersHorizontal size={17} />絞り込み</h2><button className="text-button" onClick={clearFilters}>リセット</button></div><div className="filter-body"><div className="filter-group"><label className="filter-label">スキルタグ<span>{selectedSkills.length}</span></label><div className="filter-tags">{selectedSkills.map(skill => <button key={skill} onClick={() => toggleSkill(skill)} className="filter-tag">{skill}<X size={13} /></button>)}</div><label htmlFor="skill-select" className="sr-only">スキルを追加</label><select id="skill-select" className="input" value="" onChange={e => { if (e.target.value) toggleSkill(e.target.value) }}><option value="">＋ スキルを追加</option>{Array.from(new Set([...SKILL_OPTIONS, ...supporters.flatMap(p => p.skills.map(s => s.name))])).filter(s => !selectedSkills.includes(s)).map(s => <option key={s}>{s}</option>)}</select><label className="check-label"><input type="checkbox" checked={allSkills} onChange={e => setAllSkills(e.target.checked)} />すべてのスキルに一致</label></div>
              <div className="filter-group"><label className="filter-label" htmlFor="interest-filter">興味・関心</label><select className="input" id="interest-filter" value={interest} onChange={e => setInterest(e.target.value)}><option value="">すべての興味・関心</option>{INTEREST_OPTIONS.map(s => <option key={s}>{s}</option>)}</select></div>
              <fieldset className="filter-group"><legend className="filter-label">活動へのモチベーション</legend>{[['', 'すべて'], ...Object.entries(MOTIVATION_LABELS)].map(([value, label]) => <label key={value} className="radio-label"><input name="motivation" type="radio" value={value} checked={motivation === value} onChange={() => setMotivation(value)} />{label}</label>)}</fieldset>
              <div className="filter-group"><label className="filter-label" htmlFor="availability-filter">活動できる時間・場所</label><select className="input" id="availability-filter" value={availability} onChange={e => setAvailability(e.target.value)}><option value="">すべての活動条件</option>{AVAILABILITY_OPTIONS.map(s => <option key={s}>{s}</option>)}</select><label className="sr-only" htmlFor="location-filter">居住エリア</label><input className="input mt-2" id="location-filter" placeholder="エリア（例：東京都）" value={location} onChange={e => setLocation(e.target.value)} /></div>
              <div className="filter-group last"><label className="check-label"><input type="checkbox" checked={recommendedOnly} onChange={e => setRecommendedOnly(e.target.checked)} />他者からの推薦あり</label><label className="check-label"><input type="checkbox" checked={experiencedOnly} onChange={e => setExperiencedOnly(e.target.checked)} />過去の活動実績あり</label></div></div><div className="filter-footer"><BadgeCheck size={15} /><span>推薦は本人が承認したものを表示</span></div></aside>
            <section className="results-panel" aria-label="サポーター検索結果"><div className="search-input-wrap"><Search size={20} /><input aria-label="名前・スキル・経験で検索" value={query} onChange={e => setQuery(e.target.value)} placeholder="名前、スキル、経験などで検索" />{query && <button aria-label="検索キーワードを消す" onClick={() => setQuery('')}><X size={17} /></button>}</div>
              <div className="results-toolbar"><div className="result-count" aria-live="polite"><strong>{results.length}</strong>人のサポーター<span>全{supporters.length}人</span></div><div className="flex items-center gap-2"><button className="icon-button filter-mobile-toggle" aria-label="検索条件を表示" onClick={() => setShowFilters(!showFilters)}><Filter size={18} /></button><div className="sort-control"><ArrowDownUp size={15} /><select aria-label="並び順" value={sort} onChange={e => setSort(e.target.value)}><option value="match">おすすめ順</option><option value="motivation">モチベーション順</option><option value="name">名前順</option></select></div><div className="view-switch"><button className={view === 'grid' ? 'active' : ''} aria-label="カード表示" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button><button className={view === 'list' ? 'active' : ''} aria-label="リスト表示" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={19} /></button></div></div></div>
              <div className="ranking-note"><Sparkles size={14} /><span>{selectedSkills.length ? 'スキル一致度・モチベーション・他者推薦をもとに表示' : 'スキルを選ぶと、活動とのマッチ度が表示されます'}</span><button onClick={() => setShowHelp(true)} aria-label="マッチ度の計算方法"><CircleHelp size={14} /></button></div>
              {results.length ? <div className={`supporter-grid ${view === 'list' ? 'list-view' : ''}`}>{pageResults.map(({ person, match }, index) => <article className="supporter-card" key={person.id}><div className="card-top"><div className="person-identity"><Avatar person={person} /><div><button className="person-name" onClick={() => setDetailId(person.id)}>{person.name}</button><p>{person.headline}</p></div></div>{selectedSkills.length > 0 && <div className={`match-score ${match.score >= 75 ? 'high' : ''}`} title={`スキル ${match.skillScore}点 + 意欲 ${match.motivationScore}点 + 推薦 ${match.recommendationScore}点`}><span>MATCH</span><strong>{match.score}<small>%</small></strong></div>}</div><div className="card-location"><MapPin size={13} />{person.location}<span>·</span><Clock3 size={13} />月{person.hoursPerMonth}時間ほど</div><div className="card-skills"><Tags skills={person.skills.slice(0, 5)} matched={selectedSkills} /></div><div className="motivation-line"><span className={`motivation-dot ${person.motivation}`} />{MOTIVATION_LABELS[person.motivation]}</div><p className="card-bio">{person.bio}</p><div className="card-foot"><span><BadgeCheck size={15} />{person.skills.reduce((sum, skill) => sum + skill.endorsers.length, 0) > 0 ? `${person.skills.filter(s => s.endorsers.length > 0).length}スキルに他者推薦` : '本人登録のスキル'}{index === 0 && currentPage === 1 && selectedSkills.length > 0 && match.score >= 75 && <span className="top-pick">おすすめ</span>}</span><button onClick={() => setDetailId(person.id)}>詳細を見る<ArrowRight size={16} /></button></div></article>)}</div> : <div className="empty-state"><Search size={32} /><h3>条件に合うサポーターが見つかりません</h3><p>スキルを減らすか、絞り込み条件を変更してみてください。</p><button className="button secondary" onClick={clearFilters}>検索条件をリセット</button></div>}
              <div className="results-footer"><span>{results.length ? `${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, results.length)} / ${results.length}人を表示` : '0人を表示'}{filtersCount > 0 && ` · ${filtersCount}件の条件`}</span><div className="pagination"><button aria-label="前のページ" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button>{Array.from({ length: pageCount }, (_, i) => <button className={currentPage === i + 1 ? 'active' : ''} aria-label={`${i + 1}ページ`} aria-current={currentPage === i + 1 ? 'page' : undefined} key={i} onClick={() => setPage(i + 1)}>{i + 1}</button>)}<button aria-label="次のページ" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button></div></div>
            </section>
          </div>
        </>}

        {screen === 'activities' && role === 'staff' && <div className="activity-list">{activities.map(activity => <article className="activity-card" key={activity.id}><div className="flex items-start justify-between gap-3"><span className={`status-badge ${activity.status === 'closed' ? 'closed' : ''}`}>{activity.status === 'recruiting' ? '募集中' : '募集終了'}</span><button className="text-button" onClick={() => setActivityEditor(activity)}>編集する</button></div><h2>{activity.title}</h2><p>{activity.description}</p><div className="activity-info"><span><CalendarDays size={16} />{dateLabel(activity.date)}</span><span><MapPin size={16} />{activity.location}</span><span><Users size={16} />募集 {activity.headcount}人</span></div><div className="flex flex-wrap gap-2">{activity.requiredSkills.map(skill => <span className="skill-tag matched" key={skill}>{skill}</span>)}</div><div className="activity-detail-grid"><div><small>募集内容</small><p>{activity.recruitment}</p></div><div><small>求める人物像</small><p>{activity.idealPerson || '指定なし'}</p></div><div><small>その他条件</small><p>{activity.conditions || '指定なし'}</p></div></div><button className="button primary" onClick={() => { chooseActivity(activity.id); navigate('search') }}><Search size={17} />この活動に合うサポーターを探す<ArrowRight size={17} /></button></article>)}{!activities.length && <div className="empty-state"><CalendarDays size={32} /><h3>最初の活動を登録しましょう</h3><button className="button primary" onClick={() => setActivityEditor('new')}>活動を登録</button></div>}</div>}

        {screen === 'profile' && role === 'supporter' && self && <><div className="profile-page"><ProfileContent person={self} supporters={supporters} />{pending.length > 0 && <div className="pending-callout"><BadgeCheck size={25} /><div><strong>{pending.length}件のスキル推薦が届いています</strong><p>仲間から見た、あなたの得意を確認しましょう。</p></div><button className="button secondary" onClick={() => navigate('recommendations')}>推薦を確認<ArrowRight size={16} /></button></div>}</div></>}

        {screen === 'recommendations' && role === 'supporter' && <div className="recommendation-page"><div className="section-heading"><h2>あなたに届いた推薦 <span>{pending.length}件の承認待ち</span></h2><button className="button secondary" onClick={() => navigate('search')}><Plus size={17} />仲間にスキルを推薦</button></div>{recommendations.filter(r => r.toId === selfId).map(rec => { const from = supporters.find(p => p.id === rec.fromId); return <article className="recommendation-card" key={rec.id}><div className="flex items-center gap-3">{from && <Avatar person={from} />}<div><strong>{from?.name ?? 'サポーター'}さんからの推薦</strong><small>{dateLabel(rec.createdAt)}</small></div><span className={`status-badge ${rec.status !== 'pending' ? 'closed' : ''}`}>{rec.status === 'pending' ? '承認待ち' : rec.status === 'approved' ? '承認済み' : '見送り'}</span></div><span className="skill-tag recommended"><BadgeCheck size={15} />{rec.skill}</span><p className="recommendation-message">{rec.message}</p>{rec.status === 'pending' && <div className="flex gap-2 justify-end"><button className="button secondary" disabled={!!busyId} onClick={() => reviewRecommendation(rec, false)}>今回は見送る</button><button className="button primary" disabled={!!busyId} onClick={() => reviewRecommendation(rec, true)}><Check size={17} />承認してスキルに追加</button></div>}</article> })}{!recommendations.some(r => r.toId === selfId) && <div className="empty-state"><BadgeCheck size={32} /><h3>まだ推薦は届いていません</h3><p>一緒に活動した仲間に、まずはスキルを推薦してみましょう。</p></div>}<h2 className="sent-heading">あなたが送った推薦</h2>{recommendations.filter(r => r.fromId === selfId).map(rec => <div className="sent-recommendation" key={rec.id}><span>{supporters.find(p => p.id === rec.toId)?.name}さんへ</span><span className="skill-tag">{rec.skill}</span><span className="muted">{rec.status === 'pending' ? '本人の承認待ち' : rec.status === 'approved' ? '承認済み' : '見送り'}</span></div>)}{!recommendations.some(r => r.fromId === selfId) && <p className="muted">送信した推薦はありません。</p>}</div>}
        <footer className="page-footer"><span>TEAM MIRAI <span className="footer-dot">/</span> SUPPORTER CONNECT</span><span>{supabase ? 'Supabase に接続中' : 'すべて架空のサンプルデータです · 変更はこのブラウザに保存されます'}</span></footer>
      </main>
    </div>

    {detail && <Modal title="サポーター詳細" wide onClose={() => setDetailId(null)}><ProfileContent person={detail} supporters={supporters} />{selectedSkills.length > 0 && <MatchBreakdown person={detail} skills={selectedSkills} />}<div className="modal-actions">{role === 'staff' ? <><button className="button secondary" disabled={!detail.slack} onClick={() => { setContact({ person: detail, channel: 'slack' }); setDetailId(null) }}><MessageSquare size={18} />Slackで連絡</button><button className="button primary" disabled={!detail.email} onClick={() => { setContact({ person: detail, channel: 'email' }); setDetailId(null) }}><Mail size={18} />メールで連絡</button></> : detail.id === selfId ? <button className="button primary" onClick={() => { setDetailId(null); setEditingProfile(true) }}>自分のプロフィールを編集</button> : <button className="button primary" onClick={() => { setRecommendTarget(detail); setDetailId(null) }}><BadgeCheck size={18} />この人にスキルを推薦</button>}</div></Modal>}
    {editingProfile && self && role === 'supporter' && <Modal title="プロフィール・スキルを編集" wide onClose={() => setEditingProfile(false)}><ProfileEditor profile={self} onSave={saveProfile} onCancel={() => setEditingProfile(false)} /></Modal>}
    {activityEditor && role === 'staff' && <Modal title={activityEditor === 'new' ? '新しい活動を登録' : '活動を編集'} wide onClose={() => setActivityEditor(null)}><ActivityEditor activity={activityEditor === 'new' ? undefined : activityEditor} onSave={saveActivity} onCancel={() => setActivityEditor(null)} /></Modal>}
    {recommendTarget && role === 'supporter' && <Modal title="仲間のスキルを推薦" onClose={() => setRecommendTarget(null)}><RecommendationForm person={recommendTarget} onSubmit={submitRecommendation} onCancel={() => setRecommendTarget(null)} /></Modal>}
    {contact && role === 'staff' && <Modal title={contact.channel === 'email' ? 'メールで連絡' : 'Slackで連絡'} wide onClose={() => setContact(null)}><ContactComposer person={contact.person} channel={contact.channel} activities={activities} initialActivityId={activityId} demo={!supabase} onNotify={setToast} /></Modal>}
    {showLogin && !supabase && <Modal title="デモアカウントを切り替え" onClose={() => setShowLogin(false)}><DemoLogin supporters={supporters} onLogin={(nextRole, nextId) => { setRole(nextRole); setSelfId(nextId); setScreen(nextRole === 'staff' ? 'search' : 'profile'); setShowLogin(false); setToast(`${nextRole === 'staff' ? '議員・スタッフ' : 'サポーター'}に切り替えました`) }} /><p className="demo-explanation">サンプル専用のロール切り替えです。認証情報の入力は不要です。</p></Modal>}
    {showHelp && <Modal title="みらいコネクトの使い方" onClose={() => setShowHelp(false)}><div className="help-content"><h3>活動から、仲間を探す</h3><p>活動を選ぶと必要なスキルが入ります。タグや活動条件で絞り込み、詳細から連絡文を作成できます。</p><h3>マッチ度の計算方法</h3><div className="formula"><span>スキル一致<strong>70点</strong></span><span>モチベーション<strong>20点</strong></span><span>他者推薦<strong>10点</strong></span></div><p>スキルは選択したタグの一致率、モチベーションは高20点・中12点・低5点、推薦は該当スキルへの承認済み推薦1名につき2点（最大10点）です。マッチ度は協力可能性の目安です。</p><h3>推薦は、本人の承認を経て反映</h3><p>サポーター役では他の人にスキルを推薦できます。本人の「スキルの推薦」から承認すると、プロフィールと検索に反映されます。</p>{!supabase && <div className="notice">サンプルモードでは、架空のデータとロール切り替えで各画面を試せます。メール・Slackの実送信は行いません。</div>}</div></Modal>}
    {toast && <div className="toast" role="status"><Check size={18} />{toast}<button onClick={() => setToast('')} aria-label="通知を閉じる"><X size={16} /></button></div>}
  </div>
}

function ProfileContent({ person, supporters }: { person: Supporter; supporters: Supporter[] }) {
  return <div className="profile-content"><div className="profile-banner"><Avatar person={person} large /><div><h2>{person.name}</h2><p>{person.headline}</p><span><MapPin size={14} />{person.location}</span></div><span className={`motivation-badge ${person.motivation}`}><Sparkles size={14} />{MOTIVATION_LABELS[person.motivation]}</span></div><div className="profile-body"><div className="profile-section"><h3><UserRound size={17} />自己紹介・活動への想い</h3><p className="whitespace-pre-wrap">{person.bio || 'まだ自己紹介が登録されていません。'}</p></div><div className="profile-section"><h3><BriefcaseBusiness size={17} />スキル</h3><p className="profile-section-label">本人登録</p><Tags skills={person.skills.filter(s => s.source === 'self')} /><p className="profile-section-label recommended-label"><BadgeCheck size={14} />他者からの推薦で追加</p>{person.skills.some(s => s.source === 'recommended') ? <Tags skills={person.skills.filter(s => s.source === 'recommended')} /> : <p className="muted">まだ推薦スキルはありません</p>}{person.skills.some(s => s.endorsers.length > 0) && <div className="endorsements-list">{person.skills.filter(s => s.endorsers.length > 0).map(skill => <div key={skill.name}><BadgeCheck size={14} /><span><strong>{skill.name}</strong>：{skill.endorsers.map(id => supporters.find(p => p.id === id)?.name ?? 'サポーター').join('、')}から推薦</span></div>)}</div>}</div><div className="profile-two-columns"><div className="profile-section"><h3><HeartHandshake size={17} />興味のある活動</h3><div className="flex flex-wrap gap-2">{person.interests.map(s => <span className="skill-tag" key={s}>{s}</span>)}</div></div><div className="profile-section"><h3><Clock3 size={17} />活動できる時間・条件</h3><strong className="hours-display">月 {person.hoursPerMonth} 時間ほど</strong><div className="flex flex-wrap gap-2 mt-3">{person.availability.map(s => <span className="skill-tag" key={s}>{s}</span>)}</div></div></div><div className="profile-section"><h3><CalendarDays size={17} />経験・活動実績<span className="muted">{person.experience.length}件</span></h3>{person.experience.length ? <div className="experience-timeline">{person.experience.map((experience, i) => <div key={i}><span className="timeline-marker" /><small>{experience.date}</small><h4>{experience.title}</h4><p>{experience.description}</p></div>)}</div> : <p className="muted">これからの活動をお待ちしています。</p>}</div></div></div>
}
function MatchBreakdown({ person, skills }: { person: Supporter; skills: string[] }) {
  const match = matchSupporter(person, skills)
  return <div className="match-breakdown"><div><Sparkles size={18} /><strong>この検索条件とのマッチ度</strong><b>{match.score}%</b></div><div className="score-bars">{[['スキル一致', match.skillScore, 70], ['モチベーション', match.motivationScore, 20], ['他者推薦', match.recommendationScore, 10]].map(([label, score, max]) => <div key={label}><span>{label}</span><div><i style={{ width: `${Number(score) / Number(max) * 100}%` }} /></div><strong>{score}<small>/{max}</small></strong></div>)}</div>{match.missingSkills.length > 0 && <p>未登録のスキル：{match.missingSkills.join('、')}</p>}</div>
}
function RecommendationForm({ person, onSubmit, onCancel }: { person: Supporter; onSubmit: (skill: string, message: string) => Promise<void>; onCancel: () => void }) {
  const [skill, setSkill] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit(e: FormEvent) { e.preventDefault(); if (busy) return; if (!skill.trim() || !message.trim()) { setError('スキルと推薦の理由を入力してください。'); return }; setBusy(true); setError(''); try { await onSubmit(skill.trim(), message.trim()) } catch (e) { setError(e instanceof Error ? e.message : '推薦できませんでした') } finally { setBusy(false) } }
  return <form className="editor-form" onSubmit={submit}><div className="flex items-center gap-3"><Avatar person={person} /><strong>{person.name}さんにスキルを推薦</strong></div><label className="form-field">推薦するスキル<input className="input" required maxLength={40} list="recommend-skills" value={skill} placeholder="例：動画編集" onChange={e => setSkill(e.target.value)} /><datalist id="recommend-skills">{SKILL_OPTIONS.map(s => <option key={s} value={s} />)}</datalist></label><label className="form-field">推薦の理由<textarea className="textarea" rows={4} required maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="一緒に活動した場面や、その人の得意が伝わるエピソードなど" /></label><p className="muted">本人が承認すると、プロフィールに推薦スキルとして追加されます。</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>キャンセル</button><button type="submit" className="button primary" disabled={busy}><BadgeCheck size={17} />{busy ? '送信中…' : 'スキルを推薦する'}</button></div></form>
}
function ContactComposer({ person, channel, activities, initialActivityId, demo, onNotify }: { person: Supporter; channel: 'email' | 'slack'; activities: Activity[]; initialActivityId: string; demo: boolean; onNotify: (s: string) => void }) {
  const [activityId, setActivityId] = useState(initialActivityId), [subject, setSubject] = useState(''), [body, setBody] = useState(''), [copyError, setCopyError] = useState('')
  const [dirty, setDirty] = useState(false)
  function template(id: string) { const activity = activities.find(a => a.id === id); setSubject(activity ? `【チームみらい】「${activity.title}」ご協力のお願い` : '【チームみらい】活動へのご協力のお願い'); setBody(`${person.name}さん\n\nこんにちは。チームみらいのスタッフです。\n${activity ? `「${activity.title}」で、ぜひお力をお借りしたくご連絡しました。\n\n${activity.description}\n\n日時：${dateLabel(activity.date)} ${new Date(activity.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}\n場所：${activity.location}\n募集内容：${activity.recruitment}\n必要なスキル：${activity.requiredSkills.join('、')}\n` : 'プロフィールを拝見し、活動へのご協力についてご相談したくご連絡しました。\n'}\nご興味がありましたら、ご都合や協力できる内容をお知らせいただけますと幸いです。\nどうぞよろしくお願いします。`); setDirty(false) }
  useEffect(() => { template(initialActivityId) }, [])
  async function copy() { try { await navigator.clipboard.writeText(channel === 'email' ? `件名：${subject}\n\n${body}` : body); onNotify('連絡文をコピーしました'); setCopyError('') } catch { setCopyError('コピーできませんでした。連絡文を選択して手動でコピーしてください。') } }
  return <div className="editor-form"><div className="contact-recipient"><Avatar person={person} /><div><strong>{person.name}</strong><small>{channel === 'email' ? person.email : person.slack}</small></div><span className="status-badge closed">{demo ? 'サンプル宛先' : '宛先'}</span></div><label className="form-field">活動情報を差し込む<select className="input" value={activityId} onChange={e => setActivityId(e.target.value)}><option value="">活動を指定しない</option>{activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label><button className="button secondary self-start" onClick={() => { if (!dirty || window.confirm('編集中の連絡文を、選択した活動のテンプレートに置き換えますか？')) template(activityId) }}><Sparkles size={16} />テンプレートを反映</button>{channel === 'email' && <label className="form-field">件名<input className="input" value={subject} onChange={e => { setSubject(e.target.value); setDirty(true) }} /></label>}<label className="form-field">連絡文<textarea className="textarea contact-body" rows={12} value={body} onChange={e => { setBody(e.target.value); setDirty(true) }} /></label>{copyError && <p className="form-error" role="alert">{copyError}</p>}<div className="notice">{demo ? 'サンプルモードです。実際には送信されません。連絡文をコピーして内容をご確認ください。' : channel === 'email' ? 'メールアプリを開いて内容を確認し、送信してください。' : '連絡文をコピーし、Slackの宛先で内容を確認して送信してください。'}</div><div className="form-actions"><button className="button primary" onClick={copy}><Copy size={17} />連絡文をコピー</button>{!demo && channel === 'email' && <a className="button secondary" href={`mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}><ExternalLink size={17} />メールアプリを開く</a>}{!demo && channel === 'slack' && <a className="button secondary" href="https://app.slack.com/" target="_blank" rel="noreferrer"><ExternalLink size={17} />Slackを開く</a>}</div></div>
}
function DemoLogin({ supporters, onLogin }: { supporters: Supporter[]; onLogin: (role: Role, id: string) => void }) {
  const [role, setRole] = useState<Role>('staff'), [id, setId] = useState(supporters[0]?.id ?? '')
  return <div className="demo-login"><div className="role-options"><button className={role === 'staff' ? 'selected' : ''} onClick={() => setRole('staff')}><BriefcaseBusiness size={26} /><strong>議員・スタッフ</strong><span>仲間を探す・活動を登録</span>{role === 'staff' && <Check size={17} />}</button><button className={role === 'supporter' ? 'selected' : ''} onClick={() => setRole('supporter')}><UserRound size={26} /><strong>サポーター</strong><span>スキルを登録・仲間を推薦</span>{role === 'supporter' && <Check size={17} />}</button></div>{role === 'supporter' && <label className="form-field">体験するサポーター<select className="input" value={id} onChange={e => setId(e.target.value)}>{supporters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<button className="button primary w-full" onClick={() => onLogin(role, id)}>{role === 'staff' ? '議員・スタッフ' : 'サポーター'}としてはじめる<ArrowRight size={17} /></button></div>
}
function LoginScreen({ onLogin, supporters, error }: { onLogin: (role: Role, id: string) => Promise<void>; supporters: Supporter[]; error: string }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState(''), [signUp, setSignUp] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(error)
  async function submit(e: FormEvent) { e.preventDefault(); if (!supabase || busy) return; setBusy(true); setMessage(''); try { if (signUp) { const { error: authError, data } = await supabase.auth.signUp({ email, password, options: { data: { name } } }); if (authError) throw authError; if (!data.session) { setMessage('確認メールを送信しました。メール内のリンクで認証後、ログインしてください。'); return } } else { const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) throw authError }; await onLogin('supporter', '') } catch (e) { setMessage(e instanceof Error ? e.message : 'ログインできませんでした') } finally { setBusy(false) } }
  return <main className="login-page"><div className="login-brand"><img src="/favicon.svg" width="54" height="54" alt="" /><strong>みらいコネクト</strong><span>TEAM MIRAI SUPPORTERS</span></div><div className="login-card"><div className="eyebrow">WELCOME TO THE TEAM</div><h1>{supabase ? signUp ? 'サポーター登録' : 'おかえりなさい' : 'あなたの「できる」を、次の活動へ。'}</h1><p>{supabase ? '登録したメールアドレスでログインしてください。' : 'サンプルアカウントで、スキルと活動をつなぐ体験を。'}</p>{supabase ? <form className="editor-form" onSubmit={submit}>{signUp && <label className="form-field">お名前<input className="input" required maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="name" /></label>}<label className="form-field">メールアドレス<input className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label><label className="form-field">パスワード<input className="input" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} autoComplete={signUp ? 'new-password' : 'current-password'} /></label>{message && <p role="status" className="notice">{message}</p>}<button className="button primary" disabled={busy}>{busy ? '処理中…' : signUp ? 'サポーターとして登録' : 'ログイン'}</button><button type="button" className="text-button" onClick={() => setSignUp(!signUp)}>{signUp ? 'ログインに戻る' : '新しくサポーター登録する'}</button></form> : <DemoLogin supporters={supporters} onLogin={onLogin} />}</div><p className="login-footnote">{supabase ? 'チームみらい サポーターワークスペース' : '実在の人物・連絡先を含まないサンプルです。'}</p></main>
}
