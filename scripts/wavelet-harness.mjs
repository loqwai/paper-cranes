#!/usr/bin/env node
// wavelet-harness.mjs — headless analysis of the wavelet feature pipeline.
//
// Reads raw f32le mono @44100 PCM (from ffmpeg), runs the EXACT live analyzer
// (createWaveletAnalyzer), collects each feature's time-series, then scores them for
// animation quality (dynamics) and mutual independence (correlation matrix).
//
// Usage:
//   ffmpeg -y -f lavfi -i "sine=frequency=60" -t 8 -ac 1 -ar 44100 -f f32le sig.pcm
//   node scripts/wavelet-harness.mjs sig.pcm [moreSignals.pcm ...]
//
// The worklet emits a 1024-sample frame every 128 input samples (render quantum), so
// we slide a 1024 window with hop 128 to mirror live timing.

import { readFileSync } from 'fs'
import { basename } from 'path'
import { createWaveletAnalyzer } from '../src/audio/waveletAnalyzer.js'

const FRAME = 1024
const HOP = 128            // worklet render quantum
const HISTORY = 500

// Read f32le PCM into a Float32Array.
const readPcm = (path) => {
    const buf = readFileSync(path)
    return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4))
}

// Run the analyzer over a signal, return { feature -> number[] } time-series.
// We flatten to the same feature names the live pipeline exposes.
const STAT_SUFFIX = {
    normalized: 'Normalized', mean: 'Mean', median: 'Median', min: 'Min', max: 'Max',
    standardDeviation: 'StandardDeviation', zScore: 'ZScore', slope: 'Slope',
    intercept: 'Intercept', rSquared: 'RSquared',
}
const flatten = (series, base, stats) => {
    ;(series[base] ??= []).push(stats.current)
    for (const [k, suf] of Object.entries(STAT_SUFFIX)) (series[`${base}${suf}`] ??= []).push(stats[k])
}

const runSignal = (samples) => {
    const a = createWaveletAnalyzer(HISTORY)
    const series = {}
    const buf = new Float32Array(FRAME)
    let filled = 0
    for (let pos = 0; pos + HOP <= samples.length; pos += HOP) {
        // slide window: shift left by HOP, append next HOP samples
        buf.copyWithin(0, HOP)
        buf.set(samples.subarray(pos, pos + HOP), FRAME - HOP)
        filled += HOP
        if (filled < FRAME) continue // wait until the window is full
        const out = a.analyze(buf)
        out.bandStats.slice(0, 6).forEach((s, i) => flatten(series, `waveletBand${i}`, s))
        flatten(series, 'waveletBass', out.bassStats)
        ;(series.wavelet_bassHit ??= []).push(out.bassHit)

        // ---- DERIVED candidate features (might be more independent/musical) ----
        const b = out.bandStats
        const cur = (i) => b[i]?.current ?? 0
        // spectral TILT: low-band vs high-band balance (bass-heavy → +, bright → -)
        const lowE = cur(0) + cur(1) + cur(2)
        const highE = cur(3) + cur(4) + cur(5)
        ;(series.waveletTilt ??= []).push((lowE - highE) / (lowE + highE + 1e-6))
        // spectral CENTROID-ish: energy-weighted band index, 0(bass)..5(treble)
        let num = 0, den = 0
        for (let i = 0; i < 6; i++) { num += i * cur(i); den += cur(i) }
        ;(series.waveletCentroid ??= []).push(den > 1e-6 ? num / den / 5 : 0)
        // spectral SPREAD: how many bands are active at once (flat vs peaky)
        const total = den + 1e-6
        let ent = 0
        for (let i = 0; i < 6; i++) { const p = cur(i) / total; if (p > 1e-6) ent -= p * Math.log(p) }
        ;(series.waveletSpread ??= []).push(ent / Math.log(6))
    }
    return series
}

// ---- scoring ----
const stddev = (xs) => {
    const m = xs.reduce((s, x) => s + x, 0) / xs.length
    return Math.sqrt(xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length)
}
const range = (xs) => Math.max(...xs) - Math.min(...xs)
// liveliness: fraction of frames where the value moved meaningfully frame-to-frame
const liveliness = (xs) => {
    const sd = stddev(xs) || 1e-9
    let moved = 0
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - xs[i - 1]) > sd * 0.05) moved++
    return moved / (xs.length - 1)
}
// jitter: mean abs second-difference / range — high = noisy/spiky, low = smooth
const jitter = (xs) => {
    const r = range(xs) || 1e-9
    let acc = 0
    for (let i = 2; i < xs.length; i++) acc += Math.abs(xs[i] - 2 * xs[i - 1] + xs[i - 2])
    return (acc / (xs.length - 2)) / r
}
const pearson = (xs, ys) => {
    const n = xs.length
    const mx = xs.reduce((s, x) => s + x, 0) / n
    const my = ys.reduce((s, y) => s + y, 0) / n
    let num = 0, dx = 0, dy = 0
    for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b }
    const d = Math.sqrt(dx * dy)
    return d < 1e-12 ? 0 : num / d
}

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node wavelet-harness.mjs sig.pcm [...]'); process.exit(1) }

// Aggregate time-series across all signals (concatenate) so scores reflect variety.
const agg = {}
for (const f of files) {
    const series = runSignal(readPcm(f))
    for (const [k, v] of Object.entries(series)) (agg[k] ??= []).push(...v)
    console.log(`  loaded ${basename(f)}: ${Object.values(series)[0]?.length ?? 0} frames`)
}

// Animation-relevant: ZScore/Normalized/Slope of bands/bass, the bassHit, and the
// derived tilt/centroid/spread features.
const FOCUS = Object.keys(agg).filter(k =>
    /ZScore$|Normalized$|Slope$/.test(k) ||
    /^wavelet(Tilt|Centroid|Spread)$/.test(k) ||
    k === 'wavelet_bassHit'
)

console.log('\n=== ANIMATION QUALITY (per feature, across all signals) ===')
console.log('feature'.padEnd(34), 'range'.padStart(8), 'lively'.padStart(8), 'jitter'.padStart(8), 'verdict')
const scored = []
for (const k of FOCUS) {
    const xs = agg[k]; if (!xs || xs.length < 10) continue
    const r = range(xs), L = liveliness(xs), J = jitter(xs)
    // good animation line: decent range, moves often, but not too jittery
    const good = r > 0.3 && L > 0.25 && J < 0.25
    const verdict = good ? 'GOOD' : (J >= 0.25 ? 'noisy' : (L <= 0.25 ? 'static' : 'weak'))
    scored.push({ k, r, L, J, good })
    console.log(k.padEnd(34), r.toFixed(3).padStart(8), L.toFixed(3).padStart(8), J.toFixed(3).padStart(8), '', verdict)
}

console.log('\n=== INDEPENDENCE (|correlation| among GOOD features; lower = more independent) ===')
const good = scored.filter(s => s.good).map(s => s.k)
if (good.length < 2) { console.log('  (need >=2 good features)') }
else {
    process.stdout.write(''.padEnd(22))
    good.forEach(k => process.stdout.write(k.replace('wavelet', 'w').slice(0, 10).padStart(11)))
    console.log()
    for (const a of good) {
        process.stdout.write(a.replace('wavelet', 'w').slice(0, 20).padEnd(22))
        for (const b of good) {
            const c = Math.abs(pearson(agg[a], agg[b]))
            process.stdout.write((a === b ? '—' : c.toFixed(2)).padStart(11))
        }
        console.log()
    }
    // Maximally-independent set: greedy by liveliness, reject candidates correlated
    // (>THRESH) with anything already picked. Seed with the liveliest feature.
    const THRESH = 0.45
    const liveOf = (k) => liveliness(agg[k])
    const byLive = [...good].sort((a, b) => liveOf(b) - liveOf(a))
    console.log(`\n  Maximally-independent set (greedy by liveliness, |corr|<${THRESH}):`)
    const picked = []
    for (const cand of byLive) {
        if (picked.every(p => Math.abs(pearson(agg[cand], agg[p])) < THRESH)) picked.push(cand)
    }
    picked.forEach(p => {
        const maxCorr = Math.max(0, ...picked.filter(q => q !== p).map(q => Math.abs(pearson(agg[p], agg[q]))))
        console.log(`    • ${p.padEnd(26)} lively=${liveOf(p).toFixed(2)}  maxCorrInSet=${maxCorr.toFixed(2)}`)
    })
}
