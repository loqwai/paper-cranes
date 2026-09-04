// Deterministic canvas capture for /lab. Port-guarded per capture.
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const PORT = 6986
const OUT = 'D:/Projects/pc-lab-revsplit/journals/lab/shots/'
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/revsplit` +
    `&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.218`

const jobs = JSON.parse(process.argv[2])   // [{name, image, mode, span, time, ctrl}]
const MINF = parseInt(process.argv[3] || '30')   // [{name, image, mix, time}]

const b = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--enable-webgl', '--ignore-gpu-blocklist']
})
const page = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
// PIN THE SEEDS: index.js stores 4 Math.random() seeds in localStorage; a fresh
// browser context reseeds them, which changes the frame completely. Without this,
// two captures from different launches differ in ~80-93% of pixels.
await page.addInitScript(() => {
    localStorage.setItem('paperCranes.seeds', JSON.stringify([0.11, 0.22, 0.33, 0.44]))
})
page.on('pageerror', e => console.error('PAGEERROR', String(e).slice(0, 200)))

for (const j of jobs) {
    const url = `${BASE}${j.ctrl === false ? '' : '&controller=lattice-nav'}&image=${j.image}&knob_1=0.429&knob_134=0.507&knob_144=0.3` +
                `&knob_161=1&knob_162=${j.mode}&knob_163=${j.span === undefined ? 1 : j.span}&time=${j.time}`
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    // PORT GUARD — per capture, not once
    const href = await page.evaluate(() => location.href)
    if (!href.includes(`:${PORT}`)) throw new Error(`PORT GUARD FAILED: ${href}`)
    // wait for the render loop to actually advance
    await page.waitForFunction((mf) => window.cranes && window.cranes.frameCount > mf,
        MINF, { timeout: 120000 }).catch(() => console.error('  !! frameCount stalled', j.name))
    await page.waitForTimeout(800)
    const info = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        return { w: c.width, h: c.height, frames: window.cranes.frameCount,
                 data: c.toDataURL('image/png') }
    })
    writeFileSync(OUT + j.name, Buffer.from(info.data.split(',')[1], 'base64'))
    console.log(`${j.name}  ${info.w}x${info.h}  frames=${info.frames}`)
}
await b.close()
