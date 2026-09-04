import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const files = process.argv.slice(2)
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
for (const f of files) {
  const d = 'data:image/png;base64,' + (await readFile(f)).toString('base64')
  const r = await p.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, c.width, c.height).data
    let sum = 0, n = 0, lit = 0, bright = 0
    for (let i = 0; i < px.length; i += 4) {
      const l = 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2]
      sum += l; n++; if (l > 20) lit++; if (l > 50) bright++
    }
    return { mean: +(sum/n).toFixed(2), litPct: +(100*lit/n).toFixed(2), brightPct: +(100*bright/n).toFixed(2) }
  }, d)
  console.log(f.split('/').pop().padEnd(22), JSON.stringify(r))
}
await b.close()
