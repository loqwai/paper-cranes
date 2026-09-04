// Headless still with EVERYTHING pinned: no audio, every declared uniform and every raw feature the
// shader references passed as a URL param, iTime held by ?time=. Differences between shots are
// shader changes, not the world moving.
//   node scripts/lab/hero-lab-shot.mjs --out shot.png [--shader path] [--t 8] [--w 1200 --h 900]
//                                      [--set "k=v&k2=v2"]  (overrides stubs)  [--extra "&raw"]
//   node scripts/lab/hero-lab-shot.mjs --pin      # two readbacks 3 s apart, % pixels changed
// Stats: meanLum, lit>20 %, bright>50 %, min, rough = exterior high-frequency energy (mean |lum - 3x3 mean|
// outside the central hero disc) — the speckle needle.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d }
const has = k => process.argv.includes('--' + k)
const PORT = process.env.PORT || 6969
const shader = arg('shader', 'redaphid/wip/lattice-bead-vj/2')
const W = +arg('w', 1200), H = +arg('h', 900), T = arg('t', '8')
const out = arg('out', 'hero-lab.png')

const src = readFileSync(`shaders/${shader}.frag`, 'utf8').replace(/\/\/.*$/gm, '')
const declared = [...src.matchAll(/^\s*uniform\s+\w+\s+(\w+)/gm)].map(m => m[1])
const feats = new Set([...src.matchAll(/\b((?:bass|mids|treble|energy|pitchClass|beat|spectral[A-Z]\w*?|wavelet_\w+)(?:Normalized|ZScore|Median|Mean|Min|Max|StandardDeviation|Slope|Intercept|RSquared)?)\b/g)].map(m => m[1]))
const stub = {
  waveletBassSpring: 0.40, waveletBand1Spring: 0.40, waveletBand2Spring: 0.40, waveletBand3Spring: 0.35,
  waveletBand4Spring: 0.35, waveletBand5Spring: 0.30, waveletCentroidSpring: 0.45, energySpring: 0.45,
  melodyFlow: 0.30, spectralCrestSmooth: 0.40, spectralRoughnessSmooth: 0.30, spectralEntropySmooth: 0.4,
  flowPhase: 3.0, morphPhase: 1.7, quietGate: 1, evoWarp: 0.3, evoPlasma: 0.3, wubDepth: 0.3,
  bassNoteFlow: 0.5, sectionMode: 1, sectionMix: 1, evoPhase: 6, navX: 0, navY: 0, navZoom: 0.218,
  flybyZoom: 1, paletteShift: 0.2, warpGrow: 0.3, knob_1: 0.429, knob_134: 0.507,
  seed: 0.11, seed2: 0.22, seed3: 0.33, seed4: 0.44,
}
const val = n => n in stub ? stub[n] : /ZScore|Slope|Intercept/.test(n) ? 0.1 : /Normalized|Median|Mean/.test(n) ? 0.45
  : /RSquared|StandardDeviation/.test(n) ? 0.2 : n === 'beat' ? 0 : 0.3
const skip = /^(iTime|iFrame|iResolution|time|resolution|image|prevFrame|initialFrame|iChannel\d)$/
const names = new Set([...declared, ...feats, ...Object.keys(stub)].filter(n => !skip.test(n)))
const over = Object.fromEntries((arg('set', '') || '').split('&').filter(Boolean).map(kv => kv.split('=')))
const params = {}
for (const n of names) params[n] = val(n)
Object.assign(params, over)
const q = Object.entries(params).map(([k, v]) => `&${k}=${v}`).join('')
const url = `http://localhost:${PORT}/?shader=${shader}&image=images/beads/mon-hakkaku.png&noaudio=true&wavelet=true&time=${T}` + q + arg('extra', '')

const stats = () => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width = c.width; g.height = c.height
  const x = g.getContext('2d'); x.drawImage(c, 0, 0)
  const W = g.width, Hh = g.height, d = x.getImageData(0, 0, W, Hh).data
  const L = new Float32Array(W * Hh)
  let s = 0, lit = 0, bri = 0, n = 0, mn = 999
  for (let i = 0, j = 0; i < d.length; i += 4, j++) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; L[j] = l; s += l; n++; if (l > 20) lit++; if (l > 50) bri++; if (l < mn) mn = l }
  // exterior roughness: outside a central disc of radius 0.34*min(W,H) (covers the hero + halo)
  const cx = W / 2, cy = Hh / 2, r2 = Math.pow(0.34 * Math.min(W, Hh), 2)
  let rs = 0, rn = 0
  for (let y = 1; y < Hh - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
    if ((xx - cx) ** 2 + (y - cy) ** 2 < r2) continue
    const i = y * W + xx
    const m = (L[i - W - 1] + L[i - W] + L[i - W + 1] + L[i - 1] + L[i] + L[i + 1] + L[i + W - 1] + L[i + W] + L[i + W + 1]) / 9
    rs += Math.abs(L[i] - m); rn++
  }
  const s15 = document.createElement('canvas'); s15.width = Math.round(W * 0.15); s15.height = Math.round(Hh * 0.15)
  s15.getContext('2d').drawImage(c, 0, 0, s15.width, s15.height)
  return { w: W, h: Hh, meanLum: +(s / n).toFixed(1), lit20: +(100 * lit / n).toFixed(1), bright50: +(100 * bri / n).toFixed(1), min: +mn.toFixed(1), rough: +(rs / rn).toFixed(2), small: s15.toDataURL('image/png') }
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
  console.log(JSON.stringify({ out: out.replace(/.*[\/]/, ''), t: T, ...st }))
}
if (errs.length) console.log('console errors:', errs.slice(0, 3))
await br.close()
