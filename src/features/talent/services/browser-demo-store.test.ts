import assert from 'node:assert/strict'
import test from 'node:test'
import { createBrowserDemoApi, loadBrowserDemo } from './browser-demo-store.ts'

function browserStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value) },
  }
}

test('shared demo actions stay in the current browser and survive a reload', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window')
  try {
    Object.defineProperty(globalThis, 'window', {configurable:true,value:{localStorage:browserStorage()}})
    const api = createBrowserDemoApi('board')
    assert.equal(loadBrowserDemo('board').board.achievements.length, 0)
    await api.action({action:'board.complete',missionId:'demo-poster',performedRole:true})
    assert.equal(loadBrowserDemo('board').board.achievements.length, 1)
    await api.switchAccount('staff-demo')
    assert.equal(loadBrowserDemo('board').actor.role, 'staff')

    Object.defineProperty(globalThis, 'window', {configurable:true,value:{localStorage:browserStorage()}})
    assert.equal(loadBrowserDemo('board').board.achievements.length, 0)
    assert.equal(loadBrowserDemo('board').actor.id, 's1')
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
