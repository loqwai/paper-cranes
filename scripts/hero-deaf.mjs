// Re-site the background-deafness test.
//
// hero-motion.mjs put its probe in the frame CORNERS, which measured 0.93-1.56 luminance out of
// 255 - the corners are black, so "the background did not move there" is nearly vacuous. And
// ?satellites=0 cannot turn the beads off (the house "0 means unset" convention makes it 6), so
// masking is not available either.
//
// Instead: count how many pixels change AT ALL when the fast channels go 0 -> max, as a fraction
// of the frame. No masking needed, and the answer is self-interpreting:
//   changed fraction ~= bead coverage  -> only the beads respond (constraint met)
//   changed fraction ~= whole frame    -> the background responds (shudder)
// The self-control pair (identical params rendered twice) sets the floor.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const W = 560
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/hero`
  + '&noaudio=true&fullscreen=true&time=8&seed=0.618&seed2=0.755'
  + '&image=images/beads/mon-hakkaku.png&satellites=6'
const POSE = '&spin_angle=2.10&morph_phase=1.30&flow_phase=0.80&hue_phase=3.40'
  + '&bass_env=0.55&mids_env=0.45&treble_env=0.35&energy_env=0.50'
  + '&entropy_env=0.40&centroid_env=0.45&flux_env=0.30'

const GRAB = `(() => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width = c.width; g.height = c.height
  const x = g.getContext('2d'); x.drawImage(c, 0, 0)
  return { w: c.width, h: c.height, px: Array.from(x.getImageData(0, 0, c.width, c.height).data) }
})()`

const shot = async (p, q) => {
  await p.goto(BASE + POSE + q, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 15000 })
  await p.waitForTimeout(1400)
  return p.evaluate(GRAB)
}

// per-pixel luminance delta between two frames, plus a radial profile of where the change lives
const compare = (a, b, w, h) => {
  let changed = 0, n = 0, sum = 0, maxd = 0
  const RB = 10, radChanged = new Array(RB).fill(0), radTotal = new Array(RB).fill(0)
  const cx = w / 2, cy = h / 2, maxr = Math.hypot(cx, cy)
  for (let i = 0, p = 0; i < a.length; i += 4, p++) {
    const la = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]
    const lb = 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]
    const d = Math.abs(la - lb)
    const px = p % w, py = (p / w) | 0
    const rb = Math.min(RB - 1, ((Math.hypot(px - cx, py - cy) / maxr) * RB) | 0)
    radTotal[rb]++
    if (d > 1.0) { changed++; radChanged[rb]++ }
    sum += d; if (d > maxd) maxd = d
    n++
  }
  return { pct: 100 * changed / n, meanDelta: sum / n, maxDelta: maxd,
           radial: radChanged.map((c, i) => 100 * c / Math.max(radTotal[i], 1)) }
}

// how much of the frame do the beads actually cover? measured, not assumed: a bead pixel is one
// that moves when the bead-only fast channels move, bounded above by luminance over the ground.
const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: W, height: W } })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })

  const quiet = '&bass_pump=0&drop_glow=0&pitch_pulse=0'
  const loud = '&bass_pump=0.95&drop_glow=0.90&pitch_pulse=0.85'
  const A = await shot(p, quiet)
  const A2 = await shot(p, quiet)          // self-control: the noise floor
  const B = await shot(p, loud)
  // a slow-channel move, for scale: this one is ALLOWED to repaint the whole frame
  const S = await shot(p, quiet + '&morph_phase=1.55&flow_phase=0.95')

  const floor = compare(A.px, A2.px, A.w, A.h)
  const fast = compare(A.px, B.px, A.w, A.h)
  const slow = compare(A.px, S.px, A.w, A.h)

  const row = (t, r) => `  ${t.padEnd(26)} ${r.pct.toFixed(2).padStart(6)}%  mean ${r.meanDelta.toFixed(3).padStart(7)}  max ${r.maxDelta.toFixed(1).padStart(6)}`
  console.log(`\ncanvas ${A.w}x${A.h}\n`)
  console.log('                             changed   mean d    max d')
  console.log(row('noise floor (A vs A)', floor))
  console.log(row('FAST 0 -> max', fast))
  console.log(row('SLOW phases nudged', slow))
  console.log('\n  radial profile of % pixels changed (centre -> corner, 10 bands)')
  console.log(`    fast: ${fast.radial.map(v => v.toFixed(0).padStart(3)).join(' ')}`)
  console.log(`    slow: ${slow.radial.map(v => v.toFixed(0).padStart(3)).join(' ')}`)
  console.log('\n  VERDICT')
  console.log(`    fast channels touch ${fast.pct.toFixed(1)}% of the frame; slow phases touch ${slow.pct.toFixed(1)}%.`)
  console.log(`    ${fast.pct < slow.pct * 0.5 ? 'FAST IS LOCALISED - the background is not driven by the beat.'
    : 'FAST IS AS BROAD AS SLOW - the background does see the beat (shudder risk).'}`)
  console.log('\nconsole errors:', errs.length ? errs.slice(0, 3) : 'none')
  await br.close()
}
run().catch(e => { console.error(e); process.exit(1) })
