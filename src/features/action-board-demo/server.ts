import 'server-only'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { randomBytes, randomUUID } from 'node:crypto'
import path from 'node:path'
import { createBoardSeed, type BoardStore } from './model.ts'
import { prepareAgreementStore } from '../talent/services/skill-agreement-service.ts'
import { preparePolicyFields } from '../talent/server/policy-fields.ts'
import { demoAccounts } from '../talent/loaders/bootstrap.ts'
import { signDemoSession, verifyDemoSession } from '../talent/server/session-core.ts'
import { TalentError } from '../talent/server/errors.ts'

const state = globalThis as typeof globalThis & {boardDemoQueue?:Promise<unknown>;boardDemoSecret?:string}
const secret = () => state.boardDemoSecret ??= randomBytes(32).toString('hex')
const cookieName = 'action-board-local-demo'
const file = path.join(process.cwd(),'.local','action-board-demo.json')
async function persist(store: BoardStore) {
  await mkdir(path.dirname(file),{recursive:true,mode:0o700})
  const temp = `${file}.${randomUUID()}.tmp`
  await writeFile(temp,JSON.stringify(store,null,2),{mode:0o600}); await rename(temp,file)
}
async function load(): Promise<BoardStore> {
  try {
    const store: BoardStore = JSON.parse(await readFile(file,'utf8'))
    if (store.version !== 2 || store.boardVersion !== 1 || !Array.isArray(store.boardAchievements)) throw new Error('統合デモの保存形式が不正です。')
    return preparePolicyFields(prepareAgreementStore(store))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const store = createBoardSeed(); await persist(store); return store
  }
}
function serial<T>(run:()=>Promise<T>):Promise<T> {
  const next = (state.boardDemoQueue ?? Promise.resolve()).then(run,run)
  state.boardDemoQueue = next.catch(()=>undefined); return next
}
export const boardRepository = {
  read:()=>serial(load),
  update:<T>(run:(store:BoardStore)=>T|Promise<T>)=>serial(async()=>{const store = await load();const result = await run(store);await persist(store);return result}),
}
export function boardActor(request:Request,store:BoardStore) {
  const token = request.headers.get('cookie')?.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)
  const id = token ? verifyDemoSession(token,secret()) : 's1'
  const actor = demoAccounts(store).find(item=>item.id===id)
  if (!actor) throw new TalentError('デモアカウントを選び直してください。',401)
  return actor
}
export function boardCookie(id:string) {return `${cookieName}=${signDemoSession(id,secret())}; Path=/api/action-board-demo; HttpOnly; SameSite=Strict; Max-Age=86400`}
