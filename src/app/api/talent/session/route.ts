import { demoAccounts } from '../../../../features/talent/loaders/bootstrap'
import { handleRequest, json, repository, requestBody, sessionCookie } from '../../../../features/talent/server/http'
import { object, onlyKeys, text } from '../../../../features/talent/server/validation'
import { TalentError } from '../../../../features/talent/server/errors'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  return handleRequest(request,true,async () => {
    const body = object(await requestBody(request));onlyKeys(body,['actorId'])
    const actorId = text(body.actorId,'デモアカウント',100)
    if (!demoAccounts(await repository.read()).some(actor => actor.id === actorId)) throw new TalentError('デモアカウントが見つかりません。',404)
    return json({ok:true},200,{'Set-Cookie':sessionCookie(actorId)})
  })
}
