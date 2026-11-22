// Render gate for NFC variants (the taco lesson: 70% of the taco tags clipped before anyone looked).
//
//   node scripts/nfc/render-gate.mjs <variants.json> <outDir> [port=6969] [only=n,n,...]
//
// Loads every variant's `full` URL against a local dev server with noaudio=true&time=20, screenshots
// a phone-portrait frame, and measures the pixels. Writes <outDir>/<n>.png, <outDir>/gate.json and
// <outDir>/contact-sheet.png. Headless has no audio worklet, so this checks the resting look only.
//
// Rejects: near-black (meanL), white-out (clipped fraction), grey (low OKLab chroma on lit pixels),
// flat (one colour field), speckle (high-frequency luma energy), hot magenta (a wide area of saturated pink-purple), and static
// frames: after the still, the `time` uniform is moved from 20 to 22 and the frame must change
// (`motion`, mean absolute RGB difference; `control` is the same wait with time held, for reference).
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(resolve(import.meta.dirname, '../../package.json'))
const { chromium } = require('playwright')

const [variantsPath, outDir, port = '6969', only = ''] = process.argv.slice(2)
if (!variantsPath || !outDir) {
  console.error('usage: node scripts/nfc/render-gate.mjs <variants.json> <outDir> [port] [only=n,n]')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const all = JSON.parse(readFileSync(variantsPath, 'utf8'))
const pick = only ? new Set(only.split(',').map(Number)) : null
const variants = pick ? all.filter(v => pick.has(v.n)) : all
const W = 360, H = 740
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 3500)
const WORKERS = Number(process.env.WORKERS ?? 3)
const MOTION_MS = Number(process.env.MOTION_MS ?? 1200)

export const LIMITS = {
  meanL: [0.035, 0.6],     // mean relative luminance
  white: 0.02,             // fraction of pixels with every channel clipped
  chroma: 0.075,           // mean OKLab chroma of lit pixels
  grey: 0.45,              // fraction of lit pixels with chroma < 0.04
  speckle: 0.085,          // mean |luma - 4-neighbour mean| at full resolution
  magenta: 0.12,           // fraction of pixels in the hot-magenta box
  motion: 0.01,            // mean |RGB diff| (0..1) between time=20 and time=22
  flatL: 0.035,            // std of OKLab L below this = one flat field (a solid red screen)
  flatLab: [0.05, 0.05],   // or: L std and a/b std both below these
}

const verdict = m => {
  const why = []
  if (m.meanL < LIMITS.meanL[0]) why.push('dark')
  if (m.meanL > LIMITS.meanL[1]) why.push('bright')
  if (m.white > LIMITS.white) why.push('white-out')
  if (m.chroma < LIMITS.chroma) why.push('low-chroma')
  if (m.grey > LIMITS.grey) why.push('grey')
  if (m.speckle > LIMITS.speckle) why.push('speckle')
  if (m.magenta > LIMITS.magenta) why.push('magenta')
  if (m.motion < LIMITS.motion) why.push('static')
  if (m.Lsd < LIMITS.flatL || (m.Lsd < LIMITS.flatLab[0] && m.ABsd < LIMITS.flatLab[1])) why.push('flat')
  return why
}

// Runs in the page: decode the screenshot and measure it
const measure = async (b64) => {
  const img = new Image()
  img.src = 'data:image/png;base64,' + b64
  await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const x = c.getContext('2d'); x.drawImage(img, 0, 0)
  const { data: d, width: w, height: h } = x.getImageData(0, 0, c.width, c.height)
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
  const L = new Float32Array(w * h)
  let sumL = 0, white = 0, lit = 0, chromaSum = 0, grey = 0, mag = 0
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = lin(d[i]), g = lin(d[i + 1]), b = lin(d[i + 2])
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    L[p] = Y; sumL += Y
    if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) white++
    if (d[i] > 180 && d[i + 2] > 150 && d[i + 1] < 90) mag++
    if (Y > 0.02) {
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
      const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
      const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
      const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
      const C = Math.hypot(A, B)
      lit++; chromaSum += C; if (C < 0.04) grey++
    }
  }
  let hf = 0, n = 0
  for (let y = 1; y < h - 1; y++) for (let xx = 1; xx < w - 1; xx++) {
    const p = y * w + xx
    const s = Math.sqrt(L[p]), nb = (Math.sqrt(L[p - 1]) + Math.sqrt(L[p + 1]) + Math.sqrt(L[p - w]) + Math.sqrt(L[p + w])) / 4
    hf += Math.abs(s - nb); n++
  }
  // Structure: std of OKLab L and of a/b on a coarse grid (catches a single flat colour field)
  const Ls = [], As = [], Bs = []
  for (let y = 0; y < h; y += 4) for (let xx = 0; xx < w; xx += 4) {
    const i = (y * w + xx) * 4
    const r = lin(d[i]), g = lin(d[i + 1]), b = lin(d[i + 2])
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    Ls.push(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s)
    As.push(1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s)
    Bs.push(0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)
  }
  const sd = a => { const mu = a.reduce((t, v) => t + v, 0) / a.length; return Math.sqrt(a.reduce((t, v) => t + (v - mu) ** 2, 0) / a.length) }
  const N = w * h
  const r3 = v => +v.toFixed(4)
  return { meanL: r3(sumL / N), white: r3(white / N), chroma: r3(lit ? chromaSum / lit : 0),
    grey: r3(lit ? grey / lit : 1), litFrac: r3(lit / N), speckle: r3(hf / n), magenta: r3(mag / N),
    Lsd: r3(sd(Ls)), ABsd: r3(Math.hypot(sd(As), sd(Bs))) }
}

// Runs in the page: mean absolute RGB difference of two screenshots (0..1)
const frameDiff = async ([a, b]) => {
  const load = async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    return x.getImageData(0, 0, c.width, c.height).data
  }
  const [da, db] = await Promise.all([load(a), load(b)])
  let sum = 0
  for (let i = 0; i < da.length; i += 4) sum += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
  return +(sum / (da.length / 4) / 3 / 255).toFixed(4)
}

const localUrl = (full) => {
  const u = new URL(full)
  const l = new URL(u.pathname + u.search, `http://127.0.0.1:${port}`)
  l.searchParams.set('noaudio', 'true')
  l.searchParams.set('time', '20')
  return l.toString()
}

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const results = []
const queue = [...variants]
const worker = async () => {
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  while (queue.length) {
    const v = queue.shift()
    errors.length = 0
    await page.goto(localUrl(v.full), { waitUntil: 'load' })
    await page.waitForTimeout(SETTLE_MS)
    const png = await page.screenshot({ type: 'png' })
    writeFileSync(`${outDir}/${v.n}.png`, png)
    const m = await page.evaluate(measure, png.toString('base64'))
    await page.waitForTimeout(MOTION_MS)
    const held = await page.screenshot({ type: 'png' })
    await page.evaluate(() => { window.cranes.manualFeatures.time = 22 })
    await page.waitForTimeout(MOTION_MS)
    const moved = await page.screenshot({ type: 'png' })
    m.control = await page.evaluate(frameDiff, [png.toString('base64'), held.toString('base64')])
    m.motion = await page.evaluate(frameDiff, [held.toString('base64'), moved.toString('base64')])
    const why = verdict(m)
    const r = { n: v.n, shader: v.shader, full: v.full, ...m, pass: why.length === 0, why, errors: [...new Set(errors)].slice(0, 3) }
    results.push(r)
    console.log(JSON.stringify(r))
  }
  await page.close()
}
await Promise.all(Array.from({ length: WORKERS }, worker))
results.sort((a, b) => a.n - b.n)
writeFileSync(`${outDir}/gate.json`, JSON.stringify(results, null, 1))

// Contact sheet: every thumbnail, labelled, red border on failures
const cols = Math.min(20, results.length)
const tw = 90, th = 185
const page = await browser.newPage({ viewport: { width: cols * (tw + 4) + 8, height: 200 } })
const cells = results.map(r => {
  const b64 = readFileSync(`${outDir}/${r.n}.png`).toString('base64')
  return `<div class="c ${r.pass ? '' : 'f'}"><img src="data:image/png;base64,${b64}"><span>${r.n} ${r.shader.split('/').pop()}${r.pass ? '' : ' ' + r.why.join(',')}</span></div>`
}).join('')
await page.setContent(`<style>body{margin:4px;background:#111;font:9px sans-serif;color:#ddd}
.g{display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:4px}.c{position:relative;outline:2px solid #333}
.c.f{outline:2px solid #f33}img{width:${tw}px;height:${th}px;display:block}
span{position:absolute;left:1px;bottom:1px;background:#000a;padding:0 2px}</style><div class="g">${cells}</div>`)
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/contact-sheet.png`, fullPage: true })
await browser.close()
const pass = results.filter(r => r.pass).length
console.log(`GATE ${pass}/${results.length} pass`)
