import { describe, it, expect } from 'vitest'
import { prepareUniforms } from './Visualizer.js'

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
