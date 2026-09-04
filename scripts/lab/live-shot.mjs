// Headless monitor for the live VJ shader: N frames, real motion (phases run), audio stubbed.
// usage: node scripts/lab/live-shot.mjs <outPrefix> [frames=4] [gapMs=1500] [shader=redaphid/wip/lattice-bead-vj/1]
import { chromium } from 'playwright'
const [,, outPrefix = 'live', framesArg = '4', gapArg = '1500', shader = 'redaphid/wip/lattice-bead-vj/1'] = process.argv
const frames = +framesArg, gap = +gapArg
const PORT = process.env.PORT || 6969
const url = `http://localhost:${PORT}/?shader=${shader}&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls`
  + '&image=images/beads/mon-hakkaku.png&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=0.14&wavelet=true&noaudio=true'
  + '&quietGate=1&energySpring=0.4&waveletBassSpring=0.45&waveletBand1Spring=0.4&waveletBand2Spring=0.35&waveletBand3Spring=0.35'
  + '&waveletBand4Spring=0.3&waveletBand5Spring=0.3&waveletCentroidSpring=0.4&melodyFlow=0.3&spectralCrestSmooth=0.3&spectralRoughnessSmooth=0.3&spectralEntropySmooth=0.5'
  + '&seed=0.5&seed2=0.5&seed3=0.5'
  + '&pitchClassMedian=0.25&spectralCentroidMedian=0.19&spectralEntropyMedian=0.87&spectralSpreadMedian=0.26&pitchClassMean=0.3'
  + (process.env.EXTRA || '')
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: 1100, height: 900 } })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2500)
const out = []
for (let i = 1; i <= frames; i++) {
  const path = `${outPrefix}-${i}.jpg`
  await p.screenshot({ path, type: 'jpeg', quality: 85 })
  const lum = await p.evaluate(() => {
    const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 160; g.height = 160
    const x = g.getContext('2d'); x.drawImage(c, 0, 0, 160, 160); const d = x.getImageData(0, 0, 160, 160).data
    let s = 0, n = 0; for (let k = 0; k < d.length; k += 4) { s += 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]; n++ }
    return +(s / n).toFixed(1)
  })
  out.push({ path, lum })
  if (i < frames) await p.waitForTimeout(gap)
}
await br.close()
console.log(JSON.stringify({ out, errs: errs.slice(0, 3) }))
