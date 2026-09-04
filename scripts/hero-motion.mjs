// Does hero.frag actually satisfy the user's two constraints?
//   (1) "NO shuddering or quick breathing of the background"
//   (2) "the camera animation must not SNAP back and forth with rotations"
//
// These are DIFFERENT properties and need DIFFERENT instruments.
//
// TEST A - background deafness. Render the same pose twice with the fast channels at 0
// (that pair is the NOISE FLOOR - frame-buffer feedback or driver nondeterminism shows up
// here), then once with them at max. If the corner patches move no more than the floor, the
// background provably cannot see the fast channels. A correlation would not prove this; an
// exact pairwise diff against a self-control does.
//
// TEST B - motion continuity. hero.frag reads NO iTime, so the frame is a pure function of
// the phases: advancing them by hand IS the timeline. A snap is a DISCONTINUITY, so the
// metric is the frame-to-frame difference SERIES and the tell is max/median. Smooth travel
// keeps that ratio near 1; a snap-back spikes it.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const W = 560
const BASE = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/hero`
  + '&noaudio=true&fullscreen=true&time=8&seed=0.618&seed2=0.755'
  + '&image=images/beads/mon-hakkaku.png&satellites=6'

// corners are background-only: hero r=0.20 (~112px), satellites reach 0.335+0.092 (~240px),
// and the nearest point of a 60px corner patch is 311px from centre.
const PROBE = `(() => {
  const c = document.querySelector('canvas')
  const g = document.createElement('canvas'); g.width = c.width; g.height = c.height
  const x = g.getContext('2d'); x.drawImage(c, 0, 0)
  const P = 60, w = c.width, h = c.height
  const grab = (ox, oy) => Array.from(x.getImageData(ox, oy, P, P).data)
  const corners = [grab(0,0), grab(w-P,0), grab(0,h-P), grab(w-P,h-P)].flat()
  const centre = x.getImageData((w>>1)-80, (h>>1)-80, 160, 160).data
  const lum = d => { let s=0,n=0; for (let i=0;i<d.length;i+=4){ s+=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; n++ } return s/n }
  const full = x.getImageData(0,0,w,h).data
  let s=0,s2=0,n=0
  for (let i=0;i<full.length;i+=4){ const l=0.299*full[i]+0.587*full[i+1]+0.114*full[i+2]; s+=l; s2+=l*l; n++ }
  const m = s/n
  const sg = document.createElement('canvas'); sg.width=64; sg.height=64
  const sx = sg.getContext('2d'); sx.drawImage(c,0,0,64,64)
  const sd = sx.getImageData(0,0,64,64).data
  const sig = []; for (let i=0;i<sd.length;i+=4) sig.push(0.299*sd[i]+0.587*sd[i+1]+0.114*sd[i+2])
  return { corners, cornerLum:+lum(corners).toFixed(4), centreLum:+lum(centre).toFixed(3),
           frameLum:+m.toFixed(3), contrast:+Math.sqrt(Math.max(s2/n-m*m,0)).toFixed(3), sig }
})()`

const shot = async (p, q) => {
  await p.goto(BASE + q, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 15000 })
  await p.waitForTimeout(1400)
  return p.evaluate(PROBE)
}
const mad = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length }
const mean = a => a.reduce((x, y) => x + y, 0) / a.length
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] }
const sdev = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))) }
const corr = (a, b) => {
  const ma = mean(a), mb = mean(b)
  let n = 0, da = 0, db = 0
  for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
  return n / Math.sqrt(Math.max(da * db, 1e-9))
}

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: W, height: W } })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })

  // ---- TEST A -------------------------------------------------------------
  const pose = '&spin_angle=2.10&morph_phase=1.30&flow_phase=0.80&hue_phase=3.40'
    + '&bass_env=0.55&mids_env=0.45&treble_env=0.35&energy_env=0.50'
    + '&entropy_env=0.40&centroid_env=0.45&flux_env=0.30'
  const quiet = '&bass_pump=0&drop_glow=0&pitch_pulse=0'
  const loud = '&bass_pump=0.95&drop_glow=0.90&pitch_pulse=0.85'
  const A = await shot(p, pose + quiet)
  const A2 = await shot(p, pose + quiet)   // noise floor: identical params, rendered twice
  const B = await shot(p, pose + loud)
  const floor = mad(A.corners, A2.corners)
  const effect = mad(A.corners, B.corners)
  const centreEffect = B.centreLum - A.centreLum

  console.log('\n=== TEST A - can the background see the fast channels? ===')
  console.log(`  corner MAD, identical renders (noise floor) : ${floor.toFixed(4)}`)
  console.log(`  corner MAD, fast channels 0 -> max          : ${effect.toFixed(4)}`)
  console.log(`  corner luminance   quiet ${A.cornerLum}   loud ${B.cornerLum}`)
  console.log(`  centre (bead) lum  quiet ${A.centreLum}   loud ${B.centreLum}   delta ${centreEffect.toFixed(3)}`)
  console.log(`  VERDICT: background ${effect <= floor + 0.02 ? 'DEAF to fast channels (constraint met)' : 'RESPONDS - shudder risk'}`)
  console.log(`           beads ${centreEffect > 2 ? 'DO respond (reactivity intact)' : 'do NOT respond - effect is dead'}`)

  // ---- TEST B -------------------------------------------------------------
  const N = 24, series = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const build = t < 0.6 ? t / 0.6 : 1.0
    const q = `&spin_angle=${(0.9 + i * 0.115).toFixed(4)}`
      + `&morph_phase=${(0.4 + i * 0.052).toFixed(4)}`
      + `&flow_phase=${(0.2 + i * 0.038).toFixed(4)}`
      + `&hue_phase=${(1.0 + i * 0.071).toFixed(4)}`
      + `&bass_env=${(0.30 + build * 0.40).toFixed(3)}`
      + `&mids_env=${(0.35 + build * 0.20).toFixed(3)}`
      + `&treble_env=${(0.20 + build * 0.35).toFixed(3)}`
      + `&energy_env=${(0.30 + build * 0.45).toFixed(3)}`
      + `&entropy_env=${(0.45 - build * 0.15).toFixed(3)}`
      + `&centroid_env=${(0.40 + build * 0.25).toFixed(3)}`
      + `&flux_env=${(0.25 + build * 0.30).toFixed(3)}`
      + `&bass_pump=${(i % 4 === 0 ? 0.85 : 0.08).toFixed(2)}`
      + `&drop_glow=${(i >= 14 ? Math.max(0, 0.9 - (i - 14) * 0.12) : 0).toFixed(3)}`
      + `&pitch_pulse=${(i % 6 === 3 ? 0.7 : 0.05).toFixed(2)}`
    process.stdout.write('.')
    series.push({ i, ...(await shot(p, q)), pump: i % 4 === 0 ? 0.85 : 0.08 })
  }

  const diffs = [], cdiffs = []
  for (let i = 1; i < N; i++) {
    diffs.push(mad(series[i - 1].sig, series[i].sig))
    cdiffs.push(Math.abs(series[i].cornerLum - series[i - 1].cornerLum))
  }

  console.log('\n\n=== TEST B - continuity over a synthetic build + drop (24 frames) ===')
  console.log(`  whole-frame step  median ${med(diffs).toFixed(3)}   max ${Math.max(...diffs).toFixed(3)}   ratio ${(Math.max(...diffs) / med(diffs)).toFixed(2)}x`)
  console.log(`  corner step       median ${med(cdiffs).toFixed(4)}  max ${Math.max(...cdiffs).toFixed(4)}`)
  console.log(`  corner lum        range ${Math.min(...series.map(s => s.cornerLum)).toFixed(2)} .. ${Math.max(...series.map(s => s.cornerLum)).toFixed(2)}   sd ${sdev(series.map(s => s.cornerLum)).toFixed(3)}`)
  console.log(`  corr(bass_pump, corner lum)  ${corr(series.map(s => s.pump), series.map(s => s.cornerLum)).toFixed(3)}   <- background vs the beat`)
  console.log(`  corr(bass_pump, centre lum)  ${corr(series.map(s => s.pump), series.map(s => s.centreLum)).toFixed(3)}   <- beads vs the beat`)
  console.log(`  contrast  ${series[0].contrast} -> ${series[13].contrast} (pre-drop) -> ${series[14].contrast} (drop) -> ${series[N - 1].contrast}`)
  console.log(`\n  step series: ${diffs.map(d => d.toFixed(2)).join(' ')}`)
  console.log('\nconsole errors:', errs.length ? errs.slice(0, 3) : 'none')
  await br.close()
}
run().catch(e => { console.error(e); process.exit(1) })
