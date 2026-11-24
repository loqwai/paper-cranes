import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  globalThis.window = { addEventListener() {}, cranes: { messageParams: {} } }
  vi.stubGlobal('fetch', async (url) => ({ text: async () => `// code of ${url}` }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  delete globalThis.window
})

describe('postMessage update-params (iframe embeds, edit.js "open in new window")', () => {
  it('switches to the named shader\'s code, not the name itself', async () => {
    const { receive } = await import('./worker-communication.js')
    await receive({ data: { type: 'update-params', data: { shader: 'plasma' } } })
    expect(window.cranes.shader).toBe('// code of /shaders/plasma.frag')
  })

  it('lets shaderCode win over a shader name in the same message', async () => {
    const { receive } = await import('./worker-communication.js')
    await receive({ data: { type: 'update-params', data: { shader: 'plasma', shaderCode: 'void main(){}' } } })
    expect(window.cranes.shader).toBe('void main(){}')
  })
})
