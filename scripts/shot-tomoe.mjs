import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
const PORT = 6982
const OUT = 'D:/Projects/pc-lab-tomoe/journals/lab/shots'
const KNOBS = 'controller=lattice-nav&wavelet=true&noaudio=true&fullscreen=true&navZoom=0.218&knob_1=0.429&knob_134=0.507&knob_144=0.3'
const SHADER = 'redaphid/wip/lattice-bead/tomoe'
// [tag, image, beadMix, extra]
const RUNS = [
  ['base',  'images/beads/mon-tomoe.png', 0, ''],
  ['v1',    'images/beads/mon-tomoe.png', 1, ''],
  ['sym',   'images/beads/mon-kikko.png', 1, ''],
]
await mkdir(OUT, { recursive: true })
const b = await chromium.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: 720, height: 1280 } })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text()) })
for (const [tag, img, mix, extra] of RUNS) {
  for (const t of [4, 8, 16]) {
    const url = `http://localhost:${PORT}/?shader=${SHADER}&${KNOBS}&image=${img}&knob_161=${mix}&time=${t}${extra}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2500)
    const guard = await page.evaluate(() => location.href)
    if (!guard.includes(':6982')) throw new Error('PORT GUARD FAILED: ' + guard)
    await page.screenshot({ path: `${OUT}/tomoe-${tag}-t${t}.png` })
    console.log('OK', `tomoe-${tag}-t${t}`, '| guard ok')
  }
}
await b.close()
