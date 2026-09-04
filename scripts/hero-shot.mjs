// Deterministic canvas capture for /lab hero (H11). Port-guarded per capture.
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
const PORT = 6991
const OUT = 'D:/Projects/pc-lab-hero/journals/lab/shots/'
const jobs = JSON.parse(process.argv[2])
const SIZE = parseInt(process.argv[3] || '900')
const b = await chromium.launch({ headless: true,
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'] })
const page = await b.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 })
await page.addInitScript(() => { localStorage.setItem('paperCranes.seeds', JSON.stringify([0.11,0.22,0.33,0.44])) })
page.on('pageerror', e => console.error('PAGEERROR', String(e).slice(0,300)))
page.on('console', m => { if (m.type()==='error') console.error('CONSOLE', m.text().slice(0,300)) })
for (const j of jobs) {
    const shader = j.shader || 'redaphid/wip/lattice-bead/hero'
    const ctrl = j.ctrl ? '&controller=lattice-nav' : ''
    const url = `http://localhost:${PORT}/?shader=${shader}&wavelet=true&noaudio=true&fullscreen=true`
      + `&navZoom=${j.navZoom ?? 0.218}${ctrl}&image=${j.image}&knob_1=0.429&knob_134=0.507&knob_141=0.5&knob_142=0.5&knob_143=0.5&knob_144=0.3&knob_145=0.5&knob_146=0.5&knob_147=0.5&knob_148=0.5&knob_149=0.5&knob_150=0.5&knob_151=0.5&knob_152=0.5&knob_153=0.5&knob_154=0.5&knob_155=0.5&knob_156=0.5&knob_157=0.5&knob_158=0.5&knob_159=0.5&knob_160=0.5`
      + `&knob_161=${j.mix ?? 0}&time=${j.time ?? 8}${j.extra || ''}`
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const href = await page.evaluate(() => location.href)
    if (!href.includes(`:${PORT}`)) throw new Error(`PORT GUARD FAILED: ${href}`)
    await page.waitForFunction(mf => window.cranes && window.cranes.frameCount > mf, 30, { timeout: 120000 })
        .catch(() => console.error('  !! frameCount stalled', j.name))
    await page.waitForTimeout(700)
    const info = await page.evaluate(() => { const c = document.querySelector('canvas')
        return { w:c.width, h:c.height, frames:window.cranes.frameCount, data:c.toDataURL('image/png') } })
    writeFileSync(OUT + j.name, Buffer.from(info.data.split(',')[1], 'base64'))
    console.log(`${j.name}  ${info.w}x${info.h}  frames=${info.frames}`)
}
await b.close()
