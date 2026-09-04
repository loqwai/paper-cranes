import { chromium } from 'playwright'
import { readFile, writeFile } from 'fs/promises'
const [src, out, x, y, w, h, scale] = process.argv.slice(2)
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
const d = 'data:image/png;base64,' + (await readFile(src)).toString('base64')
const r = await p.evaluate(async ([s, x, y, w, h, k]) => {
  const im = new Image(); im.src = s; await im.decode()
  const c = Object.assign(document.createElement('canvas'), { width: w * k, height: h * k })
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  g.drawImage(im, x, y, w, h, 0, 0, w * k, h * k)
  return c.toDataURL('image/png')
}, [d, +x, +y, +w, +h, +scale])
await writeFile(out, Buffer.from(r.split(',')[1], 'base64'))
console.log('wrote', out)
await b.close()
