import { describe, it, expect, afterEach } from 'vitest'
import { getInitialShader } from './shaderLoader.js'

const withUrl = (search) => { globalThis.window = { location: { search } } }
afterEach(() => { delete globalThis.window })

describe('getInitialShader with ?shaderCode=', () => {
    it('loads code that uses the % operator', async () => {
        const code = 'void mainImage(out vec4 c, in vec2 f){ int i = 7 % 4; c = vec4(float(i)); }'
        withUrl(`?shaderCode=${encodeURIComponent(code)}`)
        expect((await getInitialShader()).code).toBe(code)
    })

    it('still loads code that was encoded twice', async () => {
        const code = 'void mainImage(out vec4 c, in vec2 f){ c = vec4(1.); }'
        withUrl(`?shaderCode=${encodeURIComponent(encodeURIComponent(code))}`)
        expect((await getInitialShader()).code).toBe(code)
    })
})
