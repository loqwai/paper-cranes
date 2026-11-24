import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFlatAudioFeatures } from '../src/audio/AudioProcessor.js'

// Controllers start before audio does: the mic prompt (or a still-loading
// audio_file) leaves window.cranes.audio as noAudio, so the first frames carry
// no audio keys at all. A controller that accumulates `x += f(undefined)`
// turns NaN there and stays NaN after the audio arrives, so its uniforms are
// dropped for the rest of the session.

const audioKeys = Object.keys(getFlatAudioFeatures())
let seed = 7
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const music = () => Object.fromEntries(audioKeys.map((k) => [k, /ZScore|Slope/.test(k) ? rnd() * 2 - 1 : rnd()]))

let now
beforeEach(() => {
    now = 1000
    vi.stubGlobal('performance', { now: () => now })
})
afterEach(() => vi.unstubAllGlobals())

const runLateAudio = (controller) => {
    let out
    for (let i = 0; i < 240; i++) {
        now += 16.7
        out = controller(i < 120 ? {} : music())
    }
    return Object.entries(out).filter(([, v]) => typeof v === 'number' && !Number.isFinite(v)).map(([k]) => k)
}

describe('controllers recover once audio arrives', () => {
    it.each(['example', 'black-sun-sun-3'])('%s (make)', async (name) => {
        const { make } = await import(`./${name}.js`)
        expect(runLateAudio(make())).toEqual([])
    })

    it('simple (default export)', async () => {
        const { default: controller } = await import('./simple.js')
        expect(runLateAudio(controller)).toEqual([])
    })
})
