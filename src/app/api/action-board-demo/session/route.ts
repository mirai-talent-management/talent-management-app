import { boardCookie, boardRepository } from '../../../../features/action-board-demo/server'
import { demoAccounts } from '../../../../features/talent/loaders/bootstrap'
import { handleRequest, json, requestBody } from '../../../../features/talent/server/http'
import { object, onlyKeys, text } from '../../../../features/talent/server/validation'
import { TalentError } from '../../../../features/talent/server/errors'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST(request:Request) {return handleRequest(request,true,async()=>{
  const body=object(await requestBody(request));onlyKeys(body,['actorId']);const id=text(body.actorId,'デモアカウント',100)
  if(!demoAccounts(await boardRepository.read()).some(actor=>actor.id===id)) throw new TalentError('デモアカウントが見つかりません。',404)
  return json({ok:true},200,{'Set-Cookie':boardCookie(id)})
})}
