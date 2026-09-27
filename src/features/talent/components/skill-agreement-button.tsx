'use client'
import { useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import type { AgreementSummary } from '../types'

export function SkillAgreementButton({skillId,summary,onToggle,compact=false}:{skillId:string;summary:AgreementSummary|undefined;onToggle?:(skillId:string)=>Promise<void>;compact?:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  if(!summary)return null
  const enabled=summary.canAgree&&!!onToggle
  const label=summary.agreed?'いいねを取り消す':'いいねを送る'
  return <span className={`t-agreement-wrap ${compact?'is-compact':''}`}>
    <button type="button" className={`t-agreement ${summary.agreed?'is-agreed':''}`} aria-label={`${label}。現在${summary.count}件`} aria-pressed={summary.agreed} disabled={!enabled||busy} title={enabled?'スキルへの共感や、助けられた感謝を伝えます。もう一度押すと取り消せます。':'本人は自分のスキルにいいねできません。'} onClick={async()=>{if(!onToggle)return;setBusy(true);setError('');try{await onToggle(skillId)}catch(cause){setError(cause instanceof Error?cause.message:'保存できませんでした')}finally{setBusy(false)}}}><ThumbsUp size={compact?13:15} fill={summary.agreed?'currentColor':'none'} aria-hidden="true"/><b aria-hidden="true">{summary.count}</b></button>
    {error&&<small className="t-agreement-error" role="alert">{error}</small>}
  </span>
}
