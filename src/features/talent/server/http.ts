import 'server-only'
import { randomBytes } from 'node:crypto'
import { talentRepository } from '../repositories/json-talent-repository.ts'
import { demoAccounts } from '../loaders/bootstrap.ts'
import { TalentError } from './errors.ts'
import { assertDemoRequest, signDemoSession, verifyDemoSession } from './session-core.ts'
import type { Actor, TalentStore } from '../types.ts'

const globalState = globalThis as typeof globalThis & { talentV02Secret?: string }
const secret = () => process.env.TALENT_DEMO_COOKIE_SECRET || (globalState.talentV02Secret ??= randomBytes(32).toString('hex'))
const cookieName = 'talent-v02-demo'
export const repository = talentRepository

export function actorForRequest(request: Request, store: TalentStore): Actor {
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)
  const id = cookie ? verifyDemoSession(cookie,secret()) : 'staff-demo'
  const actor = demoAccounts(store).find(item => item.id === id)
  if (!actor) throw new TalentError('デモアカウントが見つかりません。',401)
  return actor
}
export function sessionCookie(actorId: string): string {
  return `${cookieName}=${signDemoSession(actorId,secret())}; Path=/api/talent; HttpOnly; SameSite=Strict; Max-Age=86400`
}
export async function requestBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new TalentError('JSON形式で送信してください。',415)
  if (Number(request.headers.get('content-length') || 0) > 100000) throw new TalentError('入力が大きすぎます。',413)
  const reader = request.body?.getReader()
  if (!reader) throw new TalentError('入力がありません。')
  let size = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.byteLength
    if (size > 100000) {await reader.cancel();throw new TalentError('入力が大きすぎます。',413)}
    chunks.push(part.value)
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch {throw new TalentError('JSON形式の入力を確認してください。')}
}
export function json(data: unknown, status = 200, extraHeaders: Record<string,string> = {}) {
  return Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff',...extraHeaders}})
}
export async function handleRequest(request: Request, mutation: boolean, run: () => Promise<Response>): Promise<Response> {
  try {assertDemoRequest(request,mutation);return await run()}
  catch (error) {
    if (error instanceof TalentError) return json({error:error.message},error.status)
    // Never include private store contents or request bodies in logs or errors.
    console.error('[talent-v02] request failed',error instanceof Error ? error.name : 'UnknownError')
    return json({error:'処理に失敗しました。時間をおいて再度お試しください。'},500)
  }
}
