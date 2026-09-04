// Does per-bead breathing actually scale the silhouettes, and is each bead keyed to a DIFFERENT
// driver? Pin iTime and the slow uniforms via URL (params override features every frame), then
// lattice-nav is DELIBERATELY ABSENT: it accumulates per-frame state between captures and put
// the noise floor at 15.5%, swamping the per-driver signal. navZoom is passed as a plain param
// instead, which pins it (fine here - no gestures in a headless determinism test).
// detail=0 ISOLATES breathing: the five quiet channels consume the same signals, so with them
// on, "all drivers moved" measures mostly THEM and the comparison is meaningless.
// change ONE driver at a time. spectralEntropySmooth is the ONLY driver used nowhere else in
// the shader, so it isolates breathing cleanly - spectralCrestSmooth also drives rim width and
// moved 23.4% of pixels with breathing OFF, which made it useless as a probe. If cells are individually keyed, moving one driver must shift
// SOME beads and leave others alone — a global scale would move all of them together.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/detail`
  + '&noaudio=true&fullscreen=true&knob_161=1&knob_144=0.02&time=8&quietGate=1'
  + '&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&evoPhase=5.5&flowPhase=0.4&morphPhase=0.3'
  + '&warpGrow=2&navX=0&navY=0&sectionMode=1&sectionMix=1&spectralEntropy=0.8&spectralSpread=0.26'
  + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&negative=0.6&theme=1&paletteShift=0.45'
  + '&image=images/beads/mon-hakkaku.png&detail=0.0001&onsetStrength=0&timeSinceOnset=9'

// all eight drivers pinned mid
const MID = '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.5&spectralEntropySmooth=0.5'
  + '&waveletCentroidSpring=0.5&waveletBand5Spring=0.5&waveletBassSpring=0.5&energySpring=0.5'
  + '&spectralSpreadRSquared=0.145&spectralSpreadMedian=0.26&spectralKurtosisMedian=0.5&spectralSkewMedian=0.5'

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 420, height: 420 } })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })

  const shot = async (q) => {
    await p.goto(B + q, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas')
    await p.waitForTimeout(2100)
    return p.evaluate(() => {
      const c = document.querySelector('canvas')
      const g = document.createElement('canvas'); g.width = 140; g.height = 140
      const x = g.getContext('2d'); x.drawImage(c, 0, 0, 140, 140)
      return Array.from(x.getImageData(0, 0, 140, 140).data)
    })
  }
  const diff = (a, b) => {
    let s = 0, n = 0, changed = 0
    for (let i = 0; i < a.length; i += 4) {
      const d = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3
      s += d; n++; if (d > 6) changed++
    }
    return { mad: +(s / n).toFixed(3), pctChanged: +(100 * changed / n).toFixed(1) }
  }

  const base   = await shot(MID + '&breathe=0.85')
  const off    = await shot(MID + '&breathe=0.0001')
  const one    = await shot(MID.replace('spectralEntropySmooth=0.5', 'spectralEntropySmooth=1.0') + '&breathe=0.85')
  const oneOff = await shot(MID.replace('spectralEntropySmooth=0.5', 'spectralEntropySmooth=1.0') + '&breathe=0.0001')
  const all    = await shot(MID.replace(/=0\.5/g, '=1.0') + '&breathe=0.85')
  // a MEDIAN on its own - the user's slow-drift channel
  const med    = await shot(MID.replace('spectralSkewMedian=0.5','spectralSkewMedian=0.515') + '&breathe=0.85')

  console.log(JSON.stringify({
    consoleErrors: errs.length ? errs.slice(0, 3) : 'none',
    breathe_on_vs_off: diff(base, off),
    ONE_driver_moved_breatheON: diff(base, one),
    // MUST be off-vs-off. Comparing against `base` (breathe ON) conflates the breathing change
    // with the driver change and reported a meaningless 37.5%.
    ONE_driver_breatheOFF_isolated: diff(off, oneOff),
    ALL_drivers_moved: diff(base, all),
    MEDIAN_only_moved: diff(base, med),
  }, null, 2))
  await br.close()
}
run().catch(e => { console.error(e); process.exit(1) })
