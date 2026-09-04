// Deterministic canvas capture for /lab (lab/nfold). Port-guarded per capture.
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const PORT = 6993
const OUT = 'D:/Projects/pc-lab-nfold/journals/lab/shots/'
const SHADER = 'redaphid/wip/lattice-bead/nfold'

const jobs = JSON.parse(process.argv[2])
const MINF = parseInt(process.argv[3] || '30')

const b = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--enable-webgl', '--ignore-gpu-blocklist']
})
const page = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
await page.addInitScript(() => {
    localStorage.setItem('paperCranes.seeds', JSON.stringify([0.11, 0.22, 0.33, 0.44]))
})
page.on('pageerror', e => console.error('PAGEERROR', String(e).slice(0, 300)))

for (const j of jobs) {
    const p = { shader: SHADER, wavelet: 'true', noaudio: 'true', fullscreen: 'true',
                navZoom: '0.218', knob_1: '0.429', knob_134: '0.507', knob_144: '0.3',
                knob_161: '1', time: '12', ...j.q }
    const url = 'http://localhost:' + PORT + '/?' +
        Object.entries(p).map(([k, v]) => `${k}=${v}`).join('&') +
        (j.ctrl ? '&controller=lattice-nav' : '')
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const href = await page.evaluate(() => location.href)
    if (!href.includes(`:${PORT}`)) throw new Error(`PORT GUARD FAILED: ${href}`)
    await page.waitForFunction((mf) => window.cranes && window.cranes.frameCount > mf,
        MINF, { timeout: 120000 }).catch(() => console.error('  !! frameCount stalled', j.name))
    await page.waitForTimeout(700)
    const info = await page.evaluate(() => {
        const c = document.querySelector('canvas')
        return { w: c.width, h: c.height, frames: window.cranes.frameCount,
                 data: c.toDataURL('image/png') }
    })
    writeFileSync(OUT + j.name, Buffer.from(info.data.split(',')[1], 'base64'))
    console.log(`${j.name}  ${info.w}x${info.h}  frames=${info.frames}`)
}
await b.close()
