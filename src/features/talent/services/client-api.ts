import type { Actor, BootstrapData, SearchResponse, TeamComposition } from '../types'
import { createBrowserDemoApi } from './browser-demo-store'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...options?.headers } })
  const result: unknown = await response.json()
  if (!response.ok) {
    const message = result && typeof result === 'object' && 'error' in result && typeof result.error === 'string' ? result.error : '処理できませんでした。もう一度お試しください。'
    throw new Error(message)
  }
  return result as T
}
export function createTalentApi(base: string) {
  if (process.env.NEXT_PUBLIC_SHARED_DEMO === 'true') return createBrowserDemoApi(base === '/api/action-board-demo' ? 'board' : 'talent')
  return {
  load: () => request<BootstrapData>(base),
  switchAccount: (actorId: Actor['id']) => request<{ ok: true }>(`${base}/session`, { method: 'POST', body: JSON.stringify({ actorId }) }),
  action: (payload: Record<string, unknown>) => request<{ ok: true }>(base, { method: 'POST', body: JSON.stringify(payload) }),
  search: (query: string) => request<SearchResponse>(base, { method: 'POST', body: JSON.stringify({ action: 'search', query }) }),
  buildTeam: (requestText: string) => request<TeamComposition>(base, { method: 'POST', body: JSON.stringify({ action: 'team.build', request: requestText }) }),
  }
}
export const talentApi = createTalentApi('/api/talent')
export type TalentClient = ReturnType<typeof createTalentApi>
