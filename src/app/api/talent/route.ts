import { projectBootstrap } from '../../../features/talent/loaders/bootstrap'
import { executeTalentAction } from '../../../features/talent/actions/execute-action'
import { actorForRequest, handleRequest, json, repository, requestBody } from '../../../features/talent/server/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  return handleRequest(request,false,async () => {const store = await repository.read();return json(projectBootstrap(store,actorForRequest(request,store)))})
}
export async function POST(request: Request) {
  return handleRequest(request,true,async () => {
    const body = await requestBody(request)
    const result = await repository.update(store => executeTalentAction(store,actorForRequest(request,store),body))
    return json(result)
  })
}
