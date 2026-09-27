'use client'
import { useState } from 'react'
import type { AgreementSummary } from '../types'

export function SkillAgreementButton({skillId,summary,onToggle,compact=false}:{skillId:string;summary:AgreementSummary|undefined;onToggle?:(skillId:string)=>Promise<void>;compact?:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  if(!summary)return null
  const enabled=summary.canAgree&&!!onToggle
  return <span className={`t-agreement-wrap ${compact?'is-compact':''}`}>
    <button type="button" className={`t-agreement ${summary.agreed?'is-agreed':''}`} aria-pressed={summary.agreed} disabled={!enabled||busy} title={enabled?'ほかの人の推薦に同意します。もう一度押すと取り消せます。':'推薦された本人と元の推薦者は押せません。'} onClick={async()=>{if(!onToggle)return;setBusy(true);setError('');try{await onToggle(skillId)}catch(cause){setError(cause instanceof Error?cause.message:'保存できませんでした')}finally{setBusy(false)}}}><span aria-hidden="true">😊</span>{compact?'そう思う':`そう思う！`}<b>{summary.count}</b><span className="sr-only">人が同意</span></button>
    {error&&<small className="t-agreement-error" role="alert">{error}</small>}
  </span>
}
