import { createBoardSeed, executeBoardAction, projectBoard, type BoardBootstrap, type BoardStore } from '../../action-board-demo/model.ts'
import { executeTalentAction } from '../actions/execute-action.ts'
import { demoAccounts, projectBootstrap } from '../loaders/bootstrap.ts'
import { createSeedStore } from '../mocks/seed.ts'
import type { Actor, BootstrapData, SearchResponse, TalentStore, TeamComposition } from '../types.ts'

type DemoKind = 'board' | 'talent'
type DemoStore = BoardStore | TalentStore

const dataKey = (kind: DemoKind) => `my-talent-share-${kind}-v1`
const actorKey = (kind: DemoKind) => `my-talent-share-${kind}-actor-v1`

function loadStore(kind: DemoKind): DemoStore {
  const saved = window.localStorage.getItem(dataKey(kind))
  if (saved) {
    try {
      const store = JSON.parse(saved) as DemoStore
      if (store.version === 2 && Array.isArray(store.profiles) && (kind !== 'board' || ('boardVersion' in store && store.boardVersion === 1))) return store
    } catch { /* A damaged demo snapshot can be replaced with fictional seed data. */ }
  }
  const store = kind === 'board' ? createBoardSeed() : createSeedStore()
  window.localStorage.setItem(dataKey(kind), JSON.stringify(store))
  return store
}

function actorFor(kind: DemoKind, store: DemoStore): Actor {
  const accounts = demoAccounts(store)
  const selected = window.localStorage.getItem(actorKey(kind))
  return accounts.find(actor => actor.id === selected) ?? accounts.find(actor => actor.id === (kind === 'board' ? 's1' : 'staff-demo'))!
}

function saveStore(kind: DemoKind, store: DemoStore) {
  window.localStorage.setItem(dataKey(kind), JSON.stringify(store))
}

function execute(kind: DemoKind, store: DemoStore, actor: Actor, input: unknown): unknown {
  return kind === 'board' ? executeBoardAction(store as BoardStore, actor, input) : executeTalentAction(store, actor, input)
}

export function loadBrowserDemo(kind: 'board'): BoardBootstrap
export function loadBrowserDemo(kind: 'talent'): BootstrapData
export function loadBrowserDemo(kind: DemoKind): BoardBootstrap | BootstrapData {
  const store = loadStore(kind)
  const actor = actorFor(kind, store)
  return kind === 'board' ? projectBoard(store as BoardStore, actor) : projectBootstrap(store, actor)
}

export function createBrowserDemoApi(kind: DemoKind) {
  return {
    load: async (): Promise<BootstrapData> => kind === 'board' ? loadBrowserDemo('board') : loadBrowserDemo('talent'),
    switchAccount: async (actorId: Actor['id']): Promise<{ok:true}> => {
      if (!demoAccounts(loadStore(kind)).some(actor => actor.id === actorId)) throw new Error('デモアカウントが見つかりません。')
      window.localStorage.setItem(actorKey(kind), actorId)
      return {ok:true}
    },
    action: async (payload: Record<string, unknown>): Promise<{ok:true}> => {
      const store = loadStore(kind)
      const result = execute(kind, store, actorFor(kind, store), payload)
      saveStore(kind, store)
      return result as {ok:true}
    },
    search: async (query: string): Promise<SearchResponse> => {
      const store = loadStore(kind)
      return execute(kind, store, actorFor(kind, store), {action:'search',query}) as SearchResponse
    },
    buildTeam: async (request: string): Promise<TeamComposition> => {
      const store = loadStore(kind)
      const result = execute(kind, store, actorFor(kind, store), {action:'team.build',request}) as TeamComposition
      saveStore(kind, store)
      return result
    },
  }
}
