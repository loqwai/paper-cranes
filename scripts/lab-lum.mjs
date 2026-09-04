import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const files = process.argv.slice(2)
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
for (const f of files) {
  const d = 'data:image/png;base64,' + (await readFile(f)).toString('base64')
  const r = await p.evaluate(async (src) => {
    const im = new Image(); im.src = src; await im.decode()
    const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height })
    const x = c.getContext('2d'); x.drawImage(im, 0, 0)
    const px = x.getImageData(0, 0, c.width, c.height).data
    let sum = 0, lit = 0, n = px.length / 4
    for (let i = 0; i < px.length; i += 4) {
      const l = 0.2126 * px[i] + 0.7152 * px[i+1] + 0.0722 * px[i+2]
      sum += l; if (l > 24) lit++
    }
    return { mean: +(sum / n).toFixed(2), litPct: +(100 * lit / n).toFixed(1) }
  }, d)
  console.log(f.split(/[\/]/).pop().padEnd(24), 'meanLum', String(r.mean).padStart(6), ' lit%', String(r.litPct).padStart(5))
}
await b.close()
