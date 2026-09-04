// Headless monitor for the live VJ shader: N frames, real motion (phases run), audio stubbed.
// usage: node scripts/lab/live-shot.mjs <outPrefix> [frames=4] [gapMs=1500] [shader=redaphid/wip/lattice-bead-vj/1]
import { chromium } from 'playwright'
const [,, outPrefix = 'live', framesArg = '4', gapArg = '1500', shader = 'redaphid/wip/lattice-bead-vj/1'] = process.argv
const frames = +framesArg, gap = +gapArg
const PORT = process.env.PORT || 6969
const url = `http://localhost:${PORT}/?shader=${shader}&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls`
  + '&image=images/beads/mon-hakkaku.png&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=0.14&wavelet=true&noaudio=true'
  + '&knob_173=0.10&knob_174=0.55&knob_175=0.25&knob_164=0.35'
  + '&quietGate=1&energySpring=0.4&waveletBassSpring=0.45&waveletBand1Spring=0.4&waveletBand2Spring=0.35&waveletBand3Spring=0.35'
  + '&waveletBand4Spring=0.3&waveletBand5Spring=0.3&waveletCentroidSpring=0.4&melodyFlow=0.3&spectralCrestSmooth=0.3&spectralRoughnessSmooth=0.3&spectralEntropySmooth=0.5'
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
  out.push(path)
  if (i < frames) await p.waitForTimeout(gap)
}
await br.close()
console.log(JSON.stringify({ out, errs: errs.slice(0, 3) }))
