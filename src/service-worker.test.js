// Runs the shipped service worker (public/ is what Vite copies to dist/) in a vm sandbox
// with fake fetch, caches and clients, and checks what a page would see.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const SW_PATH = fileURLToPath(new URL('../public/service-worker.js', import.meta.url))
const ORIGIN = 'https://visuals.example'

const bootWorker = ({ fetchImpl }) => {
  const listeners = {}
  const events = []
  const store = new Map()
  const cache = {
    match: async (req) => store.get(typeof req === 'string' ? req : req.url),
    put: async (req, res) => {
      events.push(`put ${req.url}`)
      store.set(req.url, res)
    },
  }
  const client = { postMessage: (message) => events.push(`post ${message}`) }
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn },
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [client] },
  }
  const context = vm.createContext({
    globalThis: self,
    caches: { open: async () => cache },
    fetch: fetchImpl,
    location: { origin: ORIGIN },
    Request, Response, URL, Promise, Math, Date, console: { error: () => {}, warn: () => {} },
    setTimeout, setInterval, clearTimeout,
  })
  vm.runInContext(readFileSync(SW_PATH, 'utf8'), context)
  const request = (path) => {
    let responded
    listeners.fetch({ request: new Request(`${ORIGIN}${path}`), respondWith: (promise) => { responded = promise } })
    return responded
  }
  return { request, events, store }
}

describe('service worker', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is the only copy in the repo, so a fix cannot land in a file that never ships', () => {
    expect(existsSync(fileURLToPath(new URL('../service-worker.js', import.meta.url)))).toBe(false)
  })

  it('updates the cache before telling pages to reload, and reloads once for a burst of changes', async () => {
    let version = 'old'
    const sw = bootWorker({ fetchImpl: async () => new Response(version) })
    await (await sw.request('/a.js')).text()
    await (await sw.request('/b.js')).text()
    await vi.advanceTimersByTimeAsync(10)
    sw.events.length = 0

    version = 'new'
    await sw.request('/a.js')
    await sw.request('/b.js')
    await vi.advanceTimersByTimeAsync(10)

    const firstPost = sw.events.indexOf('post reload')
    expect(firstPost).toBeGreaterThan(sw.events.indexOf(`put ${ORIGIN}/a.js`))
    expect(sw.events.filter((event) => event === 'post reload')).toHaveLength(1)
  })

  it('hands a 404 straight to the page instead of retrying it', async () => {
    let calls = 0
    const sw = bootWorker({ fetchImpl: async () => { calls++; return new Response('nope', { status: 404 }) } })
    const pending = sw.request('/shaders/missing.frag')
    await vi.advanceTimersByTimeAsync(10)
    const response = await pending
    expect(response.status).toBe(404)
    expect(calls).toBe(1)
  })

  it('settles a request whose server keeps failing, instead of leaving the page waiting forever', async () => {
    const sw = bootWorker({ fetchImpl: async () => new Response('down', { status: 503 }) })
    let settled = false
    sw.request('/shaders.json').then(() => { settled = true }, () => { settled = true })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(settled).toBe(true)
  })

  it('settles a request when the network is gone and nothing is cached', async () => {
    const sw = bootWorker({ fetchImpl: async () => { throw new TypeError('Failed to fetch') } })
    let settled = false
    sw.request('/list.html').then(() => { settled = true }, () => { settled = true })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(settled).toBe(true)
  })
})
