import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ActionBoardDemo from '../../../features/action-board-demo/board-app'

export const metadata: Metadata = {title:'Action Board × Talent | 非公式ローカル統合デモ',robots:{index:false,follow:false}}
export default async function Page({params}:{params:Promise<{section?:string[]}>}) {
  const {section=[]}=await params
  const allowed=['home','missions','history','account','settings','talent','profile','suggestions','interview','recommendations','supporters','team','activities','about']
  if(section.length>1 || (section.length===1 && !allowed.includes(section[0]))) notFound()
  return <ActionBoardDemo initialView={section[0] || 'home'} />
}
