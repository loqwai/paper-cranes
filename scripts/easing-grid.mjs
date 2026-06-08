#!/usr/bin/env node
// easing-grid.mjs — EXHAUSTIVE test of (audio feature × temporal easing) for animation.
//
// Runs every feature through every temporal-easing strategy (+ parameter sweeps) over the
// synthetic audio battery, and scores each combo on animation quality:
//   lively   — sd (movement; want > ~0.04)
//   eased    — maxJump/sd ratio (sawtooth-ness; want LOW, < ~0.5)
//   latency  — frames of lag vs the raw feature (cross-correlation peak offset; want LOW)
//   range    — span covered (want > ~0.3)
// Composite favors lively + eased + low-latency.
//
// Usage: node scripts/easing-grid.mjs /tmp/wl20/*.pcm

import { readFileSync } from 'fs'
import { basename } from 'path'
import { createWaveletAnalyzer } from '../src/audio/waveletAnalyzer.js'

const FRAME = 1024, HOP = 128, HISTORY = 500
const DT = HOP / 44100 // ~2.9ms per frame

const readPcm = (p) => { const b = readFileSync(p); return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4)) }

// ---- the features we test (the fast Normalized variants — the low-latency inputs) ----
const FEATURES = ['waveletBand1', 'waveletBand3', 'waveletBand5', 'waveletCentroid', 'waveletSpread', 'waveletBass', 'waveletTilt']

// ---- temporal easing strategies (stateful; created fresh per run) ----
const EASINGS = {
    raw: () => { return (t) => t },
    ema_light: () => { let p; return (t) => (p = p === undefined ? t : p * 0.85 + t * 0.15) },
    ema_heavy: () => { let p; return (t) => (p = p === undefined ? t : p * 0.94 + t * 0.06) },
    spring_snappy: () => { let pos, vel = 0; return (t) => { if (pos === undefined) pos = t; vel += (200 * (t - pos) - 28 * vel) * DT; pos += vel * DT; return pos } },
    spring_smooth: () => { let pos, vel = 0; return (t) => { if (pos === undefined) pos = t; vel += (90 * (t - pos) - 19 * vel) * DT; pos += vel * DT; return pos } },
    attackRelease: () => { let p; return (t) => { if (p === undefined) p = t; const r = t > p ? 0.6 : 0.06; return (p = p + (t - p) * r) } },
    peakDecay: () => { let p = 0; return (t) => { p = Math.max(t, p * 0.92); return p } }, // fast rise, exp decay
    // slew-rate-limited: cap max change per frame. Sweep the cap to find the optimum.
    slew_02: () => { let p; return (t) => { if (p === undefined) p = t; const d = t - p, m = 0.02; return (p = p + Math.max(-m, Math.min(m, d))) } },
    slew_04: () => { let p; return (t) => { if (p === undefined) p = t; const d = t - p, m = 0.04; return (p = p + Math.max(-m, Math.min(m, d))) } },
    slew_06: () => { let p; return (t) => { if (p === undefined) p = t; const d = t - p, m = 0.06; return (p = p + Math.max(-m, Math.min(m, d))) } },
    slew_08: () => { let p; return (t) => { if (p === undefined) p = t; const d = t - p, m = 0.08; return (p = p + Math.max(-m, Math.min(m, d))) } },
    // slew then light EMA — slew kills cliffs, EMA rounds the corners the slew leaves.
    slewEma: () => { let p, e; return (t) => { if (p === undefined) { p = e = t } const d = t - p, m = 0.05; p = p + Math.max(-m, Math.min(m, d)); return (e = e * 0.7 + p * 0.3) } },
    // adaptive slew: cap scales with recent volatility (loose when calm, tight on spikes).
    slewAdaptive: () => { let p, vol = 0; return (t) => { if (p === undefined) p = t; const d = t - p; vol = vol * 0.95 + Math.abs(d) * 0.05; const m = 0.03 + vol * 0.5; return (p = p + Math.max(-m, Math.min(m, d))) } },
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const sd = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) }
const range = (xs) => Math.max(...xs) - Math.min(...xs)
const maxJump = (xs) => { let m = 0; for (let i = 1; i < xs.length; i++) m = Math.max(m, Math.abs(xs[i] - xs[i - 1])); return m }
// curviness: mean abs 2nd-difference relative to range. LOW = silky curves (gentle accel),
// HIGH = angular/kinky (sharp direction changes — slew's constant-rate segments score high).
// This captures what the EYE reads as "smooth" that maxJump/sd misses.
const curviness = (xs) => { const r = range(xs) || 1e-9; let a = 0; for (let i = 2; i < xs.length; i++) a += Math.abs(xs[i] - 2 * xs[i - 1] + xs[i - 2]); return (a / (xs.length - 2)) / r }
// latency: lag (in frames) where eased best correlates with raw — how far it trails.
const latency = (raw, eased) => {
    const n = raw.length, mr = mean(raw), me = mean(eased)
    let best = 0, bestC = -2
    for (let lag = 0; lag <= 20; lag++) {
        let num = 0, dr = 0, de = 0
        for (let i = lag; i < n; i++) { const a = raw[i - lag] - mr, b = eased[i] - me; num += a * b; dr += a * a; de += b * b }
        const c = num / Math.sqrt(dr * de + 1e-12)
        if (c > bestC) { bestC = c; best = lag }
    }
    return best
}

// Build raw feature time-series across all signals.
const buildRaw = (files) => {
    const series = {} // feature -> []
    for (const f of files) {
        const samples = readPcm(f)
        const a = createWaveletAnalyzer(HISTORY)
        const buf = new Float32Array(FRAME); let filled = 0
        for (let pos = 0; pos + HOP <= samples.length; pos += HOP) {
            buf.copyWithin(0, HOP); buf.set(samples.subarray(pos, pos + HOP), FRAME - HOP); filled += HOP
            if (filled < FRAME) continue
            const o = a.analyze(buf)
            const map = {
                waveletBand1: o.bandStats[1].normalized, waveletBand3: o.bandStats[3].normalized, waveletBand5: o.bandStats[5].normalized,
                waveletCentroid: o.centroidStats.normalized, waveletSpread: o.spreadStats.normalized, waveletBass: o.bassStats.normalized,
                waveletTilt: o.tiltStats.normalized,
            }
            for (const k of FEATURES) (series[k] ??= []).push(map[k] ?? 0)
        }
    }
    return series
}

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node easing-grid.mjs sig.pcm [...]'); process.exit(1) }
const raw = buildRaw(files)
console.log(`Exhaustive grid: ${FEATURES.length} features × ${Object.keys(EASINGS).length} easings, ${raw[FEATURES[0]].length} frames\n`)

// Score every (feature, easing) combo.
const rows = []
for (const feat of FEATURES) {
    const rawXs = raw[feat]
    for (const [ename, makeFn] of Object.entries(EASINGS)) {
        const fn = makeFn()
        const eased = rawXs.map(fn)
        const s = sd(eased), mj = maxJump(eased), r = range(eased), lat = latency(rawXs, eased), curv = curviness(eased)
        const ratio = s > 1e-4 ? mj / s : 9          // sawtooth-ness (low = eased)
        // composite now includes CURVINESS (silkiness to the eye), which the earlier metric
        // missed — that's why slew won headlessly but spring looked smoother live.
        const livelyScore = Math.min(s / 0.12, 1)
        const easedScore = Math.max(0, 1 - ratio / 1.2)
        const latScore = Math.max(0, 1 - lat / 12)
        const rangeScore = Math.min(r / 0.4, 1)
        const curvScore = Math.max(0, 1 - curv / 0.04)   // low curviness = silky = high score
        const score = livelyScore * 0.25 + easedScore * 0.25 + latScore * 0.15 + rangeScore * 0.10 + curvScore * 0.25
        rows.push({ feat, ename, sd: s, ratio, lat, range: r, curv, score })
    }
}

// Best easing per feature.
console.log('=== BEST EASING PER FEATURE (by composite animation score) ===')
for (const feat of FEATURES) {
    const fr = rows.filter(r => r.feat === feat).sort((a, b) => b.score - a.score)
    const top = fr[0]
    console.log(`${feat.padEnd(16)} → ${top.ename.padEnd(14)} score=${top.score.toFixed(2)} (sd=${top.sd.toFixed(3)} ratio=${top.ratio.toFixed(2)} lat=${top.lat}f)`)
}

// Best overall combos.
console.log('\n=== TOP 12 (feature × easing) COMBOS OVERALL ===')
rows.sort((a, b) => b.score - a.score).slice(0, 12).forEach(r =>
    console.log(`  ${r.score.toFixed(2)}  ${r.feat.padEnd(16)} ${r.ename.padEnd(14)} sd=${r.sd.toFixed(3)} ratio=${r.ratio.toFixed(2)} lat=${r.lat}f range=${r.range.toFixed(2)}`))

// Easing leaderboard (avg score across features).
console.log('\n=== EASING LEADERBOARD (avg score across all features) ===')
const byEasing = {}
for (const r of rows) (byEasing[r.ename] ??= []).push(r.score)
Object.entries(byEasing).map(([e, ss]) => ({ e, avg: mean(ss) })).sort((a, b) => b.avg - a.avg)
    .forEach(({ e, avg }) => console.log(`  ${e.padEnd(14)} avg=${avg.toFixed(3)}`))
