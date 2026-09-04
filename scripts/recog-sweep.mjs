// RECOGNITION SWEEP. The bead-variant sheet showed 11 near-identical tiles: the lattice fold
// dominates and the mon reads only as fine panel detail. The acceptance test is that a stranger
// can NAME the bead, so sweep the two levers that actually control how big one bead is in frame:
//   knob_169 seed PITCH (log-mapped exp2(mix(-6,2,k)))  and  navZoom (how far the lattice is)
// plus knob_168 seed AMOUNT (how strongly the bead grid lights over the fold).
import { chromium } from 'playwright'
import fs from 'fs/promises'

const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 3
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}`
  + '&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&time=8'
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
  + '&pitchClass=0.5&pitchClassMean=0.5&paletteShift=1.7'

const shoot = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 15000 })
  await page.waitForTimeout(2200)
  return (await page.screenshot({ type: 'jpeg', quality: 86 })).toString('base64')
}
const sheet = (title, sub, tiles, cols) => `<style>
  body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
  h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;padding:0 14px 18px}
  figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
  figcaption{margin-top:5px;font-size:11px;color:#b9b9cc;white-space:pre-line;line-height:1.3}
</style><h1>${title}</h1><div class="sub">${sub}</div>
<div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 620, height: 620 } })
  const out = await browser.newPage({ viewport: { width: 1560, height: 1000 } })

  // 1. SEED PITCH x SEED AMOUNT on one mon that has strong lobes (kikyo = 5-point bellflower)
  const tiles = []
  for (const k169 of [0.10, 0.18, 0.28, 0.40, 0.55]) {
    for (const k168 of [0.55, 0.9, 1.0]) {
      process.stdout.write(`p${k169}/a${k168} `)
      tiles.push({ label: `pitch ${k169}  amt ${k168}`,
        b64: await shoot(page, `${BASE}&image=images/beads/mon-kikyo.png&knob_169=${k169}&knob_168=${k168}`) })
    }
  }
  await out.setContent(sheet('Recognition: seed pitch x amount (mon-kikyo)',
    `lattice-bead/${SH}.frag · time=8 · does ONE bead ever fill the frame?`, tiles, 5))
  await out.screenshot({ path: 'journals/lab/shots/recog-pitch.png', fullPage: true })
  await fs.writeFile('journals/lab/shots/recog-pitch.html', sheet('Recognition: seed pitch x amount (mon-kikyo)', `lattice-bead/${SH}.frag`, tiles, 5))

  // 2. best-guess big pitch, ALL 11 mon -- the real recognition test
  const P = process.env.BIGPITCH || '0.55'
  const MON = ['suhama','ogi','kikyo','ume','katabami','tomoe','mokko','kikko','kiku','matsukawa','hakkaku']
  const t2 = []
  for (const m of MON) {
    process.stdout.write(`big ${m} `)
    t2.push({ label: m, b64: await shoot(page, `${BASE}&image=images/beads/mon-${m}.png&knob_169=${P}&knob_168=1.0`) })
  }
  await out.setContent(sheet(`Recognition test — all 11 mon at seed pitch ${P}`,
    `lattice-bead/${SH}.frag · knob_168=1.0 · CAN YOU NAME THE BEAD?`, t2, 4))
  await out.screenshot({ path: 'journals/lab/shots/recog-mon.png', fullPage: true })
  await browser.close()
  console.log('\nwrote recog-pitch.png + recog-mon.png')
}
run().catch(e=>{console.error(e);process.exit(1)})
