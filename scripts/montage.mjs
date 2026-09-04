// Contact-sheet builder: render a list of URL variants and composite them into one
// labelled PNG. Renders sequentially in ONE page — parallel tabs get rAF-throttled in
// the background and come back stale or black.
import { chromium } from 'playwright'
import fs from 'node:fs'

const PORT = process.env.PORT || 6994
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/2&controller=lattice-nav`
    + '&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&knob_1=0.429&navZoom=0.62'
    + '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&time=8&evoPhase=5.5&evoWarp=0.5&evoPlasma=0.5'
    + '&flowPhase=0.4&morphPhase=0.3&warpGrow=2&flybyZoom=0&navX=0&navY=0&quietGate=1'
    + '&energySpring=0.55&waveletBassSpring=0.6&waveletBand1Spring=0.5&waveletBand2Spring=0.5'
    + '&waveletBand3Spring=0.45&waveletBand4Spring=0.45&waveletBand5Spring=0.5&waveletCentroidSpring=0.5'
    + '&melodyFlow=0.5&wubDepth=0.3&sectionMode=1&sectionMix=1&bassNoteFlow=0.4'
    + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.35&pitchClassMedian=0.5'
    + '&spectralEntropyMedian=0.8&spectralKurtosisMedian=0.5&spectralSkewMedian=0.5&spectralSpreadMedian=0.26'
    + '&bass=0.4&mids=0.4&treble=0.4&energy=0.4&spectralFlux=0.3&spectralFluxNormalized=0.4'
    + '&spectralFluxZScore=0&spectralRoughnessZScore=0&spectralCrest=0.5&spectralEntropy=0.8'
    + '&spectralKurtosis=0.5&spectralRoughness=0.35&spectralSkew=0.5&spectralSpread=0.26'
    + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=0.9&knob_169=0.28'

const MON = ['suhama','ogi','kikyo','ume','katabami','tomoe','mokko','kikko','kiku','matsukawa','hakkaku']

// paletteShift moves the whole hue journey; K166 chroma gain; K164 lightness ceiling.
const SCHEMES = [
  { label: 'LEGACY pastel\nK166=0.25 K164=0.933 pShift=1.7', q: '&paletteShift=1.7&knob_166=0.25&knob_164=0.933' },
  { label: 'SHIPPED neon\nK166=0.7 K164=0.622 pShift=1.7',   q: '&paletteShift=1.7&knob_166=0.7&knob_164=0.622' },
  { label: 'Deep violet\nK166=0.7 K164=0.45 pShift=1.7',     q: '&paletteShift=1.7&knob_166=0.7&knob_164=0.45' },
  { label: 'Cyan/teal\npShift=0.15',                          q: '&paletteShift=0.15&knob_166=0.7&knob_164=0.622' },
  { label: 'Ember orange\npShift=0.45',                       q: '&paletteShift=0.45&knob_166=0.7&knob_164=0.622' },
  { label: 'Acid green\npShift=0.75',                         q: '&paletteShift=0.75&knob_166=0.7&knob_164=0.622' },
  { label: 'Hot pink\npShift=1.05',                           q: '&paletteShift=1.05&knob_166=0.7&knob_164=0.622' },
  { label: 'Ice blue\npShift=1.35',                           q: '&paletteShift=1.35&knob_166=0.7&knob_164=0.622' },
  { label: 'Max chroma\nK166=0.95 K164=0.55 pShift=0.15',     q: '&paletteShift=0.15&knob_166=0.95&knob_164=0.55' },
  { label: 'Dark moody\nK166=0.55 K164=0.30 pShift=0.9',      q: '&paletteShift=0.9&knob_166=0.55&knob_164=0.30' },
]

const shoot = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(2600)                       // let the feedback trail settle
  return (await page.screenshot({ type: 'jpeg', quality: 88 })).toString('base64')
}

const sheet = (title, tiles, cols) => `<style>
  body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
  h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;padding:0 14px 18px}
  figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
  figcaption{margin-top:5px;font-size:11px;color:#b9b9cc;white-space:pre-line;line-height:1.3}
</style><h1>${title}</h1><div class="sub">lattice-bead/2.frag &middot; frozen frame (time=8) &middot; seed grid K168=0.9 K169=0.28</div>
<div class="g">${tiles.map(t => `<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 560, height: 560 } })

  const beadTiles = []
  for (const m of MON) {
    process.stdout.write(`bead ${m} `)
    beadTiles.push({ label: m, b64: await shoot(page, `${BASE}&paletteShift=1.7&image=images/beads/mon-${m}.png`) })
  }
  const palTiles = []
  for (const s of SCHEMES) {
    process.stdout.write(`pal ${s.label.split('\n')[0]} `)
    palTiles.push({ label: s.label, b64: await shoot(page, `${BASE}&image=images/beads/mon-kikyo.png${s.q}`) })
  }

  const out = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
  await out.setContent(sheet('All 11 bead variants', beadTiles, 4))
  await out.screenshot({ path: 'journals/lab/shots/beads-all.png', fullPage: true })
  await out.setContent(sheet('Colour schemes (mon-kikyo)', palTiles, 5))
  await out.screenshot({ path: 'journals/lab/shots/palettes.png', fullPage: true })

  await browser.close()
  console.log('\nwrote journals/lab/shots/beads-all.png + palettes.png')
}
run().catch(e => { console.error(e); process.exit(1) })
