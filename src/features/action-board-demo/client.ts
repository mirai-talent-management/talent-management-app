import { createTalentApi } from '../talent/services/client-api'
import type { BoardBootstrap } from './model'
import { loadBrowserDemo } from '../talent/services/browser-demo-store'

export const boardApi = {
  ...createTalentApi('/api/action-board-demo'),
  load: async ():Promise<BoardBootstrap> => {
    if (process.env.NEXT_PUBLIC_SHARED_DEMO === 'true') return loadBrowserDemo('board')
    const response = await fetch('/api/action-board-demo',{cache:'no-store'})
    if (!response.ok) throw new Error('統合デモを読み込めませんでした。デモアカウントを選び直してください。')
    return response.json()
  },
}
