import { describe, it, expect } from 'vitest'
import { prepareUniforms, shaderToyMouse } from './Visualizer.js'

describe('shaderToyMouse', () => {
    it('turns the normalized touch point into pixels, z set while pressed', () => {
        expect(shaderToyMouse({ touch: [0.25, 0.5], touched: true }, 400, 300)).toEqual([100, 150, 1, 0])
    })

    it('is the centre, never NaN, before any touch', () => {
        expect(shaderToyMouse({}, 400, 300)).toEqual([200, 150, 0, 0])
    })
})

describe('prepareUniforms', () => {
    it('feeds ?my-param=1 to the my_param uniform the wrapper declares for it', () => {
        expect(prepareUniforms({ 'my-param': 1 }).my_param).toBe(1)
    })

    it('lets an explicit underscore name win over its hyphenated twin', () => {
        expect(prepareUniforms({ 'my-param': 1, my_param: 2 }).my_param).toBe(2)
    })

    it('drops null, undefined and NaN, and resolves references to other uniforms', () => {
        const uniforms = prepareUniforms({ a: null, b: undefined, c: NaN, bass: 0.4, knob_1: 'bass' })
        expect(uniforms).toEqual({ bass: 0.4, knob_1: 0.4 })
    })
})
