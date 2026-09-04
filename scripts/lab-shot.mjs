// Headless A/B renders of lattice-bead-vj/lab.frag with stubbed audio. Usage:
//   node scripts/lab-shot.mjs base= rings='&labRings=1' ...   (name=extraQuery pairs)
// Env: W,H viewport (default 800x450), OUT dir, PORT (default 6969), IMG bead image name.
import { chromium } from 'playwright'
const PORT = process.env.PORT || 6969
const OUT = process.env.OUT || 'C:/Users/HYPNOD~1/AppData/Local/Temp/claude/D--Projects-pc-lab-sub2/ff0d2913-98d5-4f34-9d63-20d7e9e1e714/scratchpad'
const IMG = process.env.IMG || 'mon-hakkaku'
const W = +(process.env.W || 800), H = +(process.env.H || 450)
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/lab&noaudio=true&image=images/beads/${IMG}.png`
  + '&knob_161=1&knob_168=1.0&knob_169=0.60&legible=1&navZoom0=0.14&controller=lattice-nav&controller=lattice-controls'
  + '&quietGate=1&energySpring=0.5&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.4&waveletBand3Spring=0.4'
  + '&waveletBand4Spring=0.3&waveletBand5Spring=0.3&waveletCentroidSpring=0.4&melodyFlow=0.3&spectralCrestSmooth=0.3'
  + '&flowPhase=3.1&morphPhase=1.7&evoPhase=6&seed=0.618&seed2=0.755&seed3=0.41&seed4=0.27'
const V = process.argv.slice(2).map(a => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)] })
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: W, height: H } })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
console.log(`name            lum   sd    dark<20  bright>50   (${W}x${H}, ${IMG})`)
for (const [name, q] of V) {
  await p.goto(BASE + q, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 15000 })
  await p.waitForTimeout(+(process.env.SETTLE || 2600))
  const st = await p.evaluate(() => {
    const c = document.querySelector('canvas')
    const g = document.createElement('canvas'); g.width = 240; g.height = 135
    const x = g.getContext('2d'); x.drawImage(c, 0, 0, 240, 135)
    const d = x.getImageData(0, 0, 240, 135).data
    let s = 0, s2 = 0, n = 0, dark = 0, bright = 0
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; s2 += l * l; n++
      if (l < 20) dark++; if (l > 50) bright++
    }
    const m = s / n
    return { lum: m.toFixed(1), sd: Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1), dark: (100 * dark / n).toFixed(1), bright: (100 * bright / n).toFixed(1), cw: c.width, ch: c.height }
  })
  const file = `${OUT}/lab-${name}.png`
  await p.locator('canvas').screenshot({ path: file })
  console.log(`${name.padEnd(15)} ${st.lum.padStart(5)} ${st.sd.padStart(5)}  ${st.dark.padStart(6)}%  ${st.bright.padStart(7)}%   canvas ${st.cw}x${st.ch}  -> ${file}`)
}
if (errs.length) console.log('console errors:', errs.slice(0, 5))
await br.close()
