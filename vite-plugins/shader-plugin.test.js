import { describe, expect, it, vi } from 'vitest'

// A .frag deleted between the directory listing and its read (git checkout, a rebase, an agent
// writing then removing a scratch shader) makes readFile reject with ENOENT.
const handlers = vi.hoisted(() => ({}))
vi.mock('chokidar', () => ({ default: { watch: () => ({ on: (ev, fn) => { handlers[ev] = fn }, close() {} }) } }))
vi.mock('fs/promises', async (orig) => {
  const real = await orig()
  return {
    ...real,
    readFile: async (p, ...rest) => {
      if (String(p).endsWith('.frag')) throw Object.assign(new Error(`ENOENT: no such file or directory, open '${p}'`), { code: 'ENOENT' })
      return real.readFile(p, ...rest)
    },
    writeFile: async () => {},
    mkdir: async () => {},
  }
})

// Never touch the committed shader-dates.json from a test.
vi.mock('../scripts/shader-dates.js', async (orig) => ({ ...(await orig()), writeBakedDates: async () => {} }))

const { default: shaderPlugin, shaderPlugin: named } = await import('./shader-plugin.js')

describe('shader-plugin watcher', () => {
  it('does not reject (and so crash the dev server) when a shader vanishes mid-regenerate', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const plugin = (named ?? shaderPlugin)()
    plugin.configureServer({ ws: { send() {} }, config: { root: process.cwd() } })
    await expect(handlers.add('shaders/tmp/x.frag')).resolves.not.toThrow()
  })
})
