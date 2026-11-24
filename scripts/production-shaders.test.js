// Every shader in the production list (everything outside wip/) must compile through the real
// wrapper. A shader that fails here is a black screen on visuals.beadfamous.com.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createRequire } from 'module'
import { shaderWrapper } from '../src/shader-transformers/shader-wrapper.js'

const glslang = createRequire(import.meta.url)('glslang-validator-prebuilt').path
const dir = mkdtempSync(join(tmpdir(), 'prod-shaders-'))

const productionShaders = readdirSync('shaders', { recursive: true })
    .map(f => f.replace(/\\/g, '/'))
    .filter(f => f.endsWith('.frag') && !f.split('/').includes('wip'))
    .sort()

const compileErrors = (file) => {
    const out = join(dir, 'x.frag')
    writeFileSync(out, shaderWrapper(readFileSync(join('shaders', file), 'utf-8')))
    try {
        execFileSync(glslang, [out], { encoding: 'utf-8', stdio: 'pipe' })
        return ''
    } catch (e) {
        return `${e.stdout}${e.stderr}`.split('\n').filter(l => l.startsWith('ERROR')).join('\n')
    }
}

describe('production shaders compile', () => {
    it.each(productionShaders)('%s', (file) => {
        expect(compileErrors(file)).toBe('')
    })
})
