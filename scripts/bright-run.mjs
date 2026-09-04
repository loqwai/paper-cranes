// lab/bright H10 harness. Port-guarded per capture, seeds pinned, FULL RES,
// metrics read off the LIVE canvas (no PNG round-trip). Matches lab/kiku's
// litPct definition exactly (Rec.709 luma, lit = L>20, bright = L>50) so the
// numbers are comparable across the fan-out. darkPct = L<8 ("real black").
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const PORT = 6988
const OUT = 'D:/Projects/pc-lab-bright/journals/lab/shots/'
const BASE = (sh) => `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${sh}` +
    `&wavelet=true&noaudio=true&fullscreen=true` +
    `&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029`

const jobs = JSON.parse(process.argv[2])
const HEADLESS = process.env.HEADED === '1' ? false : true

const b = await chromium.launch({
    headless: HEADLESS,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--enable-webgl', '--ignore-gpu-blocklist']
})
const page = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
await page.addInitScript(() => {
    localStorage.setItem('paperCranes.seeds', JSON.stringify([0.11, 0.22, 0.33, 0.44]))
})
page.on('pageerror', e => console.error('PAGEERROR', String(e).slice(0, 200)))

const out = []
for (const j of jobs) {
    const kn = Object.entries(j.knobs || {}).map(([k, v]) => `&${k}=${v}`).join('')
    const url = `${BASE(j.shader || 'bright')}${j.ctrl ? '&controller=lattice-nav' : ''}&image=images/beads/mon-${j.image}.png` +
                `&navZoom=${j.navZoom || 0.218}&knob_1=0.429&knob_134=0.507&knob_144=0.3${kn}&time=${j.time}`
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const href = await page.evaluate(() => location.href)
    if (!href.includes(`:${PORT}`)) throw new Error(`PORT GUARD FAILED: ${href}`)
    await page.waitForFunction(() => window.cranes && window.cranes.frameCount > 30,
        null, { timeout: 120000 }).catch(() => console.error('  !! stalled', j.name))
    await page.waitForTimeout(700)
    const r = await page.evaluate((save) => {
        const c = document.querySelector('canvas')
        const t = document.createElement('canvas'); t.width = c.width; t.height = c.height
        const g = t.getContext('2d', { willReadFrequently: true })
        g.drawImage(c, 0, 0)                       // 1:1, no resample
        const px = g.getImageData(0, 0, t.width, t.height).data
        let sum = 0, n = 0, lit = 0, bright = 0, dark = 0
        for (let i = 0; i < px.length; i += 4) {
            const l = 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2]
            sum += l; n++
            if (l > 20) lit++; if (l > 50) bright++; if (l < 8) dark++
        }
        return { w: t.width, h: t.height, frames: window.cranes.frameCount,
                 mean: +(sum/n).toFixed(2), litPct: +(100*lit/n).toFixed(2),
                 brightPct: +(100*bright/n).toFixed(2), darkPct: +(100*dark/n).toFixed(2),
                 png: save ? c.toDataURL('image/png') : null }
    }, !!j.save)
    if (j.save) writeFileSync(OUT + j.save, Buffer.from(r.png.split(',')[1], 'base64'))
    delete r.png
    out.push({ ...j, ...r })
    console.log(`${(j.name||'').padEnd(26)} t=${String(j.time).padEnd(3)} ${j.image.padEnd(8)} ${r.w}x${r.h} f=${String(r.frames).padEnd(4)} lit=${String(r.litPct).padEnd(6)} bright=${String(r.brightPct).padEnd(6)} dark=${String(r.darkPct).padEnd(6)} mean=${r.mean}`)
}
writeFileSync(OUT + 'metrics-' + (process.env.TAG || 'run') + '.json', JSON.stringify(out, null, 1))
await b.close()
