// Headless frames for satellites.frag: controller=dodeca-bloom runs the phases (no iTime in
// this shader), audio off. usage: node scripts/lab/satellites-shot.mjs <outPrefix> [frames=4] [gapMs=1500] [mon=hakkaku] [extraQuery]
import { chromium } from 'playwright'
const [,, outPrefix = 'sat', framesArg = '4', gapArg = '1500', mon = 'hakkaku', extra = ''] = process.argv
const frames = +framesArg, gap = +gapArg
const PORT = process.env.PORT || 6969
const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/satellites&controller=dodeca-bloom`
  + `&image=images/beads/mon-${mon}.png&satellites=6&wavelet=true&noaudio=true&onset_refractory_ms=380` + extra
const W = +(process.env.W || 1200), H = +(process.env.H || 900)
const br = await chromium.launch()
const p = await br.newPage({ viewport: { width: W, height: H } })
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
await p.goto(url, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(2500)
const out = []
for (let i = 1; i <= frames; i++) {
  const path = `${outPrefix}-${i}.jpg`
  await p.screenshot({ path, type: 'jpeg', quality: 85 })
  out.push(path); if (i < frames) await p.waitForTimeout(gap)
}
await br.close()
console.log(JSON.stringify({ out, errs: errs.slice(0, 3) }))
