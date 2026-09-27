import assert from 'node:assert/strict'
const origin = process.env.TALENT_TEST_URL || 'http://127.0.0.1:3000'
const base = '/api/action-board-demo'
let count=0
const check=(value,label)=>{assert.ok(value,label);console.log(`PASS ${label}`);count++}
const get=(path,cookie='')=>fetch(`${origin}${path}`,{headers:{Cookie:cookie},signal:AbortSignal.timeout(30000)})
const post=(path,body,cookie='')=>fetch(`${origin}${path}`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
for(const view of ['','missions','history','account','settings','talent','profile','suggestions','interview','recommendations','supporters','team','activities','about']){
  const response=await get(`/action-board-demo${view?`/${view}`:''}`)
  check(response.status===200,`integrated ${view||'home'} loads`)
  check(response.headers.get('content-security-policy')?.includes("connect-src 'self'"),`${view||'home'} restricts external connections`)
}
check((await get('/action-board-demo/not-a-page')).status===404,'unknown page is rejected')
const supporter=await (await get(base)).json()
check(supporter.actor.id==='s1'&&supporter.board.missions.length===4,'integration has its own initial supporter and missions')
check(supporter.board.missions.every(m=>m.id.startsWith('demo-')),'all mission IDs belong to demo')
const response=await post(`${base}/session`,{actorId:'staff-demo'})
const cookie=response.headers.get('set-cookie')?.split(';')[0]
check(response.ok&&cookie?.startsWith('action-board-local-demo='),'integration cookie is namespaced')
check(response.headers.get('set-cookie')?.includes('Path=/api/action-board-demo'),'cookie is scoped to integration API')
const staff=await (await get(base,cookie)).json()
check(staff.actor.role==='staff'&&staff.board.achievements.length===0&&staff.suggestions.length===0,'staff sees no private achievements or candidates')
check((await get(`${base}/preferences`,cookie)).status===404,'deferred preferences API is unavailable')
check((await get('/action-board-demo/preferences')).status===404,'deferred preferences page is unavailable')
check((await post(base,{action:'board.complete',missionId:'demo-poster',performedRole:true},cookie)).status===403,'staff cannot record someone else’s achievement')
check((await post(base,{action:'board.complete',missionId:'production-id',performedRole:true})).status===404,'official/unknown mission IDs cannot be used')
const search=await (await post(base,{action:'search',query:'CanvaとSNS投稿を任せられる人'},cookie)).json()
check(search.results.length>0&&search.results.every(r=>r.reasons.length>0),'integrated staff search returns reasons')
const legacy=await (await get('/api/talent',cookie)).json()
check(legacy.actor.id==='staff-demo'&&!('board' in legacy),'standalone API remains separate')
check(!JSON.stringify(staff).includes('privateNote'),'no private note in public data')
console.log(`${count} integration HTTP checks passed. No supporter data was changed.`)
