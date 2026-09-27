import 'server-only'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { createSeedStore, prepareCasualDemoSkills } from '../mocks/seed.ts'
import { prepareAgreementStore } from '../services/skill-agreement-service.ts'
import { preparePolicyFields } from '../server/policy-fields.ts'
import type { TalentStore } from '../types.ts'
import type { TalentRepository } from './talent-repository.ts'

const globals = globalThis as typeof globalThis & { talentV02Queue?: Promise<unknown> }
const file = path.join(process.cwd(),'.local','talent-v02.json')

async function persist(store: TalentStore) {
  await mkdir(path.dirname(file),{recursive:true,mode:0o700})
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary,JSON.stringify(store,null,2),{mode:0o600})
  await rename(temporary,file)
}
async function load(): Promise<TalentStore> {
  try {
    const store: TalentStore = JSON.parse(await readFile(file,'utf8'))
    if (store.version !== 2 || !['profiles','activities','evidence','suggestions','recommendations','interviews','pairingPreferences','teams'].every(key => Array.isArray(store[key as keyof TalentStore]))) throw new Error('デモデータの形式を確認してください。自動初期化はしていません。')
    const needsCasualUpgrade = (store.demoSkillRevision ?? 0) < 1
    const prepared = prepareCasualDemoSkills(preparePolicyFields(prepareAgreementStore(store)))
    if (needsCasualUpgrade) await persist(prepared)
    return prepared
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    const store = createSeedStore()
    await persist(store)
    return store
  }
}
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const task = (globals.talentV02Queue ?? Promise.resolve()).then(operation,operation)
  globals.talentV02Queue = task.catch(() => undefined)
  return task
}
export const talentRepository: TalentRepository = {
  read: () => serialized(async () => structuredClone(await load())),
  update: operation => serialized(async () => {
    const store = await load()
    const result = await operation(store)
    await persist(store)
    return structuredClone(result)
  }),
}
