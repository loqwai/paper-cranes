import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Web MIDI as Chrome implements it: opening a port changes its `connection` to "open", and every
// state or connection change fires `statechange` on the MIDIAccess with the port's state, which
// stays "connected" throughout.
const makeMidi = () => {
  const accessListeners = []
  const access = {
    inputs: new Map(),
    addEventListener: (type, fn) => { if (type === 'statechange') accessListeners.push(fn) },
  }
  const fire = (port) => accessListeners.forEach((fn) => fn({ port }))
  const makeInput = (id, name) => {
    const listeners = []
    const input = {
      id, name, type: 'input', state: 'connected', connection: 'closed',
      addEventListener: (type, fn) => { if (type === 'midimessage') listeners.push(fn) },
      open() {
        if (input.connection === 'open') return
        input.connection = 'open'
        queueMicrotask(() => fire(input))
      },
      send: (bytes) => listeners.forEach((fn) => fn({ data: bytes })),
    }
    return input
  }
  return { access, fire, makeInput }
}

let midi
let calls
beforeEach(() => {
  calls = []
  midi = makeMidi()
  midi.access.inputs.set('a', midi.makeInput('a', 'Twister'))
  const store = {}
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }
  globalThis.window = {
    location: new URL('http://localhost/?midi=true'),
    cranes: { updateFeature: (k, v) => calls.push([k, v]), manualFeatures: {} },
  }
  vi.stubGlobal('navigator', { requestMIDIAccess: async () => midi.access })
})

afterEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  for (const k of ['localStorage', 'window']) delete globalThis[k]
})

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('midi.js', () => {
  it('handles each CC once after the port opens (open() fires statechange "connected")', async () => {
    await import('./midi.js')
    await flush()
    midi.access.inputs.get('a').send([0xb0, 1, 64])
    expect(calls).toHaveLength(1)
  })

  it('handles each CC once after the controller is unplugged and plugged back in', async () => {
    await import('./midi.js')
    await flush()
    const input = midi.access.inputs.get('a')
    input.state = 'disconnected'; input.connection = 'pending'; midi.fire(input)
    input.state = 'connected'; midi.fire(input)
    await flush()
    input.send([0xb0, 1, 64])
    expect(calls).toHaveLength(1)
  })

  it('a wall with the permission at "prompt" asks only on its first gesture', async () => {
    const listeners = {}
    window.location = new URL('http://localhost/?remote=display')
    window.addEventListener = (type, fn) => { (listeners[type] ??= []).push(fn) }
    window.removeEventListener = () => {}
    let asked = 0
    vi.stubGlobal('navigator', {
      requestMIDIAccess: async () => { asked++; return midi.access },
      permissions: { query: async () => ({ state: 'prompt' }) },
    })
    await import('./midi.js')
    await flush()
    expect(asked).toBe(0)
    expect(window.cranes.midiState).toBe('waiting')
    listeners.pointerdown[0]()
    await flush()
    expect(asked).toBe(1)
    midi.access.inputs.get('a').send([0xb0, 1, 64])
    expect(calls).toHaveLength(1)
  })

  it('a wall with the permission granted connects at load', async () => {
    window.location = new URL('http://localhost/?vj=1')
    window.addEventListener = () => {}
    vi.stubGlobal('navigator', {
      requestMIDIAccess: async () => midi.access,
      permissions: { query: async () => ({ state: 'granted' }) },
    })
    await import('./midi.js')
    await flush()
    expect(window.cranes.midiAccess).toBe(midi.access)
  })
})
