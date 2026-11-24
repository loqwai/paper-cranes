import { describe, it, expect, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createRequire } from 'module'
import { shaderWrapper } from './shader-wrapper.js'

const glslang = createRequire(import.meta.url)('glslang-validator-prebuilt').path
const dir = mkdtempSync(join(tmpdir(), 'wrapper-test-'))

// Compile the wrapped shader the way the validator does; returns the error text, '' when it compiles.
const compileErrors = (shader) => {
    const file = join(dir, 'x.frag')
    writeFileSync(file, shaderWrapper(shader))
    try {
        execFileSync(glslang, [file], { encoding: 'utf-8', stdio: 'pipe' })
        return ''
    } catch (e) {
        return `${e.stdout}${e.stderr}`.split('\n').filter(l => l.startsWith('ERROR')).join('\n')
    }
}

const withUrl = (search) => { globalThis.window = { location: { search } } }
afterEach(() => { delete globalThis.window })

const mainImage = (body) => `void mainImage(out vec4 fragColor, in vec2 fragCoord) { ${body} }`

describe('shaderWrapper', () => {
    it('compiles a plain mainImage shader', () => {
        expect(compileErrors(mainImage('fragColor = vec4(bass, knob_3, 0., 1.);'))).toBe('')
    })

    it('defines PAPER_CRANES for mainImage shaders, so ShaderToy fallbacks can be skipped', () => {
        const shader = `#ifndef PAPER_CRANES
float beat = 0.0;
#endif
${mainImage('fragColor = vec4(beat ? 1. : 0.);')}`
        expect(compileErrors(shader)).toBe('')
    })

    it('declares a numeric URL param as a uniform', () => {
        withUrl('?my_param=0.5')
        expect(compileErrors(mainImage('fragColor = vec4(my_param);'))).toBe('')
    })

    it('ignores URL params whose names are not GLSL identifiers', () => {
        withUrl('?3d=1&gl_depth=1&a__b=2&_=1732400000&ok=1')
        expect(compileErrors(mainImage('fragColor = vec4(ok);'))).toBe('')
    })

    it('accepts knobs the shader declares in a comma list', () => {
        const shader = `uniform float knob_1, knob_2;
${mainImage('fragColor = vec4(knob_1, knob_2, 0., 1.);')}`
        expect(compileErrors(shader)).toBe('')
    })

    it('accepts audio features the shader declares in a comma list', () => {
        const shader = `uniform float bass, treble;
${mainImage('fragColor = vec4(bass, treble, 0., 1.);')}`
        expect(compileErrors(shader)).toBe('')
    })
})
