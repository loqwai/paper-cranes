import { chromium } from 'playwright'
const b = await chromium.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: 1024, height: 512 } })
const p = await ctx.newPage()
p.on('console', m => { if (m.type() === 'error') console.log('[err]', m.text()) })
const url = 'http://localhost:6982/?shader=redaphid/wip/lattice-bead/tomoe-probe&noaudio=true&fullscreen=true&time=1&image=images/beads/mon-tomoe.png'
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
await p.waitForTimeout(2500)
const g = await p.evaluate(() => location.href)
if (!g.includes(':6982')) throw new Error('PORT GUARD FAILED ' + g)
await p.screenshot({ path: 'D:/Projects/pc-lab-tomoe/journals/lab/shots/tomoe-probe-yflip.png' })
console.log('OK probe | guard ok')
await b.close()
