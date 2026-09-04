// Audio-reactivity statistics for a visual, headless and deterministic.
//   node scripts/lab/react-stat.mjs "<query>" [mode=dodeca|wavelet] [secs=16] [device]
// Headless Chromium has no audio stack, so instead of a mic the page's manual-feature override is driven
// with a synthetic track: 128 BPM kicks + offbeat hats for 8 s, a 2 s breakdown, then a DROP at 10 s
// (z-score spikes) and a louder groove. mode=dodeca injects analyzer features (what dodeca-bloom reads);
// mode=wavelet injects wavelet-ease OUTPUTS (springs, gate; phases advance on their own).
// Samples the canvas inside requestAnimationFrame at ~10 Hz: whole-frame, centre disc (the hero) and
// corner ring (the background) luminance, alongside the features. Reports swings, correlations with bass,
// and the drop response. Good: centre follows bass strongly, corners barely move.
import { chromium, devices } from 'playwright'
const [,, query = 'shader=redaphid/wip/lattice-bead-vj/satellites&controller=dodeca-bloom&image=images/beads/mon-hakkaku.png&satellites=6&wavelet=true', mode = 'dodeca', secsArg = '16', device] = process.argv
const secs = +secsArg
const br = await chromium.launch()
const ctx = await br.newContext(device ? { ...devices[device] } : { viewport: { width: 900, height: 900 } })
const p = await ctx.newPage()
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
p.on('pageerror', e => errs.push(e.message.slice(0, 140)))
await p.goto(`http://localhost:6969/?${query}&noaudio=true&vj=1`, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2500)
const out = await p.evaluate(async ({ secs, mode }) => {
  const BEAT = 60 / 128
  const music = t => {
    const b = Math.floor(t / BEAT), tb = t - b * BEAT
    const breakdown = t >= 8 && t < 10, drop = t >= 10, dropAge = t - 10
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
      sectionMode: t >= 10 ? 1 : 0, sectionMix: t >= 10 ? Math.min(1, (t - 10) / 4) : 0,
      pitchClassMedian: 0.25, spectralCentroidMedian: 0.19, spectralEntropyMedian: 0.87, spectralSpreadMedian: 0.26,
    }
    return {
      bassNormalized: m.bass, energyNormalized: m.energy, midsNormalized: m.mids, trebleNormalized: m.treble,
      spectralEntropyNormalized: 0.5 + 0.2 * m.treble, spectralCentroidNormalized: 0.3 + 0.3 * m.treble, spectralFluxNormalized: m.flux,
      energyZScore: m.spike, bassZScore: m.spike * 0.9, spectralFluxZScore: m.flux, pitchClassNormalized: 0.25 + 0.1 * Math.sin(t * 0.2),
      pitchClassMedian: 0.25, spectralCentroidMedian: 0.19, spectralEntropyMedian: 0.87, spectralSpreadMedian: 0.26,
    }
  }
  const c = document.querySelector('canvas'), g = document.createElement('canvas'); g.width = 96; g.height = 96
  const x = g.getContext('2d'), rows = [], t0 = performance.now(); let last = -1
  const drive = setInterval(() => Object.assign(window.cranes.manualFeatures, feats((performance.now() - t0) / 1000)), 33)
  await new Promise(done => {
    const tick = now => {
      const t = (now - t0) / 1000
      if (t > secs) { clearInterval(drive); done(); return }
      if (now - last >= 95) {
        last = now
        x.drawImage(c, 0, 0, 96, 96)
        const d = x.getImageData(0, 0, 96, 96).data
        let all = 0, ce = 0, co = 0, nc = 0, nk = 0
        for (let i = 0; i < d.length; i += 4) {
          const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          const px = (i / 4) % 96, py = Math.floor(i / 4 / 96), r = Math.hypot(px - 48, py - 48)
          all += l; if (r < 16) { ce += l; nc++ } if (r > 56) { co += l; nk++ }
        }
        const f = window.cranes.flattenFeatures(), m = music(t)
        rows.push({ t: +t.toFixed(2), all: all / 9216, centre: ce / nc, corner: co / nk, bass: m.bass, energy: m.energy, pump: f.bass_pump ?? f.bassLive ?? null, glow: f.drop_glow ?? null })
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  const meter = window.__vjMeter ? { ...window.__vjMeter.summary(secs), rResid: window.__vjMeter.residR(secs)?.rResid } : null
  return { rows, meter }
}, { secs, mode })
await br.close()
const R = out.rows, col = k => R.map(r => r[k])
const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2 }
  return saa && sbb ? +(sab / Math.sqrt(saa * sbb)).toFixed(2) : null }
const swing = a => { const s = [...a].sort((x, y) => x - y); return +(s[Math.floor(s.length * 0.95)] - s[Math.floor(s.length * 0.05)]).toFixed(1) }
const mean = a => a.length ? +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) : null
const win = (k, a, b) => mean(R.filter(r => r.t >= a && r.t < b).map(r => r[k]))
const stat = {
  samples: R.length, errs: errs.slice(0, 3),
  lum: { frame: mean(col('all')), centre: mean(col('centre')), corner: mean(col('corner')) },
  swing: { frame: swing(col('all')), centre: swing(col('centre')), corner: swing(col('corner')) },
  beatFollow: { centre_vs_bass: corr(col('centre'), col('bass')), frame_vs_bass: corr(col('all'), col('bass')), corner_vs_bass: corr(col('corner'), col('bass')) },
  drop: { centreBefore: win('centre', 8, 10), centreAfter: win('centre', 10, 12), cornerBefore: win('corner', 8, 10), cornerAfter: win('corner', 10, 12) },
  pumpSwing: R[0]?.pump != null ? swing(col('pump')) : null, glowMax: R[0]?.glow != null ? +Math.max(...col('glow')).toFixed(2) : null,
  meter: out.meter && { motionVsBass: out.meter.motionVsBass, motionVsEnergy: out.meter.motionVsEnergy, flicker: out.meter.flicker, clip: out.meter.clip, lumMin: out.meter.lumMin, lumMax: out.meter.lumMax },
}
console.log(JSON.stringify(stat))
