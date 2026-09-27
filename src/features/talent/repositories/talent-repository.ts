import type { TalentStore } from '../types.ts'
export interface TalentRepository {
  read(): Promise<TalentStore>
  update<T>(operation: (store: TalentStore) => T | Promise<T>): Promise<T>
}
