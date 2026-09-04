// What does this shader look like with NO parameters? That is what anyone opening it gets, and
// the critic called the default palette "the ugliest thing in the whole set, and ugly in a
// diagnostic way" - the jet colormap, "the visual signature of nobody having made a decision".
//
// Renders: the true bare default, then the same frame with each curated palette, all with SEEDS
// PINNED so the comparison is about the palette and not about a random per-context seed. (That
// unpinned seed is also the explanation for the "dusty pink" tomoe render last tick - not a
// palette bug, just an unseeded harness.)
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 'detail'
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}`
  + '&noaudio=true&fullscreen=true&time=8'
const SEEDS = '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029'
// the recognition framing + a settled audio state, so only the palette differs
const RIG = '&knob_161=1&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&quietGate=1'
  + '&negative=0.9&detail=0.85&breathe=0.0001&sweep=0.0001&energySpring=0.5'
  + '&onsetStrength=0&timeSinceOnset=9&image=images/beads/mon-hakkaku.png'
  + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.5&spectralEntropySmooth=0.5'
  + '&waveletCentroidSpring=0.5&waveletBand5Spring=0.5&waveletBassSpring=0.5'
  + '&spectralSpreadRSquared=0.145&spectralSkewMedian=0.5&spectralKurtosisMedian=0.5'
  + '&spectralSpreadMedian=0.26'

const V = [
  ['TRUE DEFAULT (no theme, no paletteShift)', ''],
  ['theme 0 · pShift 1.35  "Jade" (critic: jet colormap)', '&theme=0&paletteShift=1.35'],
  ['theme 1 · pShift 0.45  "Deep Cyan" (critic: best)', '&theme=1&paletteShift=0.45'],
  ['theme 1 · pShift 1.05  "Ember" (critic: second)', '&theme=1&paletteShift=1.05'],
  ['theme 1 · pShift 0.75  "Violet"', '&theme=1&paletteShift=0.75'],
  ['theme 2 · pShift 0.45', '&theme=2&paletteShift=0.45'],
]

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 480, height: 480 } })
  const tiles = []
  for (const [label, q] of V) {
    process.stdout.write('· ')
    await p.goto(BASE + SEEDS + RIG + q, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas'); await p.waitForTimeout(2200)
    const st = await p.evaluate(() => {
      const c = document.querySelector('canvas')
      const W = 400, sx = Math.floor((c.width - W) / 2), sy = Math.floor((c.height - W) / 2)
      const g = document.createElement('canvas'); g.width = W; g.height = W
      const x = g.getContext('2d'); x.drawImage(c, sx, sy, W, W, 0, 0, W, W)
      const d = x.getImageData(0, 0, W, W).data
      let s = 0, s2 = 0, n = 0, crush = 0
      const arr = []
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        s += l; s2 += l * l; n++; arr.push(l)
        if (d[i] < 2 || d[i + 1] < 2 || d[i + 2] < 2) crush++
      }
      arr.sort((a, b) => a - b)
      const m = s / n
      return { lum: +m.toFixed(1), contrast: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1),
               p999: +arr[Math.floor(n * 0.999)].toFixed(0), crush: +(100 * crush / n).toFixed(1) }
    })
    tiles.push({ label: `${label}\nlum ${st.lum} · contrast ${st.contrast} · p999 ${st.p999} · crush ${st.crush}%`,
                 b64: (await p.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'), st })
  }
  const out = await br.newPage({ viewport: { width: 1520, height: 1080 } })
  await out.setContent(`<style>
    body{margin:0;background:#0b0b0f;font:13px -apple-system,sans-serif;color:#e8e8f0}
    h1{font-size:18px;margin:14px 16px 3px}.sub{margin:0 16px 12px;color:#8b8ba0;font-size:12px}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 14px 16px}
    figure{margin:0}img{width:100%;display:block;border-radius:5px;background:#000}
    figcaption{margin-top:5px;font-size:11.5px;color:#b9b9cc;white-space:pre-line;line-height:1.35}
  </style>
  <h1>What do you get with no parameters?</h1>
  <div class="sub">${SH}.frag &middot; seeds pinned &middot; recognition framing &middot; only the palette differs</div>
  <div class="g">${tiles.map(t => `<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
  await out.screenshot({ path: 'journals/lab/shots/default-look.png', fullPage: true })
  await br.close()
  console.log('\n' + JSON.stringify(tiles.map((t, i) => ({ v: V[i][0], ...t.st })), null, 1))
}
run().catch(e => { console.error(e); process.exit(1) })
