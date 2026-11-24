import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const CODE = '// plasma.frag source'

let fetchMock
beforeEach(() => {
    fetchMock = vi.fn(async () => ({ text: async () => CODE }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { addEventListener: () => {}, cranes: { messageParams: {} } })
})
afterEach(() => vi.unstubAllGlobals())

const load = async () => {
    vi.resetModules()
    return import('./worker-communication.js')
}

describe('receive (window update-params)', () => {
    it('loads a shader named by `shader` as code, not as its name', async () => {
        const { receive } = await load()
        await receive({ data: { type: 'update-params', data: { shader: 'plasma' } } })
        expect(fetchMock).toHaveBeenCalledWith('/shaders/plasma.frag', expect.anything())
        expect(window.cranes.shader).toBe(CODE)
    })

    // edit.js's pop-out posts { shaderCode, ...flattenFeatures() } every frame,
    // and flattenFeatures carries the page's ?shader= name. Each message used
    // to fetch the .frag from disk just to throw it away: 60 fetches a second.
    it('uses shaderCode when given and does not fetch', async () => {
        const { receive } = await load()
        await receive({ data: { type: 'update-params', data: { shader: 'plasma', shaderCode: 'live code' } } })
        expect(fetchMock).not.toHaveBeenCalled()
        expect(window.cranes.shader).toBe('live code')
    })
})
