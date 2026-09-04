// CURATED GALLERY. Renders the hand-picked good looks from the theme x paletteShift x navZoom
// sweep at presentation size and emits a self-contained HTML gallery with the playable URL for
// each. Curation rules applied: paletteShift 1.7 is EXCLUDED (it is the washed pink/lilac the
// user called "fuzzy terrible fuchsia" - and it is the shipped default), and theme 3 is
// excluded (ls=1.20 blows the pastel out across every hue).
import { chromium } from 'playwright'
import fs from 'fs/promises'

const PORT = process.env.PORT || 6994
const SH = 3
const PREVIEW = 'https://lab-substrate2.paper-cranes-visuals.pages.dev'

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
  + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=0.9&knob_169=0.28&image=images/beads/mon-kikyo.png'

// LIVE url = what you actually play: real audio, wavelet on, onset locked, touch dials, autofly.
const live = (o) => `/?shader=redaphid/wip/lattice-bead/${SH}`
  + `&controller=wavelet-ease&controller=lattice-nav&controller=lattice-controls`
  + `&image=images/beads/mon-${o.mon||'kikyo'}.png&knob_161=1&knob_168=0.9&knob_169=0.28`
  + `&autofly=1&wavelet=true&onset_refractory_ms=380&fullscreen=true`
  + `&theme=${o.theme}&paletteShift=${o.ps}&navZoom=${o.z}`

const LOOKS = [
  { name:'Jade Field',      theme:0, ps:1.35, z:0.14, note:'emerald + orange complementaries, dense cell field' },
  { name:'Deep Cyan',       theme:1, ps:0.45, z:0.30, note:'darkest theme, richest blue — the vj9 constants' },
  { name:'Ember',           theme:1, ps:1.05, z:0.30, note:'hot red/orange on a dark ground' },
  { name:'Violet Ink',      theme:1, ps:0.75, z:0.22, note:'magenta/violet, deep and saturated' },
  { name:'Acid Lime',       theme:0, ps:0.15, z:0.14, note:'lime/olive, the most unusual hue in the set' },
  { name:'Cyan Field',      theme:2, ps:0.45, z:0.14, note:'midtone cyan, dense — reads well from far' },
  { name:'Ember Close',     theme:1, ps:1.05, z:0.62, note:'same ember, big soft lobes' },
  { name:'Jade Close',      theme:0, ps:1.35, z:0.62, note:'jade at lobe scale' },
  { name:'Midnight Violet', theme:1, ps:0.75, z:0.14, note:'violet at field scale — the darkest look' },
  { name:'Ice',             theme:2, ps:1.35, z:0.22, note:'cool jade/teal, midtone lift' },
  { name:'Ember Field',     theme:0, ps:1.05, z:0.14, note:'ember at field scale, luminous theme' },
  { name:'Lime Close',      theme:2, ps:0.15, z:0.50, note:'lime, midtone, close framing' },
]

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport:{ width:760, height:760 } })
  const tiles = []
  for (const L of LOOKS) {
    process.stdout.write(`${L.name} `)
    const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}${PARAMS}&theme=${L.theme}&paletteShift=${L.ps}&navZoom=${L.z}`
    await page.goto(url, { waitUntil:'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout:15000 })
    await page.waitForTimeout(2400)
    const b64 = (await page.screenshot({ type:'jpeg', quality:82 })).toString('base64')
    tiles.push({ ...L, b64, live: live(L) })
  }
  await browser.close()
  await fs.writeFile('journals/lab/shots/gallery-looks.json', JSON.stringify(tiles.map(t=>({name:t.name,theme:t.theme,ps:t.ps,z:t.z,note:t.note,live:t.live})), null, 1))
  await fs.writeFile('journals/lab/shots/gallery-tiles.json', JSON.stringify(tiles))
  console.log('\nwrote gallery-tiles.json  (' + tiles.length + ' looks)')
}
run().catch(e=>{console.error(e);process.exit(1)})
