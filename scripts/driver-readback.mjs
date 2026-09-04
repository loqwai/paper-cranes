// Decisive check: in the DETERMINISTIC harness (no controllers), does a driver passed as a URL
// param actually reach the shader as a feature? If it reads back as the URL value, the plumbing
// is fine and any lack of visible effect is an AMPLITUDE question. If it reads 0 or undefined,
// the uniform is never set and the breathing's audio term is a constant.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const URL_ = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/detail`
  + '&noaudio=true&fullscreen=true&knob_161=1&time=8&quietGate=1'
  + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&theme=1&paletteShift=0.45'
  + '&image=images/beads/mon-hakkaku.png&detail=0.0001&breathe=0.85'
  + '&spectralEntropySmooth=0.875&spectralSpreadRSquared=0.222&spectralSkewMedian=0.515'
  + '&spectralCrestSmooth=0.333&waveletCentroidSpring=0.444'

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 400, height: 400 } })
  await p.goto(URL_, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas')
  await p.waitForTimeout(2200)
  const got = await p.evaluate(() => {
    const f = window.cranes.flattenFeatures()
    const pick = k => (typeof f[k] === 'number' ? +f[k].toFixed(4) : String(f[k]))
    return {
      spectralEntropySmooth: pick('spectralEntropySmooth'),   // expect 0.875
      spectralSpreadRSquared: pick('spectralSpreadRSquared'), // expect 0.222
      spectralSkewMedian: pick('spectralSkewMedian'),         // expect 0.515
      spectralCrestSmooth: pick('spectralCrestSmooth'),       // expect 0.333
      waveletCentroidSpring: pick('waveletCentroidSpring'),   // expect 0.444
      breathe: pick('breathe'), detail: pick('detail'),
    }
  })
  console.log(JSON.stringify(got, null, 1))
  await br.close()
}
run().catch(e => { console.error(e); process.exit(1) })
