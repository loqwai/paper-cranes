// My numeric chirality proxy failed: symmetric controls (hakkaku 8-fold, kikko hexagon) scored
// as "chiral" as tomoe, because self-mirroring an off-centre crop of a TILED field measures the
// tiling's phase, not the motif's chirality. So render it and LOOK — two framings, because the
// comma may read at one scale and not another.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/detail`
  + '&noaudio=true&fullscreen=true&knob_161=1&time=8&quietGate=1&knob_168=1.0'
  + '&legible=1&theme=1&paletteShift=0.45&onsetStrength=0&timeSinceOnset=9&energySpring=0.5'
  + '&negative=0.9&detail=0.85&breathe=0.0001&sweep=0.0001'
  + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.5&spectralEntropySmooth=0.5'
  + '&waveletCentroidSpring=0.5&waveletBand5Spring=0.5&waveletBassSpring=0.5'
  + '&spectralSpreadRSquared=0.145&spectralSkewMedian=0.5&spectralKurtosisMedian=0.5'
  + '&spectralSpreadMedian=0.26'

const V = [
  ['tomoe', 0.60, 0.14],
  ['tomoe', 0.72, 0.24],
  ['ogi', 0.60, 0.14],
  ['katabami', 0.60, 0.14],
]

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 520, height: 520 } })
  const tiles = []
  for (const [m, k, z] of V) {
    process.stdout.write(`${m}/${k}/${z} `)
    await p.goto(`${B}&image=images/beads/mon-${m}.png&knob_169=${k}&navZoom=${z}`,
      { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas')
    await p.waitForTimeout(2200)
    tiles.push({
      label: `${m} · pitch ${k} · navZoom ${z}`,
      b64: (await p.screenshot({ type: 'jpeg', quality: 92 })).toString('base64'),
    })
  }
  const out = await br.newPage({ viewport: { width: 1100, height: 660 } })
  await out.setContent(`<style>
    body{margin:0;background:#0b0b0f;font:13px -apple-system,sans-serif;color:#e8e8f0}
    h1{font-size:18px;margin:14px 16px 3px}.sub{margin:0 16px 12px;color:#8b8ba0;font-size:12px}
    .g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 14px 16px;max-width:1060px}
    figure{margin:0}img{width:100%;display:block;border-radius:5px;background:#000}
    figcaption{margin-top:4px;font-size:12px;color:#b9b9cc}
  </style>
  <h1>Does the tomoe comma read?</h1>
  <div class="sub">detail.frag &middot; the critic called it "an egg with a scratch on it" &middot; ogi and katabami for reference</div>
  <div class="g">${tiles.map(t => `<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
  await out.screenshot({ path: 'journals/lab/shots/tomoe-look.png', fullPage: true })
  await br.close()
  console.log('\nwrote tomoe-look.png')
}
run().catch(e => { console.error(e); process.exit(1) })
