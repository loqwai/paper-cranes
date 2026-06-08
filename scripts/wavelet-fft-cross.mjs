#!/usr/bin/env node
// wavelet-fft-cross.mjs — run BOTH the wavelet pipeline and the real hypnosound FFT
// pipeline on the same frames, then measure cross-domain correlation to find:
//   • INDEPENDENT wavelet↔FFT pairs → combine for MORE total visual variety
//   • REDUNDANT pairs → fuse for ROBUSTNESS (two measures agreeing = confident)
//   • candidate COMBINED features (products / gated confirmations)
//
// Usage: node scripts/wavelet-fft-cross.mjs sig.pcm [...]

import { readFileSync } from 'fs'
import { basename } from 'path'
import { createWaveletAnalyzer } from '../src/audio/waveletAnalyzer.js'
import { magnitudeSpectrum, makeByteFreq, hann } from './fft.mjs'
import {
    spectralCentroid, spectralFlux, spectralRolloff, spectralSpread,
    spectralEntropy, spectralCrest, energy, bass, mids, treble, makeCalculateStats,
} from 'hypnosound'

const FRAME = 1024, HOP = 128, HISTORY = 500
const FFT_SIZE = 4096 // browser default; we window+FFT a 4096 buffer for the FFT path

const readPcm = (p) => { const b = readFileSync(p); return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4)) }

// FFT analyzers we care about (the spectral-shape + band features).
const FFT_FEATURES = {
    spectralCentroid, spectralRolloff, spectralSpread, spectralEntropy, spectralCrest, energy, bass, mids, treble,
}

const hannWin = hann(FFT_SIZE)

const runSignal = (samples) => {
    const wav = createWaveletAnalyzer(HISTORY)
    const toByte = makeByteFreq({ minDb: -100, maxDb: -30, smoothing: 0.4 })
    // stats for each FFT feature (zScore etc.) — mirror the live pipeline
    const fftStats = {}
    for (const k of Object.keys(FFT_FEATURES)) fftStats[k] = makeCalculateStats(HISTORY)

    const series = {}
    const push = (k, v) => (series[k] ??= []).push(v)

    const wbuf = new Float32Array(FRAME)       // wavelet window (1024)
    const fbuf = new Float32Array(FFT_SIZE)     // fft window (4096)
    let filled = 0, ffilled = 0
    let prevByte = null

    for (let pos = 0; pos + HOP <= samples.length; pos += HOP) {
        // slide both windows by HOP
        wbuf.copyWithin(0, HOP); wbuf.set(samples.subarray(pos, pos + HOP), FRAME - HOP)
        fbuf.copyWithin(0, HOP); fbuf.set(samples.subarray(pos, pos + HOP), FFT_SIZE - HOP)
        filled += HOP; ffilled += HOP
        if (filled < FRAME || ffilled < FFT_SIZE) continue

        // --- wavelet path ---
        const w = wav.analyze(wbuf)
        push('w_centroid', w.centroidStats.current)
        push('w_spread', w.spreadStats.current)
        push('w_band0Z', w.bandStats[0].zScore)
        push('w_band3', w.bandStats[3].current)
        push('w_band5Z', w.bandStats[5].zScore)
        push('w_bassHit', w.bassHit)
        push('w_bassZ', w.bassStats.zScore)

        // --- FFT path (windowed 4096 → magnitude → byte-freq → analyzers) ---
        const windowed = new Float32Array(FFT_SIZE)
        for (let i = 0; i < FFT_SIZE; i++) windowed[i] = fbuf[i] * hannWin[i]
        const mag = magnitudeSpectrum(windowed)
        const byte = toByte(mag)
        for (const [k, fn] of Object.entries(FFT_FEATURES)) {
            const val = k === 'spectralFlux' ? fn(byte, prevByte) : fn(byte)
            const st = fftStats[k](val)
            push(`f_${k}`, st.current)
            push(`f_${k}Z`, st.zScore)
        }
        prevByte = byte
    }
    return series
}

const files = process.argv.slice(2)
if (!files.length) { console.error('usage: node wavelet-fft-cross.mjs sig.pcm [...]'); process.exit(1) }

const agg = {}
for (const f of files) {
    const s = runSignal(readPcm(f))
    for (const [k, v] of Object.entries(s)) (agg[k] ??= []).push(...v)
}
const nFrames = Object.values(agg)[0]?.length ?? 0
console.log(`Cross-domain analysis: ${files.length} signals, ${nFrames} frames\n`)

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length
const corr = (xs, ys) => { const mx = mean(xs), my = mean(ys); let n = 0, dx = 0, dy = 0; for (let i = 0; i < xs.length; i++) { const a = xs[i] - mx, b = ys[i] - my; n += a * b; dx += a * a; dy += b * b } const d = Math.sqrt(dx * dy); return d < 1e-12 ? 0 : n / d }

const wKeys = Object.keys(agg).filter(k => k.startsWith('w_'))
const fKeys = Object.keys(agg).filter(k => k.startsWith('f_'))

// Cross-correlation matrix: wavelet (rows) × FFT (cols).
console.log('=== CROSS-CORRELATION (wavelet rows × FFT cols) ===')
process.stdout.write(''.padEnd(12))
fKeys.forEach(k => process.stdout.write(k.replace('f_', '').slice(0, 8).padStart(9)))
console.log()
for (const w of wKeys) {
    process.stdout.write(w.replace('w_', '').padEnd(12))
    for (const f of fKeys) process.stdout.write(corr(agg[w], agg[f]).toFixed(2).padStart(9))
    console.log()
}

// Highlight the most REDUNDANT (|r|>0.7, fuse for robustness) and most INDEPENDENT
// (|r|<0.15, combine for variety) cross-domain pairs.
const pairs = []
for (const w of wKeys) for (const f of fKeys) pairs.push({ w, f, r: corr(agg[w], agg[f]) })
console.log('\n=== REDUNDANT cross-domain pairs (|r|>0.7 — fuse for robust signals) ===')
pairs.filter(p => Math.abs(p.r) > 0.7).sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 10)
    .forEach(p => console.log(`  ${p.w.padEnd(12)} ~ ${p.f.padEnd(16)} r=${p.r.toFixed(2)}`))
console.log('\n=== INDEPENDENT cross-domain pairs (|r|<0.12 — combine for variety) ===')
pairs.filter(p => Math.abs(p.r) < 0.12 && !p.w.includes('Hit')).sort((a, b) => Math.abs(a.r) - Math.abs(b.r)).slice(0, 12)
    .forEach(p => console.log(`  ${p.w.padEnd(12)} ⊥ ${p.f.padEnd(16)} r=${p.r.toFixed(2)}`))
