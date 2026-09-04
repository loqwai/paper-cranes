// SIZE SWEEP. The legible lever alone moved luminance only 103.4 -> 106.6, because at the
// shipped knob_169 = 0.28 a seed cell is exp2(mix(-6,2,0.28)) = 0.074 in uv - tens of beads
// across the frame, each a few pixels wide. Nothing makes a shape that small nameable.
// This sweeps the cell up to where ONE bead fills the frame:
//   k 0.55 -> pitch 0.33   k 0.65 -> 0.57   k 0.75 -> 1.00   k 0.85 -> 1.74   k 0.95 -> 3.03
// crossed with navZoom, at legible=1 so the edge is as clean as the shader can make it.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 4
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}&controller=lattice-nav`
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
  + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=1.0&paletteShift=1.35&theme=0'

const MON = ['suhama','ogi','kikyo','ume','katabami','tomoe','mokko','kikko','kiku','matsukawa','hakkaku']
const sheet = (title, sub, tiles, cols) => `<style>
  body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
  h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;padding:0 14px 18px}
  figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
  figcaption{margin-top:5px;font-size:11px;color:#b9b9cc;line-height:1.3}
</style><h1>${title}</h1><div class="sub">${sub}</div>
<div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 620, height: 620 } })
  const out = await browser.newPage({ viewport: { width: 1560, height: 1080 } })
  const shoot = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 15000 })
    await page.waitForTimeout(2300)
    return (await page.screenshot({ type: 'jpeg', quality: 86 })).toString('base64')
  }

  const a = []
  for (const k of [0.55, 0.65, 0.75, 0.85, 0.95])
    for (const z of [0.14, 0.30, 0.62]) {
      process.stdout.write(`k${k}z${z} `)
      a.push({ label: `knob_169 ${k}  (pitch ${Math.pow(2, -6 + 8 * k).toFixed(2)})  navZoom ${z}`,
        b64: await shoot(`${BASE}&image=images/beads/mon-kikyo.png&knob_169=${k}&navZoom=${z}&legible=1`) })
    }
  await out.setContent(sheet('Bead SIZE — knob_169 x navZoom, legible=1',
    `lattice-bead/${SH}.frag · does one bead ever fill the frame?`, a, 3))
  await out.screenshot({ path: 'journals/lab/shots/bigbead-size.png', fullPage: true })

  const K = process.env.BEST_K || '0.85'
  const Z = process.env.BEST_Z || '0.30'
  const b = []
  for (const m of MON) {
    process.stdout.write(`${m} `)
    b.push({ label: m, b64: await shoot(`${BASE}&image=images/beads/mon-${m}.png&knob_169=${K}&navZoom=${Z}&legible=1`) })
  }
  await out.setContent(sheet(`RECOGNITION — all 11 mon, knob_169=${K} navZoom=${Z} legible=1`,
    `lattice-bead/${SH}.frag · CAN YOU NAME THE BEAD?`, b, 4))
  await out.screenshot({ path: 'journals/lab/shots/bigbead-mon.png', fullPage: true })

  await browser.close()
  console.log('\nwrote bigbead-size.png + bigbead-mon.png')
}
run().catch(e => { console.error(e); process.exit(1) })
