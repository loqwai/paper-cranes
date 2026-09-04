// Headless renderer for lattice-bead-vj/grid.frag. Everything stubbed; time pinned with ?time= unless PIN=0.
// usage: node scripts/lab/grid-shot.mjs <outPrefix> [frames=1] [gapMs=1500] [w=1200] [h=900] ["&extra=query"]
import { chromium } from 'playwright'
const [,, outPrefix = 'grid', framesArg = '1', gapArg = '1500', wArg = '1200', hArg = '900', extra = ''] = process.argv
const frames = +framesArg, gap = +gapArg, W = +wArg, H = +hArg
const PORT = process.env.PORT || 6969
const PIN = process.env.PIN === '0' ? '' : '&time=8'
const IMG = process.env.IMG || 'mon-hakkaku'
const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/grid&noaudio=true&wavelet=true`
  + `&image=images/beads/${IMG}.png&seed=0.618&seed2=0.755&seed3=0.31&seed4=0.47` + PIN
  + (PIN ? '&flowPhase=3.0&spinPhase=2.0&huePhase=1.0&morphPhase=1.5&evoPhase=6' : '&controller=wavelet-ease') + '&quietGate=1'
  + '&energySpring=0.4&waveletBassSpring=0.45&waveletBand1Spring=0.4&waveletBand2Spring=0.35&waveletBand3Spring=0.35'
  + '&waveletBand4Spring=0.3&waveletBand5Spring=0.3&waveletCentroidSpring=0.4&melodyFlow=0.3'
  + '&pitchClassMedian=0.25&spectralCentroidMedian=0.19&spectralSpreadMedian=0.26&spectralEntropyMedian=0.87'
  + '&navX=0&navY=0&navZoom=1'
  + extra
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: W, height: H } })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2500)
const out = []
for (let i = 1; i <= frames; i++) {
  const path = `${outPrefix}-${i}.jpg`
  await p.screenshot({ path, type: 'jpeg', quality: 88 })
  out.push(path)
  if (i < frames) await p.waitForTimeout(gap)
}
const st = await p.evaluate(() => {
  const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 240; g.height = 180
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 240, 180); const d = x.getImageData(0, 0, 240, 180).data
  let s = 0, n = 0, dark = 0, bright = 0, white = 0
  for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; n++; if (l < 20) dark++; if (l > 50) bright++; if (l > 235) white++ }
  return { lum: +(s / n).toFixed(1), dark: +(100 * dark / n).toFixed(1), bright: +(100 * bright / n).toFixed(1), white: +(100 * white / n).toFixed(2), canvas: c.width + 'x' + c.height }
})
await br.close()
console.log(JSON.stringify({ out, st, errs: errs.slice(0, 3), url }))
