import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { EventEmitter } from 'events'

vi.mock('chokidar', () => ({ default: { watch: () => ({ on() {}, close() {} }) } }))

const { editorSyncPlugin } = await import('./editor-sync-plugin.js')
const { vjSignalPlugin } = await import('./vj-signal-plugin.js')

let root
beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  root = await mkdtemp(join(tmpdir(), 'editor-sync-'))
  await mkdir(join(root, 'shaders'), { recursive: true })
  await writeFile(join(root, 'shaders', 'x.frag'), '// original')
})
afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

// Run a request through the plugin's middlewares the way connect would.
const serve = (plugin) => {
  const handlers = []
  plugin.configureServer({
    config: { root },
    middlewares: { use: (a, b) => handlers.push(b ? { path: a, fn: b } : { fn: a }) },
    ws: { send() {} },
    environments: {},
  })
  return ({ method = 'POST', url, headers = {}, body = '' }) => new Promise((resolveP) => {
    const req = Object.assign(new EventEmitter(), { method, url, headers: { host: 'localhost:6969', ...headers } })
    const res = {
      statusCode: 200,
      writeHead(code) { this.statusCode = code },
      setHeader() {},
      end(out) { resolveP({ status: this.statusCode, body: out }) },
    }
    const run = (i) => {
      const h = handlers[i]
      if (!h) return resolveP({ status: 404 })
      if (h.path && !url.startsWith(h.path)) return run(i + 1)
      h.fn(req, res, () => run(i + 1))
    }
    run(0)
    setImmediate(() => { req.emit('data', body); req.emit('end') })
  })
}

const save = JSON.stringify({ shader: 'x', code: '// from another site' })

describe('dev-server write endpoints refuse other sites (CSRF)', () => {
  it('refuses a /__save-shader POST from another origin and leaves the file alone', async () => {
    const send = serve(editorSyncPlugin())
    const r = await send({ url: '/__save-shader', headers: { origin: 'https://evil.example', 'content-type': 'text/plain' }, body: save })
    expect(r.status).toBe(403)
    expect(await readFile(join(root, 'shaders', 'x.frag'), 'utf-8')).toBe('// original')
  })

  it('still saves from the editor on this server, and from a script with no Origin', async () => {
    const send = serve(editorSyncPlugin())
    expect((await send({ url: '/__save-shader', headers: { origin: 'http://localhost:6969' }, body: save })).status).toBe(200)
    expect((await send({ url: '/__save-shader', body: save })).status).toBe(200)
  })

  it('refuses snapshot writes and deletes from another origin', async () => {
    const send = serve(editorSyncPlugin())
    const evil = { origin: 'https://evil.example' }
    expect((await send({ url: '/__snapshot-preset', headers: evil, body: JSON.stringify({ shader: 'x' }) })).status).toBe(403)
    expect((await send({ method: 'DELETE', url: '/__snapshot-preset', headers: evil, body: JSON.stringify({ shader: 'x' }) })).status).toBe(403)
    expect((await send({ url: '/__capture', headers: evil, body: JSON.stringify({ filename: 'f', b64: 'AA==' }) })).status).toBe(403)
  })

  it('refuses a forged /__vj-signal POST from another origin (it wakes the VJ loop)', async () => {
    const onSignal = vi.fn()
    const send = serve(vjSignalPlugin({ onSignal }))
    const r = await send({ url: '/__vj-signal', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ type: 'boot' }) })
    expect(r.status).toBe(403)
    expect(onSignal).not.toHaveBeenCalled()
  })
})
