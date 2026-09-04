// Audio-reactivity statistics for a visual, driven by a deterministic audio file (no mic needed).
//   node scripts/lab/react-stat.mjs "<query>" [secs=16] [device]
// Samples the canvas at ~10 Hz alongside the analyzer's features and reports how the picture follows
// the music: correlations of whole-frame / centre / corner luminance with energy and bass, the swing
// of each region, and the page meter's own numbers (motionVsEnergy, flicker, clip) when ?vj=1 is on.
// Interpretation: centre should follow bass strongly, corners should NOT (a quiet background).
import { chromium, devices } from 'playwright'
const [,, query = 'shader=redaphid/wip/lattice-bead-vj/satellites&controller=dodeca-bloom&image=images/beads/mon-hakkaku.png&satellites=6&wavelet=true', secsArg = '16', device] = process.argv
const secs = +secsArg
// FAKE MIC: headless Chromium has no audio device, so the page's audio setup fails and the visualizer never
// starts. Instead we hand Chromium a fake capture device that plays the test beat: the page then runs its
// normal microphone path, exactly as a phone does. Needs a 48 kHz 16-bit PCM WAV (FAKE_MIC env, or default).
const fakeMic = process.env.FAKE_MIC || 'C:/Users/HYPNOD~1/AppData/Local/Temp/claude/D--Projects-pc-lab-sub2/ff0d2913-98d5-4f34-9d63-20d7e9e1e714/scratchpad/beat48.wav'
const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fakeMic}`] })
const ctx = await br.newContext(device ? { ...devices[device] } : { viewport: { width: 900, height: 900 } })
const p = await ctx.newPage()
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
const url = `http://localhost:6969/?${query}&vj=1`
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2500)
const samples = await p.evaluate(async (secs) => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width = 96; g.height = 96; const x = g.getContext('2d')
  const rows = []
  const t0 = performance.now()
  while (performance.now() - t0 < secs * 1000) {
    x.drawImage(c, 0, 0, 96, 96)
    const d = x.getImageData(0, 0, 96, 96).data
    let all = 0, centre = 0, corner = 0, nc = 0, nk = 0
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const px = (i / 4) % 96, py = Math.floor(i / 4 / 96), dx = px - 48, dy = py - 48, r = Math.hypot(dx, dy)
      all += l
      if (r < 16) { centre += l; nc++ }
      if (r > 56) { corner += l; nk++ }
    }
    const f = window.cranes?.flattenFeatures?.() || {}
    rows.push({ t: +((performance.now() - t0) / 1000).toFixed(2), all: all / (96 * 96), centre: centre / nc, corner: corner / nk,
      energy: f.energyNormalized ?? null, bass: f.bassNormalized ?? null, energyRaw: f.energy ?? null })
    await new Promise(r => setTimeout(r, 100))
  }
  const meter = window.__vjMeter ? { s: window.__vjMeter.summary(secs), r: window.__vjMeter.residR(secs) } : null
  const f0 = window.cranes?.flattenFeatures?.() || {}
  const a = document.querySelector('audio')
  const diag = { cranes: !!window.cranes, nKeys: Object.keys(f0).length, sampleKeys: Object.keys(f0).filter(k => /^(energy|bass)/.test(k)).slice(0, 6), audio: a ? { paused: a.paused, t: +a.currentTime.toFixed(1), src: a.currentSrc.slice(-30), err: a.error?.code ?? null } : 'no <audio>' }
  return { rows, meter, diag }
}, secs)
await br.close()
const rows = samples.rows.filter(r => r.energy != null)
const corr = (a, b) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2 }
  return saa && sbb ? +(sab / Math.sqrt(saa * sbb)).toFixed(2) : null }
const swing = a => { const s = [...a].sort((x, y) => x - y); return +(s[Math.floor(s.length * 0.95)] - s[Math.floor(s.length * 0.05)]).toFixed(1) }
const col = k => rows.map(r => r[k])
const stat = {
  samples: rows.length, audioAlive: swing(col('energy')) > 0.1,
  energySwing: swing(col('energy')), bassSwing: swing(col('bass')),
  centreLumSwing: swing(col('centre')), cornerLumSwing: swing(col('corner')), frameLumSwing: swing(col('all')),
  corr_centre_bass: corr(col('centre'), col('bass')), corr_centre_energy: corr(col('centre'), col('energy')),
  corr_frame_energy: corr(col('all'), col('energy')), corr_corner_bass: corr(col('corner'), col('bass')),
  meter: samples.meter && { motionVsEnergy: samples.meter.s.motionVsEnergy, motionVsBass: samples.meter.s.motionVsBass, flicker: samples.meter.s.flicker, clip: samples.meter.s.clip, lum: samples.meter.s.lum, dark: samples.meter.s.dark, rResid: samples.meter.r?.rResid },
  errs: errs.slice(0, 3),
  diag: samples.diag,
}
console.log(JSON.stringify(stat))
