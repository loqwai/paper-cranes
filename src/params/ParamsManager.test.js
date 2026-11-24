import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sent = vi.hoisted(() => [])

vi.mock('../remote/RemoteController.js', () => ({
  initRemoteController: () => ({
    isConnected: true,
    sendParams: (data) => sent.push(data),
    disconnect() {},
    reconnect() {},
  }),
}))

const { createParamsManager } = await import('./ParamsManager.js')

let href
beforeEach(() => {
  vi.useFakeTimers()
  sent.length = 0
  href = 'http://localhost/edit.html?knob_1=0.1&knob_2=0.2&knob_3=0.3&knob_3.min=0&knob_3.max=1'
  globalThis.window = {
    get location() { return new URL(href) },
    history: { replaceState: (_s, _t, url) => { href = String(url) } },
    cranes: {},
  }
  globalThis.localStorage = { setItem() {} }
})

afterEach(() => {
  vi.useRealTimers()
  delete globalThis.window
  delete globalThis.localStorage
})

const query = () => Object.fromEntries(new URL(href).searchParams)

describe('ParamsManager sync', () => {
  it('writes every key set within one debounce window to the URL, not just the last', () => {
    const pm = createParamsManager({ syncToUrl: true })
    pm.set('knob_1', 0.9)
    pm.set('knob_2', 0.8)
    vi.advanceTimersByTime(200)
    expect(query()).toMatchObject({ knob_1: '0.9', knob_2: '0.8' })
  })

  it('removes all three keys when a feature and its min/max are deleted together (edit.js deleteFeature)', () => {
    const pm = createParamsManager({ syncToUrl: true })
    pm.delete('knob_3')
    pm.delete('knob_3.min')
    pm.delete('knob_3.max')
    vi.advanceTimersByTime(200)
    expect(query()).not.toHaveProperty('knob_3')
    expect(query()).not.toHaveProperty('knob_3.min')
    expect(query()).not.toHaveProperty('knob_3.max')
  })

  it('sends every knob moved together to the remote display', () => {
    const pm = createParamsManager({ syncToUrl: false, remoteMode: true })
    pm.set('knob_1', 0.4)
    pm.set('knob_2', 0.6)
    vi.advanceTimersByTime(100)
    expect(Object.assign({}, ...sent)).toEqual({ knob_1: 0.4, knob_2: 0.6 })
  })

  it('keeps the remote display moving while a knob streams faster than the sync delay', () => {
    const pm = createParamsManager({ syncToUrl: false, remoteMode: true, remoteSyncDelay: 16 })
    // A MIDI fader sends a CC every ~8 ms while it moves: 30 values over 240 ms.
    for (let i = 0; i < 30; i++) {
      pm.set('knob_1', i / 30)
      vi.advanceTimersByTime(8)
    }
    // The display must have heard mid-gesture values, not only the final one after release.
    expect(sent.length).toBeGreaterThan(5)
  })
})
