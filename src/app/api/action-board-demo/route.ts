import { boardActor, boardRepository } from '../../../features/action-board-demo/server'
import { executeBoardAction, projectBoard } from '../../../features/action-board-demo/model'
import { handleRequest, json, requestBody } from '../../../features/talent/server/http'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export async function GET(request:Request) {return handleRequest(request,false,async()=>{const store=await boardRepository.read();return json(projectBoard(store,boardActor(request,store)))})}
export async function POST(request:Request) {return handleRequest(request,true,async()=>{const input=await requestBody(request);return json(await boardRepository.update(store=>executeBoardAction(store,boardActor(request,store),input)))})}
