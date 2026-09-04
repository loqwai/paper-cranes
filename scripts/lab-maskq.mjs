// Keep ONLY the top-right quadrant of a mon SDF PNG; set the rest to "far outside"
// (G=255 -> d=+1 -> no boundary, nothing drawn). If the render is unchanged, the
// fractal's `uv = abs(p)` really does discard 3/4 of the motif.
import { chromium } from 'playwright'
import { readFile, writeFile } from 'fs/promises'
const [src, out] = process.argv.slice(2)
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
const d = 'data:image/png;base64,' + (await readFile(src)).toString('base64')
const res = await p.evaluate(async (src) => {
  const im = new Image(); im.src = src; await im.decode()
  const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height })
  const x = c.getContext('2d'); x.drawImage(im, 0, 0)
  const id = x.getImageData(0, 0, c.width, c.height), px = id.data
  const hw = c.width / 2, hh = c.height / 2
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
    const keep = (xx >= hw && y < hh)          // top-right quadrant as displayed
    if (keep) continue
    const i = (y * c.width + xx) * 4
    px[i] = 0; px[i+1] = 255; px[i+2] = 0; px[i+3] = 0   // G=255 => d=+1 (far outside)
  }
  x.putImageData(id, 0, 0)
  return c.toDataURL('image/png')
}, d)
await writeFile(out, Buffer.from(res.split(',')[1], 'base64'))
console.log('wrote', out)
await b.close()
