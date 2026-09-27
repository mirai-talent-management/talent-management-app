'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { BookOpen, Camera, Code2, Headphones, HeartHandshake, X } from 'lucide-react'
import { SOURCE_LABELS, type SkillSource, type TalentProfile } from '../types'

export function TalentAvatar({ profile, large = false }: { profile: TalentProfile; large?: boolean }) {
  const names = profile.talents.map(skill => skill.normalizedName).join(' ')
  const accessories = [
    { match: /撮影|写真|カメラ/, Icon: Camera, label: '撮影' },
    { match: /音響|マイク|音楽/, Icon: Headphones, label: '音響' },
    { match: /プログラ|エンジニア|Web|AI/, Icon: Code2, label: 'テクノロジー' },
    { match: /政策|リサーチ|調査/, Icon: BookOpen, label: 'リサーチ' },
    { match: /フォロー|調整|コミュニケ|子供|ハガシ/, Icon: HeartHandshake, label: 'サポート' },
  ].filter(item => item.match.test(names)).slice(0, 2)
  return <span className={`t-avatar ${large ? 't-avatar-large' : ''}`} style={{ background: `${profile.color}20`, color: profile.color }} aria-label={`${profile.name}のスキルアバター`}><span>{profile.name.replace(/\s/g, '').slice(0, 1)}</span><span className="t-avatar-tools">{accessories.map(({ Icon, label }) => <span key={label} title={`${label}スキル`}><Icon size={large ? 17 : 12} /></span>)}</span></span>
}
export function SourceBadge({ source }: { source: SkillSource }) { return <span className={`t-source t-source-${source}`}>{SOURCE_LABELS[source]}</span> }
export function completeness(profile: TalentProfile): { score: number; missing: string[] } {
  const items: [string, boolean][] = [
    ['自己紹介', !!profile.bio.trim()], ['スキル', profile.talents.length > 0], ['仕事・専門の経験', !!profile.workExperience.trim()],
    ['プライベートの経験', !!profile.personalExperience.trim()], ['活動経験', !!(profile.electionExperience || profile.communityExperience).trim()],
    ['活動可能条件', profile.availabilityDetails.regions.length > 0 && profile.availabilityDetails.weekdays.length > 0 && profile.availabilityDetails.timeSlots.length > 0],
    ['活動意欲', profile.participation.length > 0], ['興味・関心', profile.interests.length + profile.policyInterests.length > 0],
  ]
  return { score: Math.round(items.filter(([, complete]) => complete).length / items.length * 100), missing: items.filter(([, complete]) => !complete).map(([name]) => name) }
}
export function TalentModal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const element = useRef<HTMLDivElement>(null), close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; element.current?.focus()
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') close.current()
      if (event.key !== 'Tab') return
      const items = element.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')
      if (!items?.length) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === element.current)) { event.preventDefault(); items[items.length - 1].focus() }
      if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = oldOverflow; previous?.focus() }
  }, [])
  return <div className="t-modal-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose() }}><div className={`t-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={element}><div className="t-modal-heading"><h2>{title}</h2><button className="t-icon-button" aria-label="閉じる" onClick={onClose}><X size={21} /></button></div>{children}</div></div>
}
