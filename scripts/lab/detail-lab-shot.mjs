// detail-lab-shot.mjs - deterministic stills of lattice-bead-vj/detail-lab.frag.
// EVERYTHING pinned: ?time= holds iTime (index.js), noaudio kills the analyser, and every
// controller-output uniform the shader declares is passed as a URL param (URL params win).
// Usage: node scripts/lab/detail-lab-shot.mjs <name> [extraQuery] [--tall] [--wait=ms] [--twice]
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const PORT = process.env.PORT || 6969
const SHADER = process.env.SHADER || 'redaphid/wip/lattice-bead-vj/detail-lab'
const OUT = process.env.OUT || 'C:/Users/HYPNOD~1/AppData/Local/Temp/claude/D--Projects-pc-lab-sub2/ff0d2913-98d5-4f34-9d63-20d7e9e1e714/scratchpad'
const [name = 'shot', extra = '', ...flags] = process.argv.slice(2)
const tall = flags.includes('--tall')
const twice = flags.includes('--twice')
const waitMs = +(flags.find(f => f.startsWith('--wait='))?.split('=')[1] ?? 2500)

const PIN = {
  noaudio: 'true', fullscreen: 'true', time: 8, seed: 0.618, seed2: 0.755, seed3: 0.4,
  image: 'images/beads/mon-hakkaku.png', wavelet: 'true',
  // recognition recipe (4.md)
  knob_161: 1, knob_167: 0.6, knob_168: 1.0, knob_169: 0.60, legible: 1, navZoom: 0.14, navX: 0, navY: 0,
  // wavelet-ease springs - a mid-energy passage
  waveletBassSpring: 0.4, waveletBand1Spring: 0.4, waveletBand2Spring: 0.4, waveletBand3Spring: 0.4,
  waveletBand4Spring: 0.4, waveletBand5Spring: 0.4, waveletCentroidSpring: 0.4, energySpring: 0.4,
  melodyFlow: 0.3, spectralCrestSmooth: 0.5, spectralRoughnessSmooth: 0.5, spectralEntropySmooth: 0.6,
  spectralSpreadRSquared: 0.15, quietGate: 1, wubDepth: 0.3, bassNoteFlow: 0.5,
  evoWarp: 0.3, evoPlasma: 0.3, sectionMode: 1, sectionMix: 1,
  // monotonic phases, posed
  divePhase: 3.0, flowPhase: 3.0, morphPhase: 3.0, evoPhase: 6, flybyZoom: 0, warpGrow: 0, paletteShift: 0,
  // medians
  spectralSkewMedian: 0.5, spectralEntropyMedian: 0.5, spectralKurtosisMedian: 0.5, spectralSpreadMedian: 0.5, pitchClassMedian: 0.5,
  // page-level params
  autofly: 0, detail: 0.75, spec: 0.7, sweep: 0.6, breathe: 0.85, arrive: 0.85, negative: 0, theme: 0,
}
const ex = Object.fromEntries(new URLSearchParams(extra.replace(/^&/, '')))
const url = `http://localhost:${PORT}/?shader=${SHADER}&` + Object.entries({ ...PIN, ...ex }).map(([k, v]) => `${k}=${v}`).join('&')

const stats = async (p) => p.evaluate(() => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width = 240; g.height = 240
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 240, 240)
  const d = x.getImageData(0, 0, 240, 240).data
  let s = 0, s2 = 0, n = 0, lit = 0, bright = 0, white = 0, mn = 255
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    s += l; s2 += l * l; n++; if (l > 20) lit++; if (l > 50) bright++; if (l > 235) white++; if (l < mn) mn = l
  }
  const m = s / n
  return { lum: +m.toFixed(1), sd: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1),
           lit: +(100 * lit / n).toFixed(1), bright: +(100 * bright / n).toFixed(1), white: +(100 * white / n).toFixed(2),
           minLum: +mn.toFixed(1), canvas: c.width + 'x' + c.height }
})

const run = async () => {
  const br = await chromium.launch()
  const vp = tall ? { width: 900, height: 1200 } : { width: 1200, height: 900 }
  const p = await br.newPage({ viewport: vp })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
  await p.goto(url, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 15000 })
  await p.waitForTimeout(waitMs)
  const a = await stats(p)
  const fa = `${OUT}/${name}${tall ? '-tall' : ''}.png`
  await p.screenshot({ path: fa })
  let b = null
  if (twice) {
    await p.waitForTimeout(3000)
    b = await stats(p)
    await p.screenshot({ path: `${OUT}/${name}${tall ? '-tall' : ''}-b.png` })
  }
  await br.close()
  console.log(JSON.stringify({ name, vp: `${vp.width}x${vp.height}`, a, b, errs: errs.slice(0, 3) }))
  console.log(fa)
}
run().catch(e => { console.error(e); process.exit(1) })
