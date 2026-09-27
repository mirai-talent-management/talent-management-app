import { createTalentApi } from '../talent/services/client-api'
import type { BoardBootstrap } from './model'

export const boardApi = {
  ...createTalentApi('/api/action-board-demo'),
  load: async ():Promise<BoardBootstrap> => {
    const response = await fetch('/api/action-board-demo',{cache:'no-store'})
    if (!response.ok) throw new Error('統合デモを読み込めませんでした。デモアカウントを選び直してください。')
    return response.json()
  },
}
