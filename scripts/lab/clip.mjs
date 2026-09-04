// Record a short webm clip of a visual, headless, with the synthetic beat driving the features.
//   node scripts/lab/clip.mjs "<query>" <out.webm> [secs=10] [mode=dodeca|wavelet] [size=720]
// Same synthetic track as react-stat.mjs: 128 BPM kicks + hats, a 2 s breakdown at 8 s, a DROP at 10 s.
// Use secs >= 13 to include the drop. Output goes to journals/clips/ unless an absolute path is given.
import { chromium } from 'playwright'
import { mkdirSync, renameSync, existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
const [,, query, outArg = 'journals/clips/clip.webm', secsArg = '10', mode = 'dodeca', sizeArg = '720'] = process.argv
if (!query) { console.error('usage: node scripts/lab/clip.mjs "<query>" <out.webm> [secs] [mode] [size]'); process.exit(2) }
const secs = +secsArg, size = +sizeArg, out = resolve(outArg), DROP = +(process.env.DROP_AT || 10)   // DROP_AT: seconds into the clip the drop lands (breakdown = the 2 s before)
mkdirSync(dirname(out), { recursive: true })
const tmpDir = resolve('journals/clips/.tmp')
const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: size, height: size }, recordVideo: { dir: tmpDir, size: { width: size, height: size } } })
const p = await ctx.newPage()
await p.goto(`http://localhost:6969/?${query}&noaudio=true`, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(1500)
await p.evaluate(async ({ secs, mode, DROP }) => {
  const BEAT = 60 / 128
  const music = t => {
    const b = Math.floor(t / BEAT), tb = t - b * BEAT
    const breakdown = t >= DROP - 2 && t < DROP, drop = t >= DROP, dropAge = t - DROP
    const kick = breakdown ? 0 : Math.exp(-tb / 0.12) * (drop ? 1.0 : 0.8)
    const hat = tb > BEAT / 2 ? Math.exp(-(tb - BEAT / 2) / 0.05) : 0
    const bass = breakdown ? 0.08 : 0.15 + 0.8 * kick
    const energy = breakdown ? 0.12 : (drop ? 0.35 : 0.25) + 0.6 * kick
    const spike = drop && dropAge < 1.2 ? 1.5 * Math.exp(-dropAge / 0.5) : 0.05 * Math.sin(t * 7)
    return { bass, energy, mids: 0.4 + 0.15 * Math.sin(t * 0.9) + 0.2 * kick, treble: 0.2 + 0.6 * hat, spike, flux: drop && dropAge < 1 ? 1.2 : 0.1 * kick, kick }
  }
  const feats = t => {
    const m = music(t)
    if (mode === 'wavelet') return {
      quietGate: 1, energySpring: m.energy, waveletBassSpring: m.bass, waveletBand1Spring: m.bass * 0.9, waveletBand2Spring: m.mids,
      waveletBand3Spring: m.mids * 0.8, waveletBand4Spring: m.treble * 0.7, waveletBand5Spring: m.treble, waveletCentroidSpring: 0.4 + 0.2 * m.treble,
      melodyFlow: 0.3, spectralCrestSmooth: 0.3 + 0.3 * m.treble, spectralRoughnessSmooth: 0.3, spectralEntropySmooth: 0.5,
      bassLive: m.bass, trebLive: m.treble, midsLive: m.mids, wavelet_bassHit: m.kick > 0.9 ? 1 : 0, wavelet_punch: m.kick,
      sectionMode: t >= DROP ? 1 : 0, sectionMix: t >= DROP ? Math.min(1, (t - DROP) / 4) : 0,
      pitchClassMedian: 0.25, spectralCentroidMedian: 0.19, spectralEntropyMedian: 0.87, spectralSpreadMedian: 0.26,
    }
    return {
      bassNormalized: m.bass, energyNormalized: m.energy, midsNormalized: m.mids, trebleNormalized: m.treble,
      spectralEntropyNormalized: 0.5 + 0.2 * m.treble, spectralCentroidNormalized: 0.3 + 0.3 * m.treble, spectralFluxNormalized: m.flux,
      energyZScore: m.spike, bassZScore: m.spike * 0.9, spectralFluxZScore: m.flux, pitchClassNormalized: 0.25 + 0.1 * Math.sin(t * 0.2),
      pitchClassMedian: 0.25, spectralCentroidMedian: 0.19, spectralEntropyMedian: 0.87, spectralSpreadMedian: 0.26,
    }
  }
  const t0 = performance.now()
  await new Promise(done => {
    const iv = setInterval(() => {
      const t = (performance.now() - t0) / 1000
      if (t > secs) { clearInterval(iv); done(); return }
      Object.assign(window.cranes.manualFeatures, feats(t))
    }, 33)
  })
}, { secs, mode, DROP })
const video = p.video()
await ctx.close()
const path = await video.path()
await br.close()
if (existsSync(out)) renameSync(out, out.replace(/\.webm$/, `.prev-${Date.now()}.webm`))
renameSync(path, out)
console.log(JSON.stringify({ out, kb: Math.round(statSync(out).size / 1024), secs, mode }))
