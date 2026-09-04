// agent: whole. Deterministic capture, port-guarded per shot, seeds pinned.
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const PORT = Number(process.env.LABPORT || 6987)
const OUT = process.env.OUT || 'D:/Projects/pc-lab-whole/journals/lab/shots'
mkdirSync(OUT, { recursive: true })
const SH = process.env.SHADER || 'redaphid/wip/lattice-bead/whole'
const jobs = JSON.parse(process.argv[2])
const b = await chromium.launch({ headless: false })
const page = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
await page.addInitScript(() => localStorage.setItem('paperCranes.seeds', JSON.stringify([0.618, 0.755, 0.892, 0.029])))
page.on('pageerror', e => console.error('PAGEERROR', String(e).slice(0, 200)))
for (const j of jobs) {
    const url = `http://localhost:${PORT}/?shader=${SH}&wavelet=true&noaudio=true&fullscreen=true`
        + `&navZoom=${j.zoom ?? 0.218}${j.ctrl ? '&controller=lattice-nav' : ''}`
        + `&image=${j.image}&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029`
        + `&knob_1=0.429&knob_134=0.507&knob_144=0.3&knob_161=${j.mix}&knob_164=${j.k164 ?? 0}&time=${j.time}`
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.cranes && window.cranes.frameCount > 40, null, { timeout: 40000 })
    await page.waitForTimeout(1500)
    const g = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        const gl = c.getContext('webgl2')
        const px = new Uint8Array(4 * c.width * c.height)
        gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px)
        let lum = 0, lit = 0, black = 0
        for (let i = 0; i < px.length; i += 4) {
            const L = 0.2126 * px[i] + 0.7152 * px[i+1] + 0.0722 * px[i+2]
            lum += L; if (L > 40) lit++; if (L < 3) black++
        }
        const n = px.length / 4
        return { port: location.port, canvas: c.width + 'x' + c.height,
                 meanLum: +(lum / n).toFixed(3), litCov: +(lit / n).toFixed(4), blackFrac: +(black / n).toFixed(3) }
    })
    if (g.port !== String(PORT)) throw new Error(`PORT GUARD FAILED ${g.port}`)
    if (g.blackFrac > 0.995) throw new Error(`BLACK CANVAS (tab occluded?) ${j.name}`)
    await page.locator('canvas').screenshot({ path: `${OUT}/${j.name}.png` })
    console.log(JSON.stringify({ name: j.name, ...g }))
}
await b.close()
