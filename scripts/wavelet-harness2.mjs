#!/usr/bin/env node
// wavelet-harness2.mjs — DEEP feature analysis for music-visual animation quality.
//
// Beyond harness1's global range/liveliness/jitter/correlation, this keeps PER-SIGNAL
// time-series so it can measure what actually matters for driving visuals:
//
//   reactionSpeed  — how fast a feature responds to onsets (frames to 50% of its jump).
//                    Fast = visuals hit on the beat, not a sloppy lag behind it.
//   discrimination — does the feature look DIFFERENT on different content? (variance of
//                    per-signal means / overall std). High = it distinguishes kick vs
//                    sweep vs noise — useful for making visuals "understand" the music.
//   dutyCycle      — fraction of time the feature sits in the usable middle of its range
//                    (not pinned at 0 or 1). Pinned features drive dead visuals.
//   plus range / liveliness / jitter / independence as before.
//
// Usage: node scripts/wavelet-harness2.mjs sig1.pcm sig2.pcm ...

import { readFileSync } from 'fs'
import { basename } from 'path'
import { createWaveletAnalyzer } from '../src/audio/waveletAnalyzer.js'

const FRAME = 1024, HOP = 128, HISTORY = 500

const readPcm = (p) => { const b = readFileSync(p); return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4)) }

const STAT_SUFFIX = { normalized: 'Normalized', mean: 'Mean', median: 'Median', min: 'Min', max: 'Max', standardDeviation: 'StandardDeviation', zScore: 'ZScore', slope: 'Slope', intercept: 'Intercept', rSquared: 'RSquared' }
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
        buf.copyWithin(0, HOP)
        buf.set(samples.subarray(pos, pos + HOP), FRAME - HOP)
        filled += HOP
        if (filled < FRAME) continue
        const out = a.analyze(buf)
        out.bandStats.slice(0, 6).forEach((s, i) => flatten(series, `waveletBand${i}`, s))
        flatten(series, 'waveletBass', out.bassStats)
        flatten(series, 'waveletCentroid', out.centroidStats)
        flatten(series, 'waveletSpread', out.spreadStats)
        flatten(series, 'waveletTilt', out.tiltStats)
        ;(series.wavelet_bassHit ??= []).push(out.bassHit)
    }
    return series
}

// ---- metrics ----
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const stddev = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) }
const range = (xs) => Math.max(...xs) - Math.min(...xs)
const liveliness = (xs) => { const sd = stddev(xs) || 1e-9; let m = 0; for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - xs[i - 1]) > sd * 0.05) m++; return m / (xs.length - 1) }
const jitter = (xs) => { const r = range(xs) || 1e-9; let a = 0; for (let i = 2; i < xs.length; i++) a += Math.abs(xs[i] - 2 * xs[i - 1] + xs[i - 2]); return (a / (xs.length - 2)) / r }
const pearson = (xs, ys) => { const n = xs.length, mx = mean(xs), my = mean(ys); let nu = 0, dx = 0, dy = 0; for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; nu += a * b; dx += a * a; dy += b * b } const d = Math.sqrt(dx * dy); return d < 1e-12 ? 0 : nu / d }

// reaction speed: find the biggest sustained rises, measure frames from 10%→90% of the jump.
// returns mean rise-time in frames (lower = snappier). NaN if no clear rises.
const reactionSpeed = (xs) => {
    const sd = stddev(xs); if (sd < 1e-6) return NaN
    const times = []
    for (let i = 1; i < xs.length - 8; i++) {
        const jump = xs[i + 8] - xs[i]
        if (jump < sd * 1.5) continue // only big rises
        const lo = xs[i] + jump * 0.1, hi = xs[i] + jump * 0.9
        let t10 = -1, t90 = -1
        for (let j = i; j <= i + 8; j++) { if (t10 < 0 && xs[j] >= lo) t10 = j; if (xs[j] >= hi) { t90 = j; break } }
        if (t10 >= 0 && t90 >= t10) times.push(t90 - t10)
        i += 8
    }
    return times.length ? mean(times) : NaN
}

// discrimination: how much the per-signal MEANS vary, relative to overall std.
// high = the feature distinguishes one kind of audio from another.
const discrimination = (perSignalMeans, overallStd) => (overallStd < 1e-9 ? 0 : stddev(perSignalMeans) / overallStd)

// dutyCycle: fraction of frames in the usable 0.1..0.9 band after min-max normalizing.
const dutyCycle = (xs) => { const mn = Math.min(...xs), r = range(xs) || 1e-9; let c = 0; for (const x of xs) { const n = (x - mn) / r; if (n > 0.1 && n < 0.9) c++ } return c / xs.length }

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node wavelet-harness2.mjs sig.pcm [...]'); process.exit(1) }

// per-signal series + aggregate
const perSignal = {} // file -> { feature -> [] }
const agg = {}
for (const f of files) {
    const s = runSignal(readPcm(f))
    perSignal[basename(f)] = s
    for (const [k, v] of Object.entries(s)) (agg[k] ??= []).push(...v)
}
console.log(`Analyzed ${files.length} signals, ${Object.values(agg)[0]?.length ?? 0} total frames\n`)

const FOCUS = Object.keys(agg).filter(k =>
    /ZScore$|Normalized$|Slope$/.test(k) || /^wavelet(Centroid|Spread|Tilt)$/.test(k) || /^waveletBass$/.test(k) || /^waveletBand[0-5]$/.test(k) || k === 'wavelet_bassHit'
)

// Score every focus feature.
const rows = []
for (const k of FOCUS) {
    const xs = agg[k]; if (!xs || xs.length < 20) continue
    const sd = stddev(xs)
    const perMeans = files.map(f => { const v = perSignal[basename(f)][k]; return v && v.length ? mean(v) : 0 })
    rows.push({
        k,
        range: range(xs),
        lively: liveliness(xs),
        jitter: jitter(xs),
        react: reactionSpeed(xs),
        discrim: discrimination(perMeans, sd),
        duty: dutyCycle(xs),
    })
}

// composite "animation score": rewards range, liveliness, discrimination, duty, fast reaction;
// penalizes jitter. Tuned for music-visual usefulness.
const animScore = (r) => {
    const reactScore = isNaN(r.react) ? 0.5 : Math.max(0, 1 - r.react / 6) // <6 frames = good
    return (
        Math.min(r.range, 1) * 0.15 +
        r.lively * 0.20 +
        r.discrim * 0.20 +
        r.duty * 0.20 +
        reactScore * 0.15 +
        Math.max(0, 1 - r.jitter * 3) * 0.10
    )
}
rows.forEach(r => r.score = animScore(r))
rows.sort((a, b) => b.score - a.score)

console.log('=== FEATURE SCORES (sorted by animation usefulness) ===')
console.log('feature'.padEnd(30), 'score'.padStart(6), 'range'.padStart(7), 'lively'.padStart(7), 'jitter'.padStart(7), 'react'.padStart(6), 'discrim'.padStart(8), 'duty'.padStart(6))
for (const r of rows) {
    console.log(
        r.k.padEnd(30),
        r.score.toFixed(3).padStart(6),
        r.range.toFixed(2).padStart(7),
        r.lively.toFixed(2).padStart(7),
        r.jitter.toFixed(2).padStart(7),
        (isNaN(r.react) ? '—' : r.react.toFixed(1)).padStart(6),
        r.discrim.toFixed(2).padStart(8),
        r.duty.toFixed(2).padStart(6),
    )
}

// Greedy maximally-independent set from the TOP-scoring features.
const THRESH = 0.5
console.log(`\n=== MAXIMALLY-INDEPENDENT SET (top scorers, |corr|<${THRESH}) ===`)
const picked = []
for (const r of rows) {
    if (picked.every(p => Math.abs(pearson(agg[r.k], agg[p.k])) < THRESH)) picked.push(r)
    if (picked.length >= 8) break
}
for (const p of picked) {
    const mc = Math.max(0, ...picked.filter(q => q !== p).map(q => Math.abs(pearson(agg[p.k], agg[q.k]))))
    console.log(`  • ${p.k.padEnd(28)} score=${p.score.toFixed(2)}  maxCorr=${mc.toFixed(2)}`)
}

// ---- CURATED VJ SET: a deliberate blend for music visuals ----
// Mix high-DISCRIMINATION raw features ("what kind of sound") with fast Z-SCORE
// reactors ("what's happening right now") + the trigger. Enforce independence within.
console.log('\n=== CURATED VJ SET (blend of character + reactive + trigger, |corr|<0.5) ===')
const byMetric = (pred, metric) => rows.filter(r => pred(r.k)).sort((a, b) => b[metric] - a[metric])
const isRaw = (k) => /^wavelet(Centroid|Spread|Tilt)$|^waveletBand[0-5]$|^waveletBass$/.test(k)
const isZ = (k) => /ZScore$/.test(k)
const vj = []
const tryAdd = (r) => { if (r && vj.every(p => Math.abs(pearson(agg[r.k], agg[p.k])) < THRESH)) { vj.push(r); return true } return false }
// 1-2 character features (high discrimination, raw)
for (const r of byMetric(isRaw, 'discrim')) { if (vj.filter(x => isRaw(x.k)).length >= 3) break; tryAdd(r) }
// 3-4 reactive features (fast z-scores, prefer different bands)
for (const r of byMetric(isZ, 'react').reverse()) { if (vj.filter(x => isZ(x.k)).length >= 4) break; tryAdd(r) }
// the trigger
const hit = rows.find(r => r.k === 'wavelet_bassHit'); if (hit) vj.push(hit)
for (const p of vj) {
    const mc = Math.max(0, ...vj.filter(q => q !== p).map(q => Math.abs(pearson(agg[p.k], agg[q.k]))))
    const role = p.k === 'wavelet_bassHit' ? 'TRIGGER' : (isZ(p.k) ? 'reactive' : 'character')
    console.log(`  • ${p.k.padEnd(26)} [${role.padEnd(9)}] score=${p.score.toFixed(2)} react=${isNaN(p.react)?'—':p.react.toFixed(1)} discrim=${p.discrim.toFixed(2)} maxCorr=${mc.toFixed(2)}`)
}
