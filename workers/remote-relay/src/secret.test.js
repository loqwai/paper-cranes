// The room's display lock on its own: what it stores, what it accepts, and that the secret itself
// is never kept or echoed.
import { describe, it, expect } from 'vitest'
import { createDisplayLock, mintSecret, sameBytes, redactSecret, REFUSED } from './secret.js'

const memoryStorage = () => {
  const m = new Map()
  return { map: m, get: async (k) => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)) }, delete: async (k) => { m.delete(k) } }
}

describe('display secrets', () => {
  it('mints 256 random bits that no parser reads as a number', () => {
    const a = mintSecret(), b = mintSecret()
    expect(a).toMatch(/^ds_[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
    expect(Number.isNaN(parseFloat(a))).toBe(true)
  })

  it('compares bytes, not prefixes', () => {
    expect(sameBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(sameBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
    expect(sameBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false)
  })
})

describe('createDisplayLock', () => {
  it('leaves a room with no secret open', async () => {
    const lock = createDisplayLock(memoryStorage())
    expect(await lock.current()).toBeNull()
    expect(await lock.check(undefined)).toEqual({ ok: true, gen: null })
    expect(await lock.check('anything')).toEqual({ ok: true, gen: null })
  })

  it('once rotated, takes only the right secret, and says why it refuses without echoing it', async () => {
    const lock = createDisplayLock(memoryStorage())
    const { secret, gen } = await lock.rotate()
    expect(await lock.check(secret)).toEqual({ ok: true, gen })
    expect(await lock.check(undefined)).toEqual({ ok: false, reason: REFUSED.missing })
    expect(await lock.check('')).toEqual({ ok: false, reason: REFUSED.missing })
    expect(await lock.check(42)).toEqual({ ok: false, reason: REFUSED.missing })
    const wrong = await lock.check(`${secret}x`)
    expect(wrong).toEqual({ ok: false, reason: REFUSED.wrong })
    expect(JSON.stringify(wrong)).not.toContain(secret)
    expect(await lock.check('x'.repeat(100000))).toEqual({ ok: false, reason: REFUSED.wrong })
  })

  it('stores a hash, never the secret, and reads it back after a hibernation', async () => {
    const storage = memoryStorage()
    const { secret, gen } = await createDisplayLock(storage).rotate()
    expect(JSON.stringify([...storage.map])).not.toContain(secret)
    expect(storage.map.get('displaySecret').hash).toMatch(/^[0-9a-f]{64}$/)
    const revived = createDisplayLock(storage)
    expect(await revived.current()).toMatchObject({ gen })
    expect(await revived.current()).not.toHaveProperty('hash')
    expect(await revived.check(secret)).toEqual({ ok: true, gen })
  })

  it('rotation retires the old secret; clear opens the room again', async () => {
    const lock = createDisplayLock(memoryStorage())
    const first = await lock.rotate()
    const second = await lock.rotate()
    expect(second.gen).not.toBe(first.gen)
    expect((await lock.check(first.secret)).ok).toBe(false)
    expect((await lock.check(second.secret)).ok).toBe(true)
    await lock.clear()
    expect(await lock.current()).toBeNull()
    expect((await lock.check(undefined)).ok).toBe(true)
  })
})

describe('redactSecret', () => {
  it('cuts a secret out of an href or a signal, in the hash, the query or bare', () => {
    const s = mintSecret()
    expect(redactSecret(`https://v.example/?room=x#display_secret=${s}`)).toBe('https://v.example/?room=x#display_secret=REDACTED')
    expect(redactSecret(`https://v.example/?display_secret=${s}&room=x`)).toBe('https://v.example/?display_secret=REDACTED&room=x')
    expect(redactSecret(`{"url":"x","note":"${s}"}`)).toBe('{"url":"x","note":"REDACTED"}')
    expect(redactSecret(undefined)).toBeUndefined()
  })
})
