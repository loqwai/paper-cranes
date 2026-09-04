// Now that the mon are individually legible, mon x palette is a genuinely large variety space
// (each cell is a DIFFERENT recognisable shape, not the same wash re-tinted). This checks the
// curated palettes still hold at legible=1, where the interior is flattened toward bead ink and
// the palette therefore has less texture to hide in.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/4&controller=lattice-nav`
  + '&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&knob_1=0.429&time=8'
  + '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&evoPhase=5.5&evoWarp=0.5&evoPlasma=0.5'
  + '&flowPhase=0.4&morphPhase=0.3&warpGrow=2&flybyZoom=0&navX=0&navY=0&quietGate=1'
  + '&energySpring=0.55&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.5'
  + '&waveletBand3Spring=0.45&waveletBand4Spring=0.45&waveletBand5Spring=0.5&waveletCentroidSpring=0.5'
  + '&melodyFlow=0.5&wubDepth=0.3&sectionMode=1&sectionMix=1&bassNoteFlow=0.4'
  + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.35&pitchClassMedian=0.5'
  + '&spectralEntropyMedian=0.8&spectralKurtosisMedian=0.5&spectralSkewMedian=0.5&spectralSpreadMedian=0.26'
  + '&bass=0.4&mids=0.4&treble=0.4&energy=0.4&spectralFlux=0.3&spectralFluxNormalized=0.4'
  + '&spectralFluxZScore=0&spectralRoughnessZScore=0&spectralCrest=0.5&spectralEntropy=0.8'
  + '&spectralKurtosis=0.5&spectralRoughness=0.35&spectralSkew=0.5&spectralSpread=0.26'
  + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1'

const MON = ['hakkaku', 'tomoe', 'kiku', 'matsukawa']
const PAL = [['Jade', 0, 1.35], ['Deep Cyan', 1, 0.45], ['Ember', 1, 1.05], ['Violet', 1, 0.75], ['Acid Lime', 0, 0.15]]

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 560, height: 560 } })
  const tiles = []
  for (const m of MON)
    for (const [pn, th, ps] of PAL) {
      process.stdout.write(`${m}/${pn} `)
      await page.goto(`${BASE}&image=images/beads/mon-${m}.png&theme=${th}&paletteShift=${ps}`,
        { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('canvas', { timeout: 15000 })
      await page.waitForTimeout(2200)
      tiles.push({ label: `${m} — ${pn}`, b64: (await page.screenshot({ type: 'jpeg', quality: 84 })).toString('base64') })
    }
  const out = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
  await out.setContent(`<style>
    body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
    h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
    .g{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:0 14px 18px}
    figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
    figcaption{margin-top:5px;font-size:11px;color:#b9b9cc}
  </style><h1>Legible bead &times; palette</h1><div class="sub">lattice-bead/4.frag &middot; legible=1 knob_169=0.60 navZoom=0.14</div>
  <div class="g">${tiles.map(t => `<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
  await out.screenshot({ path: 'journals/lab/shots/legible-palette.png', fullPage: true })
  await browser.close()
  console.log('\nwrote legible-palette.png')
}
run().catch(e => { console.error(e); process.exit(1) })
