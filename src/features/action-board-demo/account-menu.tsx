'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type MenuItem = { label: string; view?: string }

const supporterItems: MenuItem[][] = [
  [
    { label: 'ホーム', view: 'home' },
    { label: 'マイページ', view: 'account' },
    { label: 'マイタレント', view: 'talent' },
    { label: 'ポスティングマップ' },
    { label: 'ポスター掲示板マップ' },
    { label: '私有地ポスターマップ' },
    { label: 'アクションボードとは？', view: 'about' },
  ],
  [{ label: 'アカウント', view: 'settings' }, { label: 'お知らせ' }],
  [{ label: 'ログアウト' }],
]

const staffItems: MenuItem[][] = [
  [
    { label: 'ホーム', view: 'home' },
    { label: '人材を探す', view: 'supporters' },
    { label: 'チームをつくる', view: 'team' },
    { label: '活動管理', view: 'activities' },
    { label: 'アクションボードとは？', view: 'about' },
  ],
  [{ label: 'お知らせ' }],
  [{ label: 'ログアウト' }],
]

export function AccountMenu({ name, staff, onNavigate }: { name: string; staff: boolean; onNavigate: (view: string) => void }) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="ab-account-menu" ref={container}>
    <button className="ab-account-trigger" type="button" aria-label="ユーザーメニューを開く" aria-expanded={open} aria-controls="ab-account-dropdown" onClick={() => setOpen(value => !value)}>
      <span className="ab-account-avatar" aria-hidden="true">{staff ? '事' : name.slice(0, 1)}</span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <div className="ab-account-dropdown" id="ab-account-dropdown" aria-label="アカウントメニュー">
      <div className="ab-account-dropdown-heading">{name}<small>統合デモのアカウント</small></div>
      {(staff ? staffItems : supporterItems).map((group, index) => <div className="ab-account-menu-group" key={index}>
        {group.map(item => <button key={item.label} type="button" disabled={!item.view} title={item.view ? undefined : 'このメニューはデモでは未接続です'} onClick={() => {
          if (!item.view) return
          setOpen(false)
          onNavigate(item.view)
        }}>{item.label}{!item.view && <small>デモでは未接続</small>}</button>)}
      </div>)}
    </div>}
  </div>
}
