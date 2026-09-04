// Deterministic checks for src/audio/onsetDetector.js using synthetic spectra.
// Run: node scripts/test/onset-detector.js

import { makeOnsetDetector } from '../../src/audio/onsetDetector.js'

const BINS = 512
const FRAME_MS = 1000 / 60

let failures = 0
const check = (name, condition, detail = '') => {
    const ok = Boolean(condition)
    if (!ok) failures++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : ` — ${detail}`}`)
}

// Deterministic pseudo-noise (no Math.random so runs are reproducible)
const noiseAt = (frame, bin, amplitude) => amplitude * (0.5 + 0.5 * Math.sin(frame * 12.9898 + bin * 78.233))

const makeSpectrum = (frame, { noise = 0, hit = 0, hitLowBin = 0, hitHighBin = BINS, ramp = 0 } = {}) => {
    const spectrum = new Uint8Array(BINS)
    for (let i = 0; i < BINS; i++) {
        let v = noiseAt(frame, i, noise) + ramp
        if (hit > 0 && i >= hitLowBin && i < hitHighBin) v += hit
        spectrum[i] = Math.max(0, Math.min(255, Math.round(v)))
    }
    return spectrum
}

// Run `frames` frames through a detector; `shape(frame)` returns spectrum options
const run = (detector, frames, shape, overrides = {}) => {
    const onsets = []
    let last = null
    for (let frame = 0; frame < frames; frame++) {
        last = detector(makeSpectrum(frame, shape(frame)), frame * FRAME_MS, overrides)
        if (last.onset) onsets.push({ frame, strength: last.strength })
    }
    return { onsets, last }
}

// 1. Silence never fires
{
    const { onsets } = run(makeOnsetDetector(), 600, () => ({}))
    check('silence produces no onsets', onsets.length === 0, `${onsets.length} onsets`)
}

// 2. Steady noise floor never fires after warmup
{
    const { onsets } = run(makeOnsetDetector(), 600, () => ({ noise: 40 }))
    check('steady noise produces no onsets', onsets.length === 0, `${onsets.length} onsets`)
}

// 3. Periodic bursts: one onset per burst, on the burst's first frame
{
    const HIT_EVERY = 30 // 500ms apart
    const isHit = (frame) => frame >= 60 && frame % HIT_EVERY < 2 // 2-frame bursts
    const { onsets } = run(makeOnsetDetector(), 600, (frame) => ({ noise: 20, hit: isHit(frame) ? 120 : 0 }))
    const expected = Math.floor((600 - 60) / HIT_EVERY)
    check('every burst detected exactly once', onsets.length === expected, `${onsets.length} onsets, expected ${expected}`)
    const allOnFirstFrame = onsets.every((o) => o.frame % HIT_EVERY === 0)
    check('onsets fire on the first frame of each burst (zero added frames of lag)', allOnFirstFrame)
}

// 4. Refractory period suppresses a double hit, and shortening it lets both through
{
    const doubleHit = (frame) => ({ noise: 20, hit: frame === 100 || frame === 104 ? 120 : 0 }) // hits ~67ms apart
    const strict = run(makeOnsetDetector(), 200, doubleHit)
    check('120ms refractory collapses a 67ms double hit to one onset', strict.onsets.length === 1, `${strict.onsets.length} onsets`)
    const loose = run(makeOnsetDetector({ refractoryMs: 30 }), 200, doubleHit)
    check('30ms refractory lets both hits through', loose.onsets.length === 2, `${loose.onsets.length} onsets`)
}

// 5. A slow swell (median tracks it) fires at most once, not continuously
{
    const { onsets } = run(makeOnsetDetector(), 600, (frame) => ({ noise: 10, ramp: frame * 0.3 }))
    check('slow swell does not fire repeatedly', onsets.length <= 1, `${onsets.length} onsets`)
}

// 6. Strength orders by hit intensity and stays latched between onsets
{
    const detector = makeOnsetDetector()
    const hits = { 100: 40, 200: 200 } // soft then hard
    const { onsets, last } = run(detector, 260, (frame) => ({ noise: 20, hit: hits[frame] ?? 0 }))
    check('soft and hard hits both detected', onsets.length === 2, `${onsets.length} onsets`)
    check('harder hit reports higher strength', onsets.length === 2 && onsets[1].strength > onsets[0].strength,
        onsets.map((o) => o.strength.toFixed(3)).join(' vs '))
    check('strength stays latched after the onset frame', last.strength === onsets.at(-1)?.strength)
}

// 7. Band limiting: a treble-only hit is invisible to a bass-band detector
{
    const trebleHit = (frame) => ({ noise: 20, hit: frame === 100 ? 150 : 0, hitLowBin: 400, hitHighBin: BINS })
    const bassOnly = run(makeOnsetDetector({ lowBin: 0, highBin: 40 }), 200, trebleHit)
    check('bass-band detector ignores treble-only hit', bassOnly.onsets.length === 0, `${bassOnly.onsets.length} onsets`)
    const fullBand = run(makeOnsetDetector(), 200, trebleHit)
    check('full-band detector catches the same hit', fullBand.onsets.length === 1, `${fullBand.onsets.length} onsets`)
}

// 8. timeSinceMs is Infinity before any onset, then counts up
{
    const detector = makeOnsetDetector()
    const first = detector(makeSpectrum(0, {}), 0)
    check('timeSinceMs is Infinity before first onset', first.timeSinceMs === Infinity)
    const { last } = run(detector, 200, (frame) => ({ noise: 20, hit: frame === 100 ? 120 : 0 }))
    const expectedMs = (199 - 100) * FRAME_MS
    check('timeSinceMs counts up from the onset', Math.abs(last.timeSinceMs - expectedMs) < 1, `${last.timeSinceMs.toFixed(1)}ms`)
}

// 9. Live-override of tunables per call (how paper-cranes feeds manualFeatures in)
{
    const detector = makeOnsetDetector()
    const { onsets } = run(detector, 200, (frame) => ({ noise: 20, hit: frame === 100 ? 120 : 0 }), { fluxFloor: 250 })
    check('per-call fluxFloor override suppresses detection', onsets.length === 0, `${onsets.length} onsets`)
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
