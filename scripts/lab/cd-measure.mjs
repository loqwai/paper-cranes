// ChromaDepth lock measurement, headless: is hue a monotone function of depth, and is white unreachable?
//   node scripts/lab/cd-measure.mjs "<query>" [mode=dodeca|wavelet] [size=384] [outPrefix]
// Renders the visual twice with every phase and feature PINNED via URL params (URL params beat controller
// output every frame): once normally, once with &cddebug=1, where the shader paints its own depth field as
// grey. Reports Spearman rho(depth, hue) over coloured pixels, the mean |hue - (0.75*depth + seed2*0.03)|,
// the near-white fraction (HSL sat < 0.2 and L > 0.5), mean luminance, dark fraction and the hue histogram
// by depth band. With outPrefix, saves <prefix>-colour.jpg and <prefix>-depth.jpg for a look.
import { chromium } from 'playwright'
const [,, query, mode = 'dodeca', sizeArg = '384', outPrefix] = process.argv
if (!query) { console.error('usage: node scripts/lab/cd-measure.mjs "<query>" [mode] [size] [outPrefix]'); process.exit(2) }
const size = +sizeArg, SEED2 = 0.755
const SEEDS = `&seed=0.618&seed2=${SEED2}&seed3=0.31&seed4=0.47`
const PIN = mode === 'wavelet'
  ? '&time=8&flowPhase=3.1&morphPhase=1.7&evoPhase=6&spinPhase=2.2&huePhase=0.8&bTime=40&navX=0&navY=0&navZoom=1'
    + '&quietGate=1&energySpring=0.4&waveletBassSpring=0.45&waveletBand1Spring=0.4&waveletBand2Spring=0.35&waveletBand3Spring=0.35'
    + '&waveletBand4Spring=0.3&waveletBand5Spring=0.3&waveletCentroidSpring=0.4&wavelet_bassHitSmooth=0.3&bassLive=0.45&trebLive=0.3'
    + '&spectralSpreadMedian=0.26&pitchClassMedian=0.4&spectralCentroidMedian=0.3&spectralEntropyMedian=0.6'
  : '&spin_angle=2.2&morph_phase=1.7&flow_phase=3.1&hue_phase=0.8&bass_env=0.45&mids_env=0.4&treble_env=0.3&energy_env=0.4'
    + '&entropy_env=0.5&centroid_env=0.35&flux_env=0.3&bass_pump=0.3&drop_glow=0.0&pitch_pulse=0.1&pitchClassMedian=0.4&spectralCentroidMedian=0.3'
const br = await chromium.launch()
const grab = async (extra, shot) => {
  const p = await br.newPage({ viewport: { width: size, height: size } })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)))
  await p.goto(`http://localhost:${process.env.PORT || 6969}/?${query}&noaudio=true${SEEDS}${PIN}${extra}`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 15000 })
  await p.waitForTimeout(2500)
  const px = await p.evaluate(size => new Promise(res => requestAnimationFrame(() => {
    const c = document.querySelector('canvas'), g = document.createElement('canvas'); g.width = size; g.height = size
    const x = g.getContext('2d'); x.drawImage(c, 0, 0, size, size)
    res(Array.from(x.getImageData(0, 0, size, size).data))
  })), size)
  if (shot) await p.screenshot({ path: shot, type: 'jpeg', quality: 88 })
  await p.close()
  return { px, errs }
}
const col = await grab('', outPrefix && `${outPrefix}-colour.jpg`)
const dep = await grab('&cddebug=1', outPrefix && `${outPrefix}-depth.jpg`)
await br.close()

const rgb2hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
const n = size * size, hues = [], depths = [], bands = Array.from({ length: 6 }, () => [])
let white = 0, lumSum = 0, dark = 0, bright = 0, errSum = 0
for (let i = 0; i < n; i++) {
  const r = col.px[i * 4], g = col.px[i * 4 + 1], b = col.px[i * 4 + 2]
  const [h, s, l] = rgb2hsl(r, g, b), lum = 0.299 * r + 0.587 * g + 0.114 * b
  lumSum += lum; if (lum < 20) dark++; if (lum > 50) bright++
  if (s < 0.2 && l > 0.5) white++
  const depth = dep.px[i * 4] / 255
  if (s > 0.25 && l > 0.06) {
    hues.push(h); depths.push(depth)
    errSum += Math.abs(h - (0.75 * depth + SEED2 * 0.03))
    bands[Math.min(5, Math.floor(depth * 6))].push(h)
  }
}
const rank = a => { const idx = a.map((v, i) => i).sort((x, y) => a[x] - a[y]); const r = new Array(a.length); idx.forEach((i, k) => { r[i] = k }); return r }
const pearson = (a, b) => { const m = a.length, ma = a.reduce((s, v) => s + v, 0) / m, mb = b.reduce((s, v) => s + v, 0) / m
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < m; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2 }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : null }
const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null
const out = {
  size, mode, errs: [...col.errs, ...dep.errs].slice(0, 3),
  colouredFrac: +(hues.length / n).toFixed(3),
  spearmanDepthHue: hues.length > 10 ? +pearson(rank(depths), rank(hues)).toFixed(4) : null,
  meanAbsHueErr: hues.length ? +(errSum / hues.length).toFixed(4) : null,
  nearWhitePct: +(100 * white / n).toFixed(3),
  lum: +(lumSum / n).toFixed(1), darkPct: +(100 * dark / n).toFixed(1), brightPct: +(100 * bright / n).toFixed(1),
  bandMeanHue: bands.map(b => b.length ? +mean(b).toFixed(3) : null),
  bandPct: bands.map(b => +(100 * b.length / n).toFixed(1)),
}
console.log(JSON.stringify(out))
