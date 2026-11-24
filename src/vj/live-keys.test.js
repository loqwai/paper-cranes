import { describe, expect, it, vi } from 'vitest'
import { installLiveKeys } from './live-keys.js'

const setup = ({ live = true } = {}) => {
  let handler
  const target = { addEventListener: (_t, fn) => { handler = fn }, removeEventListener() {} }
  const cranes = live ? { keep: vi.fn(async () => {}), panic: vi.fn(async () => {}) } : {}
  const snapshot = vi.fn(async () => {})
  let t = 0
  installLiveKeys({ snapshot, target, cranes: () => cranes, now: () => t })
  const press = (code, extra = {}) => handler({ code, target: { matches: () => false }, preventDefault() {}, ...extra })
  return { cranes, snapshot, press, at: (ms) => { t = ms } }
}

describe('live keys on jam/show', () => {
  it('k presses KEEP, and registers the page snapshot path for it', () => {
    const { cranes, snapshot, press } = setup()
    press('KeyK')
    expect(cranes.keep).toHaveBeenCalledOnce()
    expect(cranes.snapshot).toBe(snapshot)
  })

  it('k still saves a snapshot on a page with no live show', () => {
    const { snapshot, press } = setup({ live: false })
    press('KeyK')
    expect(snapshot).toHaveBeenCalledOnce()
  })

  it('Space is left alone (the page saves its own snapshot)', () => {
    const { cranes, snapshot, press } = setup()
    press('Space')
    expect(cranes.keep).not.toHaveBeenCalled()
    expect(snapshot).not.toHaveBeenCalled()
  })

  it('PANIC needs two Escapes within 1 s', () => {
    const { cranes, press, at } = setup()
    press('Escape'); at(1500); press('Escape')
    expect(cranes.panic).not.toHaveBeenCalled()
    at(2000); press('Escape')
    expect(cranes.panic).toHaveBeenCalledOnce()
  })
})
