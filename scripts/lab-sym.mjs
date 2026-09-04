// Self-mirror test: how close is an image to its own vertical / horizontal mirror?
import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
for (const f of process.argv.slice(2)) {
  const d = 'data:image/png;base64,' + (await readFile(f)).toString('base64')
  const r = await p.evaluate(async (s) => {
    const im = new Image(); im.src = s; await im.decode()
    const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height })
    const g = c.getContext('2d'); g.drawImage(im, 0, 0)
    const px = g.getImageData(0, 0, c.width, c.height).data
    const L = (x, y) => { const i = (y * c.width + x) * 4; return 0.2126*px[i] + 0.7152*px[i+1] + 0.0722*px[i+2] }
    let hSum = 0, vSum = 0, n = 0
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      hSum += Math.abs(L(x, y) - L(c.width - 1 - x, y))   // mirror across vertical axis
      vSum += Math.abs(L(x, y) - L(x, c.height - 1 - y))  // mirror across horizontal axis
      n++
    }
    return { mirrorErrLeftRight: +(hSum/n).toFixed(2), mirrorErrTopBottom: +(vSum/n).toFixed(2) }
  }, d)
  console.log(f.split(/[\/]/).pop().padEnd(28), JSON.stringify(r))
}
await b.close()
