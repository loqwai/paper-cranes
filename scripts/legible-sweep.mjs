// THE RECOGNITION TEST for 4.frag. Two grids:
//   A. LEGIBLE 0 -> 1 on one mon, to see the figure/ground lever work (and to confirm
//      LEGIBLE=0 really does reproduce 3.frag).
//   B. all 11 mon at the best LEGIBLE, which is the actual acceptance test: can the bead
//      be NAMED? Rendered at navZoom 0.14 (the dense field framing) because a wall of many
//      beads is the situation the project is actually for.
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
  + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=0.9&knob_169=0.28&paletteShift=1.35&theme=0'

const MON = ['suhama','ogi','kikyo','ume','katabami','tomoe','mokko','kikko','kiku','matsukawa','hakkaku']

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 620, height: 620 } })
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })

  const shoot = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 15000 })
    await page.waitForTimeout(2300)
    // mean luminance guards against a silently black frame (a GLSL compile failure)
    const lum = await page.evaluate(() => {
      const cv = document.querySelector('canvas')
      const g = document.createElement('canvas'); g.width = 48; g.height = 48
      const cx = g.getContext('2d'); cx.drawImage(cv, 0, 0, 48, 48)
      const d = cx.getImageData(0, 0, 48, 48).data
      let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]
      return +(s / (d.length / 4)).toFixed(2)
    })
    const b64 = (await page.screenshot({ type: 'jpeg', quality: 86 })).toString('base64')
    return { b64, lum }
  }
  const sheet = (title, sub, tiles, cols) => `<style>
    body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
    h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
    .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;padding:0 14px 18px}
    figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
    figcaption{margin-top:5px;font-size:11px;color:#b9b9cc;line-height:1.3}
  </style><h1>${title}</h1><div class="sub">${sub}</div>
  <div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`

  const out = await browser.newPage({ viewport: { width: 1560, height: 1000 } })

  const a = []
  for (const L of [0, 0.25, 0.55, 0.8, 1.0]) {
    for (const z of [0.14, 0.30]) {
      process.stdout.write(`L${L}z${z} `)
      const r = await shoot(`${BASE}&image=images/beads/mon-kikyo.png&navZoom=${z}&legible=${L}`)
      a.push({ label: `legible ${L}   navZoom ${z}   lum ${r.lum}`, b64: r.b64 })
    }
  }
  await out.setContent(sheet('LEGIBLE lever — figure/ground separation (mon-kikyo)',
    `lattice-bead/${SH}.frag · legible 0 must reproduce 3.frag exactly`, a, 5))
  await out.screenshot({ path: 'journals/lab/shots/legible-lever.png', fullPage: true })

  const b = []
  for (const m of MON) {
    process.stdout.write(`${m} `)
    const r = await shoot(`${BASE}&image=images/beads/mon-${m}.png&navZoom=0.14&legible=1.0`)
    b.push({ label: `${m}   lum ${r.lum}`, b64: r.b64 })
  }
  await out.setContent(sheet('RECOGNITION TEST — all 11 mon at legible=1.0',
    `lattice-bead/${SH}.frag · navZoom=0.14 · CAN YOU NAME THE BEAD?`, b, 4))
  await out.screenshot({ path: 'journals/lab/shots/legible-mon.png', fullPage: true })

  await browser.close()
  console.log('\nconsole errors:', errs.length ? errs.slice(0, 3) : 'none')
  console.log('wrote legible-lever.png + legible-mon.png')
}
run().catch(e => { console.error(e); process.exit(1) })
