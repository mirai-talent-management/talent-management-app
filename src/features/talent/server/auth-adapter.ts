import type { Actor } from '../types.ts'
import { TalentError } from './errors.ts'

/** Integration port for ActionBoard. The v0.2 demo does not instantiate this adapter. */
export interface ActionBoardIdentityPort {
  /** Must validate the token via auth.getUser(), never decode unverified JWT claims. */
  getVerifiedAuthUser(accessToken: string): Promise<{id:string} | null>
  /** Read public_user_profiles by its auth.users identity, from a trusted server client. */
  getPublicUserProfile(authUserId: string): Promise<{authUserId:string;name:string;role:'staff'|'supporter'} | null>
}
export interface IdentityAdapter { resolveActor(accessToken: string): Promise<Actor> }
export class ActionBoardIdentityAdapter implements IdentityAdapter {
  private readonly identity: ActionBoardIdentityPort
  constructor(identity: ActionBoardIdentityPort) { this.identity = identity }
  async resolveActor(accessToken: string): Promise<Actor> {
    const user = await this.identity.getVerifiedAuthUser(accessToken)
    if (!user) throw new TalentError('ログインが必要です。',401)
    const profile = await this.identity.getPublicUserProfile(user.id)
    if (!profile || profile.authUserId !== user.id || !['staff','supporter'].includes(profile.role)) throw new TalentError('利用権限を確認できません。',403)
    return {id:user.id,name:profile.name,role:profile.role}
  }
}
