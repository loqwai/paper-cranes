import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'

const OUT = 'D:/Projects/pc-lab-tile/journals/lab/shots'
const PORT = 6996
await mkdir(OUT, { recursive: true })

const b = await chromium.launch({ headless: false })

const shots = [
  { name: 'kikyo-3x3',       image: 'mon-kikyo.png', knob1: (3-1)/11,  vw: 900, vh: 900 },
  { name: 'kikyo-8x8',       image: 'mon-kikyo.png', knob1: (8-1)/11,  vw: 900, vh: 900 },
  { name: 'tomoe-5x5',       image: 'mon-tomoe.png', knob1: (5-1)/11,  vw: 900, vh: 900 },
  { name: 'kikyo-3x3-mirror',image: 'mon-kikyo.png', knob1: (3-1)/11,  vw: 900, vh: 900, mirror: true },
  { name: 'tomoe-5x5-mirror',image: 'mon-tomoe.png', knob1: (5-1)/11,  vw: 900, vh: 900, mirror: true },
  { name: 'nonsquare-1200x500', image: 'mon-kikyo.png', knob1: (5-1)/11, vw: 1200, vh: 500 },
]

for (const s of shots) {
  const ctx = await b.newContext({ viewport: { width: s.vw, height: s.vh } })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error') console.log('[err]', s.name, m.text()) })
  const knob2 = s.mirror ? 1 : 0
  const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/grid&image=images/beads/${s.image}&noaudio=true&time=8&knob_1=${s.knob1}&knob_2=${knob2}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/${s.name}.png` })
  console.log('OK', s.name, url)
  await ctx.close()
}

await b.close()
