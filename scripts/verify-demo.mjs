import assert from 'node:assert/strict'

const base = process.env.TALENT_TEST_URL || 'http://127.0.0.1:3000'
const origin = new URL(base).origin
let checks = 0
async function get(path, cookie = '') {
  return fetch(`${base}${path}`, { headers: cookie ? { Cookie: cookie } : {}, signal: AbortSignal.timeout(30000) })
}
async function post(path, body, cookie = '', requestOrigin = origin) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { Origin: requestOrigin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) })
}
function check(value, description) { assert.ok(value, description); checks++; console.log(`PASS ${description}`) }
for (const path of ['/', '/legacy', '/talent/supporters', '/talent/profile', '/talent/interview', '/talent/suggestions', '/talent/recommendations', '/talent/activities', '/talent/team']) {
  const response = await get(path)
  check(response.status === 200, `${path} responds 200`)
}
const response = await get('/api/talent')
check(response.status === 200 && response.headers.get('cache-control')?.includes('no-store'), 'bootstrap is live and not cached')
const staff = await response.json()
check(staff.actor.role === 'staff' && staff.profiles.length >= 18, 'staff can load sample supporters')
check(staff.suggestions.length === 0 && staff.interview === null && !('pairingPreferences' in staff), 'staff projection excludes private data')
check((await get('/api/talent/preferences')).status === 404, 'deferred preferences API is unavailable')
check((await get('/talent/preferences')).status === 404, 'deferred preferences page is unavailable')
const auth = await post('/api/talent/session', { actorId: 's1' })
check(auth.status === 200, 'demo account can be selected')
const cookie = auth.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie)
check(auth.headers.get('set-cookie').includes('HttpOnly'), 'demo cookie is HttpOnly')
const own = await (await get('/api/talent', cookie)).json()
check(own.actor.id === 's1' && own.suggestions.every(item => item.profileId === 's1'), 'supporter sees only own candidates')
check(own.profiles.filter(person => person.id !== 's1').every(person => person.email === '' && person.slack === ''), 'other supporters contact details are omitted')
check((await post('/api/talent', { action: 'team.build', request: '音響1名' }, cookie)).status === 403, 'supporter cannot run staff team action')
check((await post('/api/talent/preferences', { targetId: 's2', kind: 'hard_avoid' }, cookie)).status === 404, 'deferred preferences write API is unavailable')
check((await post('/api/talent', { action: 'search', query: '音響' }, '', 'https://example.com')).status === 403, 'cross-origin request rejected')
const searchResponse = await post('/api/talent', { action: 'search', query: '横浜周辺で動画撮影ができて土曜午後に動ける人' })
const search = await searchResponse.json()
check(searchResponse.status === 200 && search.results.length > 0 && search.results.every(result => result.reasons.length > 0), 'natural search returns reasons')
check(!JSON.stringify(search).includes('privateNote') && !JSON.stringify(search).includes('hard_avoid'), 'search response contains no pairing details')
console.log(`${checks} HTTP checks passed. No profile, approval, or team records were changed.`)
