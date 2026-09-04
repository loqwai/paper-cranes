// Does carving the eroded band actually SEPARATE crests that share an outline?
// The critic's sharpest failure was "kikyo and ume are the same picture", so that pair is the
// test. Grid A puts them side by side across NEGATIVE 0 -> 1. Grid B is all eleven at the best
// setting, in Deep Cyan (theme 1 / paletteShift 0.45), judged the only scheme that reads as
// chosen rather than sampled.
//
// It also MEASURES the separation rather than asserting it: mean absolute pixel difference
// between the kikyo and ume renders at each NEGATIVE. If carving works, that number rises.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const SH = 'negative'
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
  + '&pitchClass=0.5&pitchClassMean=0.5&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1'

const PAL = process.env.PAL || '&theme=1&paletteShift=0.45'   // Deep Cyan
const MON = ['suhama','ogi','kikyo','ume','katabami','tomoe','mokko','kikko','kiku','matsukawa','hakkaku']
const sheet = (title, sub, tiles, cols) => `<style>
  body{margin:0;background:#0b0b0f;font:13px/1.35 -apple-system,Segoe UI,sans-serif;color:#e8e8f0}
  h1{font-size:19px;margin:16px 18px 4px} .sub{margin:0 18px 14px;color:#8b8ba0;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;padding:0 14px 18px}
  figure{margin:0} img{width:100%;display:block;border-radius:5px;background:#000}
  figcaption{margin-top:5px;font-size:11px;color:#b9b9cc}
</style><h1>${title}</h1><div class="sub">${sub}</div>
<div class="g">${tiles.map(t=>`<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } })
  const out = await browser.newPage({ viewport: { width: 1500, height: 1080 } })
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })

  const shoot = async (url) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 15000 })
    await page.waitForTimeout(2300)
    const raw = await page.evaluate(() => {
      const cv = document.querySelector('canvas')
      const g = document.createElement('canvas'); g.width = 120; g.height = 120
      const cx = g.getContext('2d'); cx.drawImage(cv, 0, 0, 120, 120)
      return Array.from(cx.getImageData(0, 0, 120, 120).data)
    })
    const b64 = (await page.screenshot({ type: 'jpeg', quality: 86 })).toString('base64')
    return { b64, raw }
  }
  const mad = (a, b) => { let s = 0, n = 0
    for (let i = 0; i < a.length; i += 4) { s += Math.abs(a[i]-b[i]) + Math.abs(a[i+1]-b[i+1]) + Math.abs(a[i+2]-b[i+2]); n++ }
    return +(s / n / 3).toFixed(2) }
  const blackFrac = a => { let k = 0, n = 0
    for (let i = 0; i < a.length; i += 4) { if (a[i] < 24 && a[i+1] < 24 && a[i+2] < 24) k++; n++ }
    return +(100 * k / n).toFixed(1) }

  // A. kikyo vs ume across NEGATIVE — the discriminating pair
  const tiles = [], sep = []
  for (const N of [0, 0.4, 0.7, 1.0]) {
    const k = await shoot(`${BASE}${PAL}&image=images/beads/mon-kikyo.png&negative=${N}`)
    const u = await shoot(`${BASE}${PAL}&image=images/beads/mon-ume.png&negative=${N}`)
    const d = mad(k.raw, u.raw)
    sep.push({ N, kikyo_vs_ume: d, black_kikyo: blackFrac(k.raw) })
    process.stdout.write(`N=${N} sep=${d} `)
    tiles.push({ label: `kikyo  negative ${N}`, b64: k.b64 })
    tiles.push({ label: `ume    negative ${N}   separation ${d}`, b64: u.b64 })
  }
  await out.setContent(sheet('Does carving separate kikyo from ume?',
    `negative.frag · Deep Cyan · higher separation = more distinguishable`, tiles, 4))
  await out.screenshot({ path: 'journals/lab/shots/negative-pair.png', fullPage: true })

  // B. all eleven at the best setting
  const N = process.env.BEST_N || '1.0'
  const t2 = []
  for (const m of MON) {
    process.stdout.write(`${m} `)
    const r = await shoot(`${BASE}${PAL}&image=images/beads/mon-${m}.png&negative=${N}`)
    t2.push({ label: m, b64: r.b64 })
  }
  await out.setContent(sheet(`All eleven with the black let in — negative=${N}`,
    `negative.frag · Deep Cyan (theme 1 / paletteShift 0.45) · CAN YOU NAME THE BEAD?`, t2, 4))
  await out.screenshot({ path: 'journals/lab/shots/negative-mon.png', fullPage: true })

  await browser.close()
  console.log('\nseparation curve:', JSON.stringify(sep))
  console.log('console errors:', errs.length ? errs.slice(0, 3) : 'none')
}
run().catch(e => { console.error(e); process.exit(1) })
