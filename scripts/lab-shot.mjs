// Deterministic shot + FPS harness for /lab (agent: split, port 6983).
// Headed Chromium => real GPU. Fixed viewport. No cursor overlay.
//   node scripts/lab-shot.mjs <outdir> <label>=<query-suffix> ...
import { chromium } from 'playwright'
import { readFile, writeFile } from 'fs/promises'

const PORT = 6986
const BASE = `http://localhost:${PORT}/?shader=${process.env.SHADER || "redaphid/wip/lattice-bead/revsplit"}&controller=lattice-nav&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.218&image=images/beads/mon-kiku.png&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&knob_1=0.429&knob_134=0.507&knob_144=0.3`
const VIEW = { width: 1000, height: 800 }

const [outdir, ...pairs] = process.argv.slice(2)
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1 })
page.on('pageerror', e => console.error('PAGEERROR', e.message))

const results = []
for (const pair of pairs) {
    const i = pair.indexOf('=')
    const label = pair.slice(0, i), q = pair.slice(i + 1)
    await page.goto(`${BASE}&${q}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.cranes && window.cranes.frameCount > 30, null, { timeout: 30000 })
    await page.waitForTimeout(3000)   // identical settle for every shot

    const guard = await page.evaluate(() => {
        const p = new URLSearchParams(location.search)
        const c = document.querySelector('canvas')
        const gl = c.getContext('webgl2') || c.getContext('webgl')
        const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info')
        return { port: location.port, shader: p.get('shader'), k161: p.get('knob_161'),
                 k162: p.get('knob_162'), k163: p.get('knob_163'), img: p.get('image'), seed3: p.get('seed3'), t: p.get('time'), canvas: c.width + 'x' + c.height,
                 renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a' }
    })
    if (guard.port !== String(PORT)) throw new Error(`PORT GUARD FAILED: ${guard.port}`)

    const file = `${outdir}/${label}.png`
    await page.screenshot({ path: file })

    // FPS + RESOLUTION TOGETHER. Visualizer.js scales canvas resolution under load
    // (calculateResolutionRatio), so fps alone is not comparable across arms: the
    // renderer can hold fps flat and pay for it in pixels. Sample the canvas at BOTH
    // ends of the window (and the min seen during it) and report pixels/second.
    const perf = await page.evaluate(async () => {
        const c = document.querySelector('canvas')
        const t0 = performance.now(), f0 = window.cranes.frameCount
        const w0 = c.width, h0 = c.height
        let minPx = w0 * h0, maxPx = w0 * h0, sumPx = 0, n = 0
        const iv = setInterval(() => {
            const px = c.width * c.height
            if (px < minPx) minPx = px
            if (px > maxPx) maxPx = px
            sumPx += px; n++
        }, 100)
        await new Promise(r => setTimeout(r, 5000))
        clearInterval(iv)
        const t1 = performance.now(), f1 = window.cranes.frameCount
        const secs = (t1 - t0) / 1000, frames = f1 - f0
        const meanPx = n ? sumPx / n : w0 * h0
        return {
            fps: +(frames / secs).toFixed(1),
            canvasStart: w0 + 'x' + h0, canvasEnd: c.width + 'x' + c.height,
            minPx, maxPx, resStable: minPx === maxPx,
            megapixPerSec: +((frames * meanPx) / secs / 1e6).toFixed(2),
        }
    })
    results.push({ label, file, ...perf, ...guard })
    console.log(JSON.stringify(results.at(-1)))
}

const blank = await browser.newPage()
for (const r of results) {
    const b64 = (await readFile(r.file)).toString('base64')
    r.meanLum = await blank.evaluate(async (d) => {
        const img = new Image(); img.src = d; await img.decode()
        const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height })
        const x = c.getContext('2d'); x.drawImage(img, 0, 0)
        const px = x.getImageData(0, 0, c.width, c.height).data
        let s = 0
        for (let i = 0; i < px.length; i += 4) s += 0.2126 * px[i] + 0.7152 * px[i+1] + 0.0722 * px[i+2]
        return +(s / (px.length / 4)).toFixed(3)
    }, 'data:image/png;base64,' + b64)
}
await writeFile(`${outdir}/_measurements-${Date.now()}.json`, JSON.stringify(results, null, 2))
console.log('\n' + JSON.stringify(results.map(r => ({label:r.label, fps:r.fps, meanLum:r.meanLum, canvas:r.canvas, k161:r.k161, k162:r.k162, t:r.t})), null, 2))
await browser.close()
