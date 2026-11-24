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
vi.mock('../shaderLoader.js', () => ({ loadShader: async () => ({}) }))
vi.mock('./inspect.js', () => ({ createInspector: () => ({ hello() {}, unwelcome() {}, welcome() {}, handle() {}, rekey() {} }) }))

let href
const elements = {}
beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  clients.length = 0
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
