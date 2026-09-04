// Headless renderer for lattice-bead-vj/chroma.frag: audio stubbed, wavelet=true, optional pinned time.
// usage: node scripts/lab/chroma-shot.mjs <outPrefix> [frames=1] [gapMs=1500]   env: PIN=1 (time=8), EXTRA='&k=v', IMG=mon-tomoe
import { chromium } from 'playwright'
const [,, outPrefix = 'chroma', framesArg = '1', gapArg = '1500'] = process.argv
const frames = +framesArg, gap = +gapArg
const PORT = process.env.PORT || 6969
const img = process.env.IMG || 'mon-hakkaku'
const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/chroma&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls`
  + `&image=images/beads/${img}.png&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=${process.env.NAVZ || "0.14"}&wavelet=true&noaudio=true&onset_refractory_ms=380`
  + '&seed=0.618&seed2=0.755&seed3=0.31&seed4=0.47'
  + '&quietGate=1&energySpring=0.4&waveletBassSpring=0.45&waveletBand1Spring=0.4&waveletBand2Spring=0.35&waveletBand3Spring=0.35'
  + '&waveletBand4Spring=0.3&waveletBand5Spring=0.3&waveletCentroidSpring=0.4&melodyFlow=0.3&spectralCrestSmooth=0.3&spectralRoughnessSmooth=0.3&spectralEntropySmooth=0.5'
  + '&spectralSpreadMedian=0.26&pitchClassMedian=0.4&spectralEntropyMedian=0.6&spectralCentroidMedian=0.3&spectralSkewMedian=0.5&spectralKurtosisMedian=0.5'
  + (process.env.PIN ? '&time=8&flowPhase=3.1&morphPhase=1.7&evoPhase=6&spinPhase=2.2&huePhase=0.8&bTime=40' : '')
  + (process.env.EXTRA || '')
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: 1100, height: 900 } })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2600)
const out = []
for (let i = 1; i <= frames; i++) {
  const path = `${outPrefix}-${i}.jpg`
  await p.screenshot({ path, type: 'jpeg', quality: 85 })
  out.push(path)
  if (i < frames) await p.waitForTimeout(gap)
}
const st = await p.evaluate(() => {
  const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 220; g.height = 180
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 220, 180); const d = x.getImageData(0, 0, 220, 180).data
  let s = 0, n = 0, dark = 0, bright = 0, white = 0
  for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; n++; if (l < 20) dark++; if (l > 50) bright++; const mx = Math.max(d[i], d[i+1], d[i+2]), mn = Math.min(d[i], d[i+1], d[i+2]); if (mx > 200 && mx - mn < 40) white++ }
  return { lum: +(s / n).toFixed(1), dark: +(100 * dark / n).toFixed(1), bright: +(100 * bright / n).toFixed(1), white: +(100 * white / n).toFixed(2) }
})
await br.close()
console.log(JSON.stringify({ out, st, errs: errs.slice(0, 3) }))
