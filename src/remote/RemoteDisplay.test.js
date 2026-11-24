import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const clients = vi.hoisted(() => [])

vi.mock('./WebSocketClient.js', () => ({
  WebSocketClient: class {
    url = 'ws://localhost:6969/ws'
    socket = { url: 'ws://localhost:6969/ws' }
    isConnected = false
    constructor(onMessage, onStatusChange) {
      this.onMessage = onMessage
      this.onStatusChange = onStatusChange
      clients.push(this)
    }
    connect() {}
    send() {}
  },
}))
// A shader whose name ends in `-slow` takes 500 ms to fetch, as a first Vite transform can.
vi.mock('../shaderLoader.js', () => ({
  loadShader: async (name) => {
    await new Promise((r) => setTimeout(r, name.endsWith('-slow') ? 500 : 10))
    window.cranes.shader = `code of ${name}`
    return {}
  },
}))
const inspectors = vi.hoisted(() => [])
vi.mock('./inspect.js', () => ({
  createInspector: (send, opts) => {
    const i = { opts, refusedWith: null, hello() {}, unwelcome() {}, welcome() {}, handle() {}, rekey() {}, refused(d) { i.refusedWith = d } }
    inspectors.push(i)
    return i
  },
}))

let href
const elements = {}
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  clients.length = 0
  inspectors.length = 0
  for (const k of Object.keys(elements)) delete elements[k]
  href = 'http://localhost:6969/?shader=plasma&remote=display&room=show&controller=clit-set'
  globalThis.window = {
    get location() { return new URL(href) },
    history: { replaceState: (_s, _t, url) => { href = String(url) } },
    addEventListener() {},
    postMessage() {},
    cranes: {},
  }
  globalThis.document = {
    getElementById: (id) => elements[id] ?? null,
    createElement: () => ({ style: {}, classList: { toggle() {} } }),
    body: { appendChild: (el) => { elements[el.id] = el } },
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.resetModules()
  delete globalThis.window
  delete globalThis.document
})

const boot = async () => {
  const { initRemoteDisplay } = await import('./RemoteDisplay.js')
  initRemoteDisplay()
  return clients[0]
}
const query = () => new URL(href).searchParams

describe('RemoteDisplay update-params from a room peer', () => {
  it('never lets a peer choose which controller JavaScript the next reload imports', async () => {
    const client = await boot()
    client.onMessage({ type: 'update-params', data: { controller: 'https://evil.example/x.js', knob_1: 0.5 } })
    vi.advanceTimersByTime(1000)
    expect(query().getAll('controller')).toEqual(['clit-set'])
    expect(query().get('knob_1')).toBe('0.5')
  })

  it('never mirrors boot-time params that load code, media or change the page mode', async () => {
    const client = await boot()
    const boot_ = { remote: 'control', vj: '1', midi: 'true', audio: 'remote', audio_send: 'true', audio_file: 'https://evil.example/a.mp3', audio_device: 'x', image: 'https://evil.example/p.png', embed: 'true', noaudio: 'true' }
    client.onMessage({ type: 'update-params', data: boot_ })
    vi.advanceTimersByTime(1000)
    for (const key of Object.keys(boot_)) expect(query().get(key) === boot_[key], key).toBe(false)
    expect(query().get('remote')).toBe('display')
  })

  it('cannot release a pinned key either (null would delete ?controller= from the URL)', async () => {
    const client = await boot()
    client.onMessage({ type: 'update-params', data: { controller: null, remote: null } })
    vi.advanceTimersByTime(1000)
    expect(query().getAll('controller')).toEqual(['clit-set'])
    expect(query().get('remote')).toBe('display')
  })
})

describe('RemoteDisplay shader switching', () => {
  it('ends on the shader picked last, even when the one before it loads slower', async () => {
    const client = await boot()
    client.onMessage({ type: 'update-params', data: { shader: 'first-slow' } })
    client.onMessage({ type: 'update-params', data: { shader: 'second' } })
    await vi.advanceTimersByTimeAsync(2000)
    expect(window.cranes.shader).toBe('code of second')
  })
})

describe('RemoteDisplay status badge', () => {
  it('stops showing "Reconnecting..." once the socket is back', async () => {
    const client = await boot()
    client.onStatusChange('disconnected')
    client.onStatusChange('reconnecting')
    client.isConnected = true
    client.onStatusChange('connected')
    vi.advanceTimersByTime(5000)
    const badge = elements['remote-status-indicator']
    expect(badge.textContent).not.toBe('Reconnecting...')
    expect(Number(badge.style.opacity)).toBeLessThan(1)
  })
})

describe('RemoteDisplay display secret', () => {
  const S = 'ds_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
  const bootWithSecret = async () => {
    href = `http://localhost:6969/?shader=plasma&remote=display&room=show#display_secret=${S}`
    const client = await boot()
    await vi.dynamicImportSettled()
    return { client, inspector: inspectors[0] }
  }

  it('sends the secret the page loaded with, only on a relay room socket', async () => {
    const { client, inspector } = await bootWithSecret()
    expect(inspector.opts.secret()).toBeUndefined() // the dev server's /ws: never
    client.socket.url = 'ws://127.0.0.1:8798/ws/show'
    expect(inspector.opts.secret()).toBe(S)
    client.socket.url = 'wss://evil.example/ws/show'
    expect(inspector.opts.secret()).toBeUndefined()
  })

  it('is pinned at load: a later hash edit or a peer cannot change it, and the mirror never touches it', async () => {
    const { client, inspector } = await bootWithSecret()
    client.socket.url = 'ws://127.0.0.1:8798/ws/show'
    client.onMessage({ type: 'update-params', data: { display_secret: 'ds_peer', knob_1: 0.5 } })
    client.onMessage({ type: 'update-params', data: { display_secret: null } })
    vi.advanceTimersByTime(1000)
    expect(new URL(href).hash).toBe(`#display_secret=${S}`)
    expect(query().has('display_secret')).toBe(false)
    expect(window.cranes.messageParams).not.toHaveProperty('display_secret')
    href = href.replace(S, 'ds_edited')
    expect(inspector.opts.secret()).toBe(S)
  })

  it('hands the relay\'s display-refused to the inspector', async () => {
    const { client, inspector } = await bootWithSecret()
    client.socket.url = 'ws://127.0.0.1:8798/ws/show'
    client.onMessage({ type: 'display-refused', data: { reason: 'wrong display secret' } })
    expect(inspector.refusedWith).toEqual({ reason: 'wrong display secret' })
  })
})
