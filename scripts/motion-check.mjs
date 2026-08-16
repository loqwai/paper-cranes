// MOTION CHECK — the harness that eclipse/1.frag needed and did not have.
//
// A still frame cannot validate a motion piece. This renders a SEQUENCE of frames at a fixed
// audio level and measures the mean absolute per-pixel difference between CONSECUTIVE frames
// (is it moving?), then measures the difference BETWEEN audio levels (is it reacting?).
//
//   node scripts/motion-check.mjs <shader-path> <tag>
//
// Numbers are mean |Δ| per channel in 0-255 units. Rough reading:
//   < 1.0   dead / a still image with a shimmer
//   2 - 6   gentle but unmistakable motion
//   > 8     energetic
// PNG decoding is done by handing the screenshot back INTO the page (no node image deps).

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'

const OUT = 'D:/projects/paper-cranes/tmp/eclipse-motion'
const SHADER = process.argv[2] || 'claude/wip/eclipse/2'
const TAG = process.argv[3] || 'v2'
const NFRAMES = 8
const GAP_MS = 90 // ~5 rendered frames apart at 60fps

const LEVELS = {
    quiet: { quietGate: 0.04, energySpring: 0.05, waveletBassSpring: 0.05, waveletBand2Spring: 0.04,
        waveletBand4Spring: 0.04, waveletBand5Spring: 0.06, waveletCentroidSpring: 0.3, melodyFlow: 0.2,
        spectralCrestSmooth: 0.1, spectralRoughnessSmooth: 0.1, waveletBassZScore: 0, wavelet_bassHit: 0, wubDepth: 0 },
    loud: { quietGate: 1, energySpring: 0.55, waveletBassSpring: 0.55, waveletBand2Spring: 0.5,
        waveletBand4Spring: 0.45, waveletBand5Spring: 0.5, waveletCentroidSpring: 0.5, melodyFlow: 0.6,
        spectralCrestSmooth: 0.45, spectralRoughnessSmooth: 0.4, waveletBassZScore: 0.1, wavelet_bassHit: 0, wubDepth: 0.2 },
    beat: { quietGate: 1, energySpring: 0.92, waveletBassSpring: 0.95, waveletBand2Spring: 0.85,
        waveletBand4Spring: 0.8, waveletBand5Spring: 0.9, waveletCentroidSpring: 0.75, melodyFlow: 0.85,
        spectralCrestSmooth: 0.8, spectralRoughnessSmooth: 0.6, waveletBassZScore: 1.0, wavelet_bassHit: 1.0, wubDepth: 0.6 },
}

await mkdir(OUT, { recursive: true })
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] })
const ctx = await b.newContext({ viewport: { width: 420, height: 760 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', e => console.log('[pageerror]', e.message))
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text()) })

const base = `http://localhost:6969/?shader=${SHADER}&noaudio=true&fullscreen=true&controller=wavelet-ease&wavelet=true&seed=0.35&seed2=0.7&seed3=0.42&seed4=0.61`
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 25000 })
await page.waitForTimeout(2500)

// pixel helpers live in the PAGE so we need no node-side PNG decoder
await page.evaluate(() => {
    window.__shots = []
    window.__push = async (b64) => {
        const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob())
        const c = new OffscreenCanvas(img.width, img.height)
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0)
        window.__shots.push(g.getImageData(0, 0, img.width, img.height).data)
        return window.__shots.length - 1
    }
    window.__diff = (i, j) => {
        const a = window.__shots[i], b = window.__shots[j]
        let s = 0, n = 0
        for (let k = 0; k < a.length; k += 4) { s += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]); n += 3 }
        return s / n
    }
    // mean luminance, to catch "it's just black"
    window.__lum = (i) => {
        const a = window.__shots[i]; let s = 0, n = 0
        for (let k = 0; k < a.length; k += 4) { s += 0.2126 * a[k] + 0.7152 * a[k + 1] + 0.0722 * a[k + 2]; n++ }
        return s / n
    }
    // fraction of pixels that are essentially black — the "dead space" number
    window.__dead = (i) => {
        const a = window.__shots[i]; let d = 0, n = 0
        for (let k = 0; k < a.length; k += 4) { if (0.2126 * a[k] + 0.7152 * a[k + 1] + 0.0722 * a[k + 2] < 12) d++; n++ }
        return d / n
    }
})

const idx = {}
for (const [label, feats] of Object.entries(LEVELS)) {
    await page.evaluate(x => Object.assign(window.cranes.manualFeatures, x), feats)
    await page.waitForTimeout(1400)
    idx[label] = []
    for (let i = 0; i < NFRAMES; i++) {
        const png = await page.screenshot()
        idx[label].push(await page.evaluate(b64 => window.__push(b64), png.toString('base64')))
        if (i === 0) await writeFile(`${OUT}/${TAG}-${label}.png`, png)
        if (i === 3) await writeFile(`${OUT}/${TAG}-${label}-t3.png`, png)
        if (i === NFRAMES - 1) await writeFile(`${OUT}/${TAG}-${label}-t7.png`, png)
        await page.waitForTimeout(GAP_MS)
    }
}

const report = {}
for (const label of Object.keys(LEVELS)) {
    const ids = idx[label]
    const deltas = []
    for (let i = 1; i < ids.length; i++) deltas.push(await page.evaluate(([a, b]) => window.__diff(a, b), [ids[i - 1], ids[i]]))
    report[label] = {
        frameToFrame: +(deltas.reduce((a, c) => a + c, 0) / deltas.length).toFixed(2),
        f2fMin: +Math.min(...deltas).toFixed(2),
        firstToLast: +(await page.evaluate(([a, b]) => window.__diff(a, b), [ids[0], ids[ids.length - 1]])).toFixed(2),
        meanLuma: +(await page.evaluate(i => window.__lum(i), ids[0])).toFixed(1),
        deadFrac: +(await page.evaluate(i => window.__dead(i), ids[0])).toFixed(3),
    }
}
report.quietVsLoud = +(await page.evaluate(([a, b]) => window.__diff(a, b), [idx.quiet[0], idx.loud[0]])).toFixed(2)
report.quietVsBeat = +(await page.evaluate(([a, b]) => window.__diff(a, b), [idx.quiet[0], idx.beat[0]])).toFixed(2)
report.loudVsBeat = +(await page.evaluate(([a, b]) => window.__diff(a, b), [idx.loud[0], idx.beat[0]])).toFixed(2)

console.log(JSON.stringify({ shader: SHADER, tag: TAG, ...report }, null, 1))

// contact sheet: consecutive frames side by side, so motion can be SEEN not just measured
const sheet = await ctx.newPage()
const files = []
for (const label of Object.keys(LEVELS)) for (const t of ['', '-t3', '-t7']) files.push(`${TAG}-${label}${t}.png`)
await sheet.setViewport?.({ width: 1300, height: 900 }).catch(() => {})
await sheet.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
${files.map(f => `<div style="position:relative"><img src="file:///${OUT}/${f}" style="width:100%;display:block">
<span style="position:absolute;top:4px;left:6px;color:#fff;font:bold 20px monospace;text-shadow:0 0 6px #000">${f.replace(TAG + '-', '').replace('.png', '')}</span></div>`).join('')}
</body>`)
await sheet.waitForTimeout(700)
await sheet.screenshot({ path: `${OUT}/${TAG}-contact.png`, fullPage: true })
console.log('contact sheet:', `${OUT}/${TAG}-contact.png`)
await b.close()
