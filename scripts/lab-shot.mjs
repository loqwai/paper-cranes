// /lab shot: deterministic PNG + mean luminance for one URL.
//   node scripts/lab-shot.mjs <out.png> <url>
import { chromium } from 'playwright'
const [out, url] = process.argv.slice(2)
if (!out || !url) { console.error('usage: node scripts/lab-shot.mjs <out.png> <url>'); process.exit(1) }
const b = await chromium.launch({ headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 880, height: 750 }, deviceScaleFactor: 1 })
p.on('pageerror', e => console.error('PAGEERROR', e.message))
await p.goto(url, { waitUntil: 'load' })
await p.waitForSelector('canvas', { timeout: 20000 })
await p.waitForTimeout(4000)
const lum = await p.evaluate(() => {
  const c = document.querySelector('canvas'), W = 256, H = 256
  const t = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, W, H)
  const d = x.getImageData(0, 0, W, H).data
  let s = 0, sq = 0, lit = 0, mx = 0
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255
    s += l; sq += l*l; if (l > 0.5) lit++; if (l > mx) mx = l
  }
  const n = W*H, mean = s/n
  return { mean:+mean.toFixed(4), rms:+Math.sqrt(sq/n).toFixed(4), litFrac:+(lit/n).toFixed(4), max:+mx.toFixed(3),
           canvas:[c.width,c.height], href:location.href }
})
await p.locator('canvas').screenshot({ path: out })
console.log(JSON.stringify({ out, ...lum }))
await b.close()
