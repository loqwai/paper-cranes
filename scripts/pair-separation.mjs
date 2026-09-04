// Has the interior structure added since the critic's verdict actually separated the crests
// that failed? Their specific failures were:
//     kikyo == ume            (both five rounded lobes; kikyo should be a POINTED bellflower)
//     suhama == katabami      (both read as a small clover)
// and tomoe, which is structurally impossible here (rotational symmetry vs a mirror fold).
//
// Measures pairwise separation at 1:1 (no downsampling - every distinguishing feature in this
// shader is high-frequency and a downsampled read destroys exactly the evidence), and renders a
// sheet so a human can judge the thing a number cannot.
import { chromium } from 'playwright'
import fs from 'fs/promises'

const PORT = process.env.PORT || 6994
const SH = process.env.SHADER_N || 'detail'
// lattice-nav DELIBERATELY ABSENT: it accumulates per-frame state and puts the noise floor at
// 15.5%; without it the floor is exactly 0.000.
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${SH}`
  + '&noaudio=true&fullscreen=true&knob_161=1&time=8&quietGate=1'
  + '&knob_168=1.0&knob_169=0.60&navZoom=0.14&legible=1&theme=1&paletteShift=0.45'
  + '&onsetStrength=0&timeSinceOnset=9&energySpring=0.5'
  + '&spectralCrestSmooth=0.5&spectralRoughnessSmooth=0.5&spectralEntropySmooth=0.5'
  + '&waveletCentroidSpring=0.5&waveletBand5Spring=0.5&waveletBassSpring=0.5'
  + '&spectralSpreadRSquared=0.145&spectralSkewMedian=0.5&spectralKurtosisMedian=0.5'
  + '&spectralSpreadMedian=0.26'

const PAIRS = [['kikyo', 'ume'], ['suhama', 'katabami'], ['kikko', 'hakkaku']]  // last = known-good control
const ALL = ['kikyo', 'ume', 'suhama', 'katabami', 'kikko', 'hakkaku']

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 520, height: 520 } })
  const shots = {}, tiles = []
  for (const m of ALL) {
    process.stdout.write(`${m} `)
    await p.goto(`${B}&image=images/beads/mon-${m}.png&negative=0.9&detail=0.85&breathe=0.0001`,
      { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas'); await p.waitForTimeout(2200)
    // 1:1 native read of a centre crop
    shots[m] = await p.evaluate(() => {
      const c = document.querySelector('canvas')
      const W = 420, sx = Math.floor((c.width - W) / 2), sy = Math.floor((c.height - W) / 2)
      const g = document.createElement('canvas'); g.width = W; g.height = W
      const x = g.getContext('2d'); x.drawImage(c, sx, sy, W, W, 0, 0, W, W)
      return Array.from(x.getImageData(0, 0, W, W).data)
    })
    tiles.push({ label: m, b64: (await p.screenshot({ type: 'jpeg', quality: 90 })).toString('base64') })
  }
  const sep = (a, b) => {
    let s = 0, n = 0, big = 0
    for (let i = 0; i < a.length; i += 4) {
      const d = (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3
      s += d; n++; if (d > 12) big++
    }
    return { mad: +(s / n).toFixed(2), pctDiff: +(100 * big / n).toFixed(1) }
  }
  const out = {}
  for (const [a, b] of PAIRS) out[`${a}_vs_${b}`] = sep(shots[a], shots[b])
  // cross-pair baseline: how different are two crests that DO read as distinct?
  out['kikyo_vs_kikko_baseline'] = sep(shots.kikyo, shots.kikko)

  const sheet = `<style>body{margin:0;background:#0b0b0f;font:13px -apple-system,sans-serif;color:#e8e8f0}
   h1{font-size:19px;margin:15px 18px 3px}.sub{margin:0 18px 12px;color:#8b8ba0;font-size:12px}
   .g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 14px 18px;max-width:900px}
   figure{margin:0}img{width:100%;display:block;border-radius:5px;background:#000}
   figcaption{margin-top:5px;font-size:12px;color:#b9b9cc}</style>
   <h1>The pairs the critic said were identical</h1>
   <div class="sub">${SH}.frag · recognition recipe · kikyo/ume and suhama/katabami were "the same picture"; kikko/hakkaku both PASSED and are the control</div>
   <div class="g">${tiles.map(t => `<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`
  const out2 = await br.newPage({ viewport: { width: 940, height: 1400 } })
  await out2.setContent(sheet)
  await out2.screenshot({ path: 'journals/lab/shots/pair-separation.png', fullPage: true })
  await br.close()
  console.log('\n' + JSON.stringify(out, null, 1))
}
run().catch(e => { console.error(e); process.exit(1) })
