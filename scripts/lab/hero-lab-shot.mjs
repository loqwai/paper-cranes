// Headless still of hero-lab.frag with EVERYTHING pinned: no audio, every declared uniform and every
// raw feature the shader references passed as a URL param, iTime held by ?time=. Any difference
// between two shots is a shader change, not the world moving.
//   node scripts/lab/hero-lab-shot.mjs --out shot.png [--w 1200 --h 900] [--shader path] [--extra "&k=v"]
//   node scripts/lab/hero-lab-shot.mjs --pin           # two readbacks 3 s apart, prints % pixels changed
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d }
const has = k => process.argv.includes('--' + k)
const PORT = process.env.PORT || 6969
const shader = arg('shader', 'redaphid/wip/lattice-bead-vj/hero-lab')
const W = +arg('w', 1200), H = +arg('h', 900)
const out = arg('out', 'hero-lab.png')

// every uniform the shader declares + every raw feature it references, stubbed to a mid value
const src = readFileSync(`shaders/${shader}.frag`, 'utf8').replace(/\/\/.*$/gm, '')
const declared = [...src.matchAll(/^\s*uniform\s+\w+\s+(\w+)/gm)].map(m => m[1])
const feats = new Set([...src.matchAll(/\b((?:bass|mids|treble|energy|pitchClass|beat|spectral[A-Z]\w*?|wavelet_\w+)(?:Normalized|ZScore|Median|Mean|Min|Max|StandardDeviation|Slope|Intercept|RSquared)?)\b/g)].map(m => m[1]))
const stub = {
  waveletBassSpring: 0.40, waveletBand1Spring: 0.40, waveletBand2Spring: 0.40, waveletBand3Spring: 0.35,
  waveletBand4Spring: 0.35, waveletBand5Spring: 0.30, waveletCentroidSpring: 0.45, energySpring: 0.45,
  melodyFlow: 0.30, spectralCrestSmooth: 0.40, spectralRoughnessSmooth: 0.30, spectralEntropySmooth: 0.4,
  flowPhase: 3.0, morphPhase: 1.7, quietGate: 1, evoWarp: 0.3, evoPlasma: 0.3, wubDepth: 0.3,
  bassNoteFlow: 0.5, sectionMode: 1, sectionMix: 1, evoPhase: 6, navX: 0, navY: 0, navZoom: 0.218,
  flybyZoom: 1, paletteShift: 0.2, warpGrow: 0.3,
}
const val = n => n in stub ? stub[n] : /ZScore|Slope|Intercept/.test(n) ? 0.1 : /Normalized|Median|Mean/.test(n) ? 0.45
  : /RSquared|StandardDeviation/.test(n) ? 0.2 : /Median$/.test(n) ? 0.5 : n === 'beat' ? 0 : 0.3
const names = [...new Set([...declared, ...feats])].filter(n => !/^(iTime|iFrame|iResolution|time|resolution|knob_\d+|seed\d?|image|prevFrame|initialFrame|iChannel\d)$/.test(n))
const q = names.map(n => `&${n}=${val(n)}`).join('')
const url = `http://localhost:${PORT}/?shader=${shader}&image=images/beads/mon-hakkaku.png&noaudio=true&wavelet=true&time=8`
  + '&seed=0.11&seed2=0.22&seed3=0.33&seed4=0.44&navZoom0=0.218&knob_1=0.429&knob_134=0.507' + q + arg('extra', '')

const stats = () => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width = c.width; g.height = c.height
  const x = g.getContext('2d'); x.drawImage(c, 0, 0)
  const d = x.getImageData(0, 0, g.width, g.height).data
  let s = 0, lit = 0, bri = 0, n = 0, mn = 999
  for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; n++; if (l > 20) lit++; if (l > 50) bri++; if (l < mn) mn = l }
  const s15 = document.createElement('canvas'); s15.width = Math.round(g.width * 0.15); s15.height = Math.round(g.height * 0.15)
  s15.getContext('2d').drawImage(c, 0, 0, s15.width, s15.height)
  return { w: c.width, h: c.height, meanLum: +(s / n).toFixed(1), lit20: +(100 * lit / n).toFixed(1), bright50: +(100 * bri / n).toFixed(1), min: +mn.toFixed(1), small: s15.toDataURL('image/png') }
}
const pixels = () => { const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 300; g.height = 300; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 300, 300); return Array.from(x.getImageData(0, 0, 300, 300).data) }

const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: W, height: H } })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2600)
if (has('pin')) {
  const a = await p.evaluate(pixels); await p.waitForTimeout(3000); const b = await p.evaluate(pixels)
  let diff = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8 || Math.abs(a[i + 1] - b[i + 1]) > 8 || Math.abs(a[i + 2] - b[i + 2]) > 8) diff++
  console.log(`pin test: ${(100 * diff / (a.length / 4)).toFixed(2)}% of pixels changed over 3 s (0 = pinned)`)
} else {
  const st = await p.evaluate(stats)
  await p.screenshot({ path: out, type: 'png' })
  writeFileSync(out.replace(/\.png$/, '-15pct.png'), Buffer.from(st.small.split(',')[1], 'base64'))
  delete st.small
  console.log(JSON.stringify({ out, ...st }))
}
console.log('stubbed', names.length, 'uniforms; console errors:', errs.length ? errs.slice(0, 3) : 'none')
await br.close()
