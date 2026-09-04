import { chromium } from 'playwright'
const PORT = 6982
const OUT = 'D:/Projects/pc-lab-tomoe/journals/lab/shots'
const K = 'controller=lattice-nav&wavelet=true&noaudio=true&fullscreen=true&knob_1=0.429&knob_134=0.507&knob_144=0.3'
const S = 'redaphid/wip/lattice-bead/tomoe'
const RUNS = [
  // tag,                image,                            mix, navZoom, times
  ['q1only',  'images/beads/mon-tomoe-q1only.png', 1, 0.218, [4, 8, 16]],
  ['ume',     'images/beads/mon-ume.png',          1, 0.218, [4, 8, 16]],
  ['zoomv1',  'images/beads/mon-tomoe.png',        1, 0.9,   [8]],
  ['zoombase','images/beads/mon-tomoe.png',        0, 0.9,   [8]],
]
const b = await chromium.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: 720, height: 1280 } })
const page = await ctx.newPage()
for (const [tag, img, mix, nz, times] of RUNS) {
  for (const t of times) {
    const url = `http://localhost:${PORT}/?shader=${S}&${K}&navZoom=${nz}&image=${img}&knob_161=${mix}&time=${t}`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2500)
    const g = await page.evaluate(() => location.href)
    if (!g.includes(':6982')) throw new Error('PORT GUARD FAILED: ' + g)
    await page.screenshot({ path: `${OUT}/tomoe-${tag}-t${t}.png` })
    console.log('OK', `tomoe-${tag}-t${t}`)
  }
}
await b.close()
