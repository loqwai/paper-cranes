// mean luminance + edge energy (mean |grad|) over saved PNGs
import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const files = process.argv.slice(2)
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
for (const f of files) {
  const uri = 'data:image/png;base64,' + (await readFile(f)).toString('base64')
  const r = await p.evaluate(async (u) => {
    const img = new Image(); img.src = u; await img.decode()
    const W = 384, H = Math.round(384 * img.height / img.width)
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H)
    const d = x.getImageData(0, 0, W, H).data
    const L = new Float64Array(W * H)
    for (let i = 0, j = 0; i < d.length; i += 4, j++) L[j] = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255
    let s = 0, e = 0, n = 0
    for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
      const k = y*W + xx
      e += Math.abs(L[k] - L[k+1]) + Math.abs(L[k] - L[k+W]); n++
    }
    for (let i = 0; i < L.length; i++) s += L[i]
    return { mean: +(s/L.length).toFixed(4), edge: +(e/n).toFixed(4) }
  }, uri)
  console.log(f.split('/').pop().padEnd(30), 'mean', r.mean, ' edge', r.edge)
}
await b.close()
