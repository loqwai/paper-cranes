// Is tomoe really impossible here?
//
// The art critic's structural claim: "the tomoe is defined by ROTATIONAL symmetry - three commas
// chasing each other - while your engine mirrors everything, which is the one operation that
// cannot produce a tomoe. This isn't a tuning problem."
//
// That is true of the FOLD path (fractal() applies abs(p), which symmetrises and makes chirality
// unobservable). But the SEED GRID is different: seedDist() is plain fract() tiling in world
// space with no fold, so a chiral motif should survive there.
//
// TEST: render each mon, then compare the frame against its own HORIZONTAL MIRROR.
//   near-zero difference  -> the render is mirror-symmetric, chirality destroyed
//   large difference      -> chirality survives
// hakkaku (8-fold symmetric) and kikko (hexagon) are the controls: they are symmetric motifs, so
// they SHOULD self-mirror to near zero regardless. If tomoe scores like them, the critic is right.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 'detail'
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}`
  + '&noaudio=true&fullscreen=true&knob_161=1&time=8&quietGate=1'
  + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&theme=1&paletteShift=0.45'
  + '&onsetStrength=0&timeSinceOnset=9&energySpring=0.5&negative=0.9&detail=0.85&breathe=0.0001'
  + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.5&spectralEntropySmooth=0.5'
  + '&waveletCentroidSpring=0.5&waveletBand5Spring=0.5&waveletBassSpring=0.5'
  + '&spectralSpreadRSquared=0.145&spectralSkewMedian=0.5&spectralKurtosisMedian=0.5'
  + '&spectralSpreadMedian=0.26&sweep=0.0001'   // sweep off: it is itself directional

const MON = ['tomoe', 'ogi', 'katabami', 'hakkaku', 'kikko']

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 520, height: 520 } })
  const out = {}
  for (const m of MON) {
    process.stdout.write(`${m} `)
    await p.goto(`${B}&image=images/beads/mon-${m}.png`, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas'); await p.waitForTimeout(2200)
    out[m] = await p.evaluate(() => {
      const c = document.querySelector('canvas')
      const W = 400, sx = Math.floor((c.width - W) / 2), sy = Math.floor((c.height - W) / 2)
      const g = document.createElement('canvas'); g.width = W; g.height = W
      const x = g.getContext('2d'); x.drawImage(c, sx, sy, W, W, 0, 0, W, W)   // 1:1
      const d = x.getImageData(0, 0, W, W).data
      // compare the crop against its own horizontal mirror
      let sH = 0, sV = 0, n = 0
      for (let y = 0; y < W; y++) for (let xx = 0; xx < W; xx++) {
        const i = (y * W + xx) * 4
        const jH = (y * W + (W - 1 - xx)) * 4
        const jV = ((W - 1 - y) * W + xx) * 4
        sH += (Math.abs(d[i] - d[jH]) + Math.abs(d[i + 1] - d[jH + 1]) + Math.abs(d[i + 2] - d[jH + 2])) / 3
        sV += (Math.abs(d[i] - d[jV]) + Math.abs(d[i + 1] - d[jV + 1]) + Math.abs(d[i + 2] - d[jV + 2])) / 3
        n++
      }
      return { selfMirrorH: +(sH / n).toFixed(2), selfMirrorV: +(sV / n).toFixed(2) }
    })
  }
  await br.close()
  console.log('\n' + JSON.stringify(out, null, 1))
  console.log('\nHigher = more chiral (survives). Controls hakkaku/kikko are symmetric motifs and')
  console.log('should sit low. If tomoe sits with them, the critic is right and it is structural.')
}
run().catch(e => { console.error(e); process.exit(1) })
