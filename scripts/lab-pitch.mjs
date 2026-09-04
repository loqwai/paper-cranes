// On-screen CELL PITCH in px per fold level, by threshold-crossing density.
// (Autocorrelation fails here: an image's autocorrelation decays monotonically from lag 0, so
// "first local max" locks onto decay noise. Line-work has a cleaner signature - count how many
// times a scanline crosses up through a threshold; that is one crossing per drawn cell boundary.)
// Sanity check: the lattice halves its domain each level (scale *= gScale ~ 2), so successive
// pitches MUST come out in a ~2:1 ratio. Analytic prediction for comparison:
//   1 world unit = res.y / (0.07/navZoom) px ; pitch_i = that / gScale^(i+1)
import { chromium } from 'playwright'
import { readFile } from 'fs/promises'
const files = process.argv.slice(2)
const b = await chromium.launch({ headless: true }); const p = await b.newPage()
for (const f of files) {
  const uri = 'data:image/png;base64,' + (await readFile(f)).toString('base64')
  const r = await p.evaluate(async (u) => {
    const img = new Image(); img.src = u; await img.decode()
    const W = img.width, H = img.height
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, W, H).data
    const L = new Float64Array(W*H)
    for (let i=0,j=0;i<d.length;i+=4,j++) L[j] = (0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255
    let m=0; for (let i=0;i<L.length;i++) m+=L[i]; m/=L.length
    let v=0; for (let i=0;i<L.length;i++) v+=(L[i]-m)**2; const sd=Math.sqrt(v/L.length)
    const T = m + 0.5*sd
    let up=0, lines=0
    for (let y=0;y<H;y+=3){ let prev=L[y*W]>T; let n=0
      for (let i=1;i<W;i++){ const cur=L[y*W+i]>T; if(cur&&!prev) n++; prev=cur }
      up+=n; lines++ }
    for (let xx=0;xx<W;xx+=3){ let prev=L[xx]>T; let n=0
      for (let i=1;i<H;i++){ const cur=L[i*W+xx]>T; if(cur&&!prev) n++; prev=cur }
      up+=n; lines++ }
    const perLine = up/lines
    return { size:`${W}x${H}`, crossingsPerScanline:+perLine.toFixed(2),
             pitchPx: perLine>0 ? +(W/perLine).toFixed(1) : null }
  }, uri)
  console.log(f.split('/').pop().padEnd(22), JSON.stringify(r))
}
await b.close()
