// Reproduce the mobile framing of a visual: emulate a phone (portrait), report canvas buffer vs CSS vs
// viewport sizes, find the brightest blob's centre/bounds, and save a screenshot.
//   node scripts/lab/phone-fit.mjs "<query without leading ?>" out.png
import { chromium, devices } from 'playwright'
const [,, query = 'shader=redaphid/wip/lattice-bead-vj/satellites&controller=dodeca-bloom&image=images/beads/mon-hakkaku.png&satellites=6&wavelet=true&fullscreen=true&noaudio=true&bass_env=0.5&energy_env=0.5&bass_pump=0.3', out = 'phone-fit.png'] = process.argv
const br = await chromium.launch()
const ctx = await br.newContext({ ...devices['Pixel 7'] })
const p = await ctx.newPage()
const errs = []
p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
await p.goto(`http://localhost:6969/?${query}`, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas', { timeout: 15000 })
await p.waitForTimeout(3000)
const info = await p.evaluate(() => {
  const c = document.querySelector('canvas'), r = c.getBoundingClientRect()
  const g = document.createElement('canvas'); g.width = 120; g.height = Math.round(120 * c.height / c.width)
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, g.width, g.height)
  const d = x.getImageData(0, 0, g.width, g.height).data
  let sx = 0, sy = 0, sw = 0, minx = 1e9, maxx = -1, miny = 1e9, maxy = -1
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    if (l > 90) { const px = (i / 4) % g.width, py = Math.floor(i / 4 / g.width); sx += px * l; sy += py * l; sw += l; minx = Math.min(minx, px); maxx = Math.max(maxx, px); miny = Math.min(miny, py); maxy = Math.max(maxy, py) }
  }
  return {
    viewport: [innerWidth, innerHeight], visual: [visualViewport?.width, visualViewport?.height],
    buffer: [c.width, c.height], css: [Math.round(r.width), Math.round(r.height)], top: Math.round(r.top), left: Math.round(r.left),
    bodyScroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    brightCentreFrac: sw ? [+(sx / sw / g.width).toFixed(3), +(sy / sw / g.height).toFixed(3)] : null,
    brightBoundsFrac: sw ? [+(minx / g.width).toFixed(2), +(miny / g.height).toFixed(2), +(maxx / g.width).toFixed(2), +(maxy / g.height).toFixed(2)] : null,
    bufferAspect: +(c.width / c.height).toFixed(3), cssAspect: +(r.width / r.height).toFixed(3),
  }
})
await p.screenshot({ path: out })
console.log(JSON.stringify({ info, errs }))
await br.close()
