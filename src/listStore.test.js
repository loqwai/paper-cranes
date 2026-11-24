import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readStore, writeStore } from './listStore.js'

const memory = new Map()

describe('list page local memory', () => {
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips what it wrote', () => {
    writeStore('stars', ['plasma'])
    expect(readStore('stars', [])).toEqual(['plasma'])
  })

  it('falls back on unreadable JSON', () => {
    memory.set('cranes-list-set', '{oops')
    expect(readStore('set', [])).toEqual([])
  })

  it.each([
    ['stars', [], 'null'],
    ['stars', [], '{}'],
    ['set', [], '"x"'],
    ['prefs', {}, 'null'],
    ['usertags', {}, '[]'],
    ['recents', {}, '5'],
    ['scroll', 0, '"top"'],
  ])('falls back when %s holds valid JSON of the wrong shape (%j fallback, stored %s)', (key, fallback, stored) => {
    memory.set(`cranes-list-${key}`, stored)
    expect(readStore(key, fallback)).toEqual(fallback)
  })
})
