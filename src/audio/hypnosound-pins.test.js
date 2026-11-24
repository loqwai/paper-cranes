import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// The browser never loads node_modules/hypnosound: the main thread gets it from
// esm.sh through the vite alias, and each worker imports its own esm.sh URL.
// Tests run against the installed package. So four places name a version, and
// they drifted once: the main thread sat on 1.10.2 while the workers ran 1.14.0.
const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

const aliasPin = read('vite.config.js').match(/'hypnosound':\s*'https:\/\/esm\.sh\/hypnosound@([\d.]+)'/)?.[1]
const workerPins = [...read('src/audio/analyzer.js').matchAll(/esm\.sh\/hypnosound@([\d.]+)\//g)].map(m => m[1])
const range = JSON.parse(read('package.json')).dependencies.hypnosound
const locked = JSON.parse(read('package-lock.json')).packages['node_modules/hypnosound'].version

describe('hypnosound version pins', () => {
    it('finds the vite alias pin and the worker pins', () => {
        expect(aliasPin).toMatch(/^\d+\.\d+\.\d+$/)
        expect(workerPins.length).toBeGreaterThanOrEqual(2)
    })

    it('runs the workers on the same release as the main thread', () => {
        expect(new Set(workerPins)).toEqual(new Set([aliasPin]))
    })

    it('tests against the release the browser loads', () => {
        expect(range).toBe(`^${aliasPin}`)
        expect(locked).toBe(aliasPin)
    })
})
