// Renders the 11 mon at the recognition recipe for the gallery page, at presentation size.
// Recipe (found by sweep): knob_169=0.60, navZoom=0.14, legible=1, knob_168=1.0.
import { chromium } from 'playwright'
import fs from 'fs/promises'

const PORT = process.env.PORT || 6994
const PARAMS = '&controller=lattice-nav&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&knob_1=0.429&time=8'
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
  + '&theme=0&paletteShift=1.35'

const MON = [
  ['suhama', 'three-mound sandbar'], ['ogi', 'folded fan'], ['kikyo', 'bellflower'],
  ['ume', 'plum blossom'], ['katabami', 'wood sorrel'], ['tomoe', 'comma and tail'],
  ['mokko', 'melon quatrefoil'], ['kikko', 'tortoise-shell hexagon'], ['kiku', 'chrysanthemum'],
  ['matsukawa', 'pine-bark lozenge'], ['hakkaku', 'eight-pointed star'],
]
const live = (m) => `/?shader=redaphid/wip/lattice-bead/4`
  + `&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls`
  + `&image=images/beads/mon-${m}.png&knob_161=1&knob_168=1.0&knob_169=0.60`
  + `&legible=1&navZoom=0.14&autofly=1&wavelet=true&onset_refractory_ms=380`
  + `&fullscreen=true&theme=0&paletteShift=1.35`

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 760, height: 760 } })
  const out = []
  for (const [m, desc] of MON) {
    process.stdout.write(`${m} `)
    await page.goto(`http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/4${PARAMS}&image=images/beads/mon-${m}.png`,
      { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 15000 })
    await page.waitForTimeout(2400)
    out.push({ name: m, note: desc, live: live(m),
      b64: (await page.screenshot({ type: 'jpeg', quality: 82 })).toString('base64') })
  }
  await browser.close()
  await fs.writeFile('journals/lab/shots/gallery-mon.json', JSON.stringify(out))
  console.log('\nwrote gallery-mon.json (' + out.length + ')')
}
run().catch(e => { console.error(e); process.exit(1) })
