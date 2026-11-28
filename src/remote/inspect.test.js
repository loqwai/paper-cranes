import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../shaderLoader.js', () => ({ shaderOnScreen: () => 'plasma' }))

const KEY = 'abcdef12-0000-0000-0000-000000000000'

let srcCanvas
beforeEach(() => {
  const store = { 'cranes-display-key': KEY }
  globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }
  globalThis.window = { addEventListener() {}, cranes: {} }
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
  globalThis.document = {
    getElementById: () => srcCanvas,
    querySelector: () => srcCanvas,
    createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,' }),
  }
})

afterEach(() => {
  vi.resetModules()
  for (const k of ['sessionStorage', 'window', 'requestAnimationFrame', 'document']) delete globalThis[k]
})

const shoot = async (args) => {
  const { createInspector } = await import('./inspect.js')
  const replies = []
  const inspector = createInspector((type, data) => replies.push({ type, data }))
  inspector.welcome({ id: 'abcdef' })
  await inspector.handle({ id: 1, cmd: 'shot', args })
  return replies.find((r) => r.type === 'inspect-reply').data.result
}

describe('inspect shot', () => {
  it('caps the long side at 960 on a portrait phone canvas, not just the width', async () => {
    srcCanvas = { width: 1080, height: 2340 }
    const { w, h } = await shoot({ width: 960 })
    expect(Math.max(w, h)).toBeLessThanOrEqual(960)
    expect(w / h).toBeCloseTo(1080 / 2340, 2)
  })

  it('leaves a landscape shot at the asked width', async () => {
    srcCanvas = { width: 1920, height: 1080 }
    const { w, h } = await shoot({ width: 480 })
    expect([w, h]).toEqual([480, 270])
  })
})

describe('inspect hello and state never report the display secret', () => {
  const S = 'ds_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
  beforeEach(() => {
    globalThis.location = new URL(`https://visuals.beadfamous.com/?shader=plasma&remote=display&room=x#display_secret=${S}`)
    srcCanvas = { width: 4, height: 4 }
  })
  afterEach(() => { delete globalThis.location })

  it('puts the secret in the hello only when the socket is one to send it on, and never in its href', async () => {
    const { createInspector } = await import('./inspect.js')
    const sent = []
    let secret
    const inspector = createInspector((type, data) => sent.push({ type, data }), { secret: () => secret })
    inspector.hello()
    secret = S
    inspector.hello()
    expect(sent[0].data).not.toHaveProperty('displaySecret')
    expect(sent[1].data.displaySecret).toBe(S)
    for (const { data } of sent) expect(data.href).toBe('https://visuals.beadfamous.com/?shader=plasma&remote=display&room=x')
  })

  it('leaves the secret out of get_state', async () => {
    Object.assign(window.cranes, { flattenFeatures: () => ({}), frameCount: 0, messageParams: {}, manualFeatures: { display_secret: S }, controllerFeatures: {} })
    const { createInspector } = await import('./inspect.js')
    const replies = []
    const inspector = createInspector((type, data) => replies.push({ type, data }), { secret: () => S })
    inspector.welcome({ id: 'abcdef' })
    await inspector.handle({ id: 1, cmd: 'state', args: { features: 'none' } })
    const reply = replies.find((r) => r.type === 'inspect-reply')
    expect(reply.data.ok).toBe(true)
    expect(JSON.stringify(reply)).not.toContain(S)
  })

  it('stops answering inspect once the relay refuses it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { createInspector } = await import('./inspect.js')
    const replies = []
    const inspector = createInspector((type, data) => replies.push({ type, data }))
    inspector.welcome({ id: 'abcdef' })
    inspector.refused({ reason: 'wrong display secret' })
    await inspector.handle({ id: 1, cmd: 'ping' })
    expect(replies).toEqual([])
  })
})
