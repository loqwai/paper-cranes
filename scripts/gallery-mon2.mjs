// Re-render the eleven mon for the gallery on detail.frag with the CORRECTED palette.
//
// The published gallery's tiles were rendered on 4.frag with theme 0 + paletteShift 1.35 - the
// jet colormap the art critic called the ugliest thing in the set, and which was later measured
// to crush 13% of pixels. This re-renders on the bare default (0% crush) and on detail.frag,
// which has the interior structure that made tomoe, ogi and katabami legible.
import { chromium } from 'playwright'
import fs from 'fs/promises'

const PORT = process.env.PORT || 6994
const PREVIEW = 'https://lab-substrate2.paper-cranes-visuals.pages.dev'

// no theme / paletteShift: the bare default measured 0% gamut crush and the lowest flash
const PARAMS = '&noaudio=true&fullscreen=true&time=8&knob_161=1&quietGate=1'
  + '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029'
  + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&negative=0.9&detail=0.85'
  + '&breathe=0.0001&sweep=0.0001&energySpring=0.5&onsetStrength=0&timeSinceOnset=9'
  + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.5&spectralEntropySmooth=0.5'
  + '&waveletCentroidSpring=0.5&waveletBand5Spring=0.5&waveletBassSpring=0.5'
  + '&spectralSpreadRSquared=0.145&spectralSkewMedian=0.5&spectralKurtosisMedian=0.5'
  + '&spectralSpreadMedian=0.26'

const MON = [
  ['suhama', 'three-mound sandbar'], ['ogi', 'folded fan'], ['kikyo', 'bellflower'],
  ['ume', 'plum blossom'], ['katabami', 'wood sorrel'], ['tomoe', 'comma and tail'],
  ['mokko', 'melon quatrefoil'], ['kikko', 'tortoise-shell hexagon'], ['kiku', 'chrysanthemum'],
  ['matsukawa', 'pine-bark lozenge'], ['hakkaku', 'eight-pointed star'],
]
const live = (m) => `/?shader=redaphid/wip/lattice-bead/detail`
  + `&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls`
  + `&image=images/beads/mon-${m}.png&knob_161=1&knob_168=1.0&knob_169=0.60`
  + `&legible=1&negative=0.9&detail=0.85&navZoom0=0.14&autofly=1&wavelet=true`
  + `&onset_refractory_ms=380&fullscreen=true`

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 700, height: 700 } })
  const out = []
  for (const [m, desc] of MON) {
    process.stdout.write(`${m} `)
    await p.goto(`http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/detail${PARAMS}&image=images/beads/mon-${m}.png`,
      { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas', { timeout: 15000 })
    await p.waitForTimeout(2300)
    out.push({ name: m, note: desc, live: live(m),
      b64: (await p.screenshot({ type: 'jpeg', quality: 84 })).toString('base64') })
  }
  await br.close()
  await fs.writeFile('journals/lab/shots/gallery-mon.json', JSON.stringify(out))
  console.log('\nwrote gallery-mon.json (' + out.length + ') on the corrected palette')
}
run().catch(e => { console.error(e); process.exit(1) })
