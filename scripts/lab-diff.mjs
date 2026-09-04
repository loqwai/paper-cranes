import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const [a, b_] = process.argv.slice(2)
const br = await chromium.launch({ headless: true })
const p = await br.newPage()
const d = async f => 'data:image/png;base64,' + (await readFile(f)).toString('base64')
const r = await p.evaluate(async ([sa, sb]) => {
  const load = async s => { const i = new Image(); i.src = s; await i.decode(); return i }
  const [ia, ib] = await Promise.all([load(sa), load(sb)])
  const g = im => { const c = Object.assign(document.createElement('canvas'), {width: im.width, height: im.height})
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0,0,c.width,c.height).data }
  const pa = g(ia), pb = g(ib)
  let diff = 0, maxd = 0, n = pa.length / 4
  for (let i = 0; i < pa.length; i += 4) {
    const dl = Math.abs(pa[i]-pb[i]) + Math.abs(pa[i+1]-pb[i+1]) + Math.abs(pa[i+2]-pb[i+2])
    if (dl > 12) diff++
    if (dl > maxd) maxd = dl
  }
  return { diffPct: +(100*diff/n).toFixed(2), maxChannelDelta: maxd }
}, [await d(a), await d(b_)])
console.log(a.split(/[\/]/).pop(), 'vs', b_.split(/[\/]/).pop(), '->', JSON.stringify(r))
await br.close()
