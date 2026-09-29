import { createHmac, timingSafeEqual } from 'node:crypto'
import { TalentError } from './errors.ts'

export function signDemoSession(actorId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({actorId,expiresAt:now + 86400000})).toString('base64url')
  return `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`
}
export function verifyDemoSession(token: string, secret: string, now = Date.now()): string {
  try {
    if (token.length > 1000) throw new Error('oversized')
    const parts = token.split('.')
    if (parts.length !== 2) throw new Error('invalid')
    const [payload,signature] = parts
    const expected = createHmac('sha256',secret).update(payload).digest()
    const supplied = Buffer.from(signature,'base64url')
    if (supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) throw new Error('invalid')
    const parsed = JSON.parse(Buffer.from(payload,'base64url').toString())
    if (typeof parsed.actorId !== 'string' || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= now) throw new Error('expired')
    return parsed.actorId
  } catch { throw new TalentError('デモセッションが無効です。アカウントを選び直してください。',401) }
}

export function assertDemoRequest(request: Request, mutation: boolean, environment = process.env.NODE_ENV, allowProduction = process.env.TALENT_DEMO_ALLOW_PRODUCTION) {
  if (process.env.NEXT_PUBLIC_SHARED_DEMO === 'true') throw new TalentError('共有デモはブラウザ内だけで動作します。',403)
  const url = new URL(request.url)
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new TalentError('このデモAPIはローカル環境専用です。',403)
  // Next.js may normalize request.url to localhost even when the browser uses
  // 127.0.0.1. Validate the actual Host separately and bind Origin to that Host.
  const host = request.headers.get('host') || url.host
  let publicOrigin: URL
  try { publicOrigin = new URL(`${url.protocol}//${host}`) }
  catch { throw new TalentError('接続先のホストを確認できません。',403) }
  if (!['localhost','127.0.0.1','[::1]'].includes(publicOrigin.hostname) || publicOrigin.host !== host || publicOrigin.port !== url.port) throw new TalentError('接続先のホストが一致しません。',403)
  if (environment === 'production' && allowProduction !== 'true') throw new TalentError('本番環境ではデモAPIを無効にしています。',403)
  if (mutation && request.headers.get('origin') !== publicOrigin.origin) throw new TalentError('リクエストの送信元を確認できません。',403)
}
