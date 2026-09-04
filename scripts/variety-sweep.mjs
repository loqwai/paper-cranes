// VARIETY SWEEP. The bead sweep proved the mon axis is saturated (7.9pt spread) and the
// recog sweep proved seed PITCH is a dead lever at fixed framing. The levers that actually
// move the image are: theme (4 palette constant-sets), paletteShift (hue rotation),
// navZoom (framing / how close the lattice is) and LV_RICH/LV_LCEIL chroma+ceiling.
// This renders the cross-product so the good looks can be CURATED, not guessed.
import { chromium } from 'playwright'
import fs from 'fs/promises'

const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 3
// NOTE: controller=lattice-nav must be present for nav* params to be consumed as framing.
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
  + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=0.9&knob_169=0.28&image=images/beads/mon-kikyo.png'

const shoot = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(2200)
  return (await page.screenshot({ type:'jpeg', quality:84 })).toString('base64')
}
const sheet = (title, sub, tiles, cols) => `<style>
  body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
  h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:9px;padding:0 14px 18px}
  figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
  figcaption{margin-top:4px;font-size:10.5px;color:#b9b9cc;white-space:pre-line;line-height:1.3}
</style><h1>${title}</h1><div class="sub">${sub}</div>
<div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport:{width:600,height:600} })
  const out  = await browser.newPage({ viewport:{width:1600,height:1000} })

  // A. FRAMING: does navZoom pull us in to one bead?
  const zt = []
  for (const z of [0.0, 0.14, 0.22, 0.30, 0.40, 0.50, 0.62, 0.78]) {
    process.stdout.write(`z${z} `)
    zt.push({ label:`navZoom ${z}`, b64: await shoot(page, `${BASE}&paletteShift=1.7&navZoom=${z}`) })
  }
  await out.setContent(sheet('Framing — navZoom', `lattice-bead/${SH}.frag · mon-kikyo · time=8`, zt, 4))
  await out.screenshot({ path:'journals/lab/shots/var-zoom.png', fullPage:true })

  // B. THEME x PALETTE SHIFT: the real variety grid
  const tt = []
  for (const th of [0,1,2,3])
    for (const ps of [0.15, 0.45, 0.75, 1.05, 1.35, 1.7]) {
      process.stdout.write(`t${th}p${ps} `)
      tt.push({ label:`theme ${th}  pShift ${ps}`, b64: await shoot(page, `${BASE}&navZoom=0.30&theme=${th}&paletteShift=${ps}`) })
    }
  await out.setContent(sheet('Variety grid — theme x paletteShift',
    `lattice-bead/${SH}.frag · navZoom=0.30 · 0 luminous / 1 vj9 / 2 midtone / 3 contrast`, tt, 6))
  await out.screenshot({ path:'journals/lab/shots/var-theme.png', fullPage:true })
  await fs.writeFile('journals/lab/shots/var-theme.html', sheet('theme x paletteShift', SH, tt, 6))

  await browser.close()
  console.log('\nwrote var-zoom.png + var-theme.png')
}
run().catch(e=>{console.error(e);process.exit(1)})
