// PROBE: read back the exact texture-coordinate range beadDist() uses, per level.
// agent: whole. Port asserted per capture.
import { chromium } from 'playwright'
const PORT = Number(process.env.LABPORT || 6987)
const SH = process.env.SHADER || 'redaphid/wip/lattice-bead/probe'
const BASE = `http://localhost:${PORT}/?shader=${SH}&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.218&image=images/beads/mon-kiku.png&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&knob_1=0.429&knob_134=0.507&knob_144=0.3&knob_161=1`
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 })
// PIN SEEDS: index.js stores 4 Math.random() seeds in localStorage; a fresh context reseeds.
await page.addInitScript(() => localStorage.setItem('paperCranes.seeds', JSON.stringify([0.618, 0.755, 0.892, 0.029])))
page.on('pageerror', e => console.error('PAGEERROR', e.message))
const out = []
for (const arg of process.argv.slice(2)) {
    const [label, q] = [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)]
    await page.goto(`${BASE}&${q}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.cranes && window.cranes.frameCount > 30, null, { timeout: 30000 })
    await page.waitForTimeout(2000)
    const r = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        const gl = c.getContext('webgl2')
        const w = c.width, h = c.height
        const px = new Uint8Array(w * h * 4)
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px)
        let maxT = -9, minT = 9, wrap = 0, n = 0
        for (let i = 0; i < px.length; i += 4) {
            const mx = (px[i] / 255) * 6 - 2, mn = (px[i + 1] / 255) * 6 - 2
            if (mx > 3.9) continue          // clamped/unset (level not drawn at this pixel)
            if (mx > maxT) maxT = mx
            if (mn < minT) minT = mn
            wrap += px[i + 2] > 127 ? 1 : 0
            n++
        }
        return { port: location.port, canvas: w + 'x' + h, n,
                 maxTexcoord: +maxT.toFixed(3), minTexcoord: +minT.toFixed(3),
                 spanPeriods: +(maxT - minT).toFixed(3), wrapFrac: +(wrap / n).toFixed(4) }
    })
    if (r.port !== String(PORT)) throw new Error(`PORT GUARD FAILED: ${r.port} != ${PORT}`)
    out.push({ label, ...r })
    console.log(JSON.stringify(out.at(-1)))
}
await browser.close()
