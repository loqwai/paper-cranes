// Is the infinity-zoom wrap seamless? iTime is HELD CONSTANT and only divePhase moves,
// set at runtime via manualFeatures so there is no navigation between samples either.
// zf = fract(0.045*8 + 0.4*0.020 + divePhase) = fract(0.368 + divePhase)
//   -> the wrap (zf crossing 1) sits at divePhase = 0.632, NOT at 1.0.
// A seamless wrap means a step ACROSS it costs no more than the same step elsewhere.
import { chromium } from 'playwright'
const P = process.env.PORT || 6994
const URL = `http://localhost:${P}/?shader=redaphid/wip/lattice-bead/dbg-seed&controller=lattice-nav`
  + `&noaudio=true&fullscreen=true&image=images/beads/mon-kikyo.png&knob_161=1&navZoom=0.62`
  + `&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&flowPhase=0.4&navX=0&navY=0&quietGate=1`
  + `&knob_168=0.9&knob_169=0.28&time=8&divePhase=0`
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 512, height: 512 } })
await pg.goto(URL, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('canvas'); await pg.waitForTimeout(2000)

const grab = d => pg.evaluate(async (dp) => {
  window.cranes.manualFeatures.divePhase = dp
  for (let i = 0; i < 8; i++) await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))
  const c = document.querySelector('canvas')
  const s = document.createElement('canvas'); s.width = c.width; s.height = c.height
  const x = s.getContext('2d'); x.drawImage(c, 0, 0)
  return Array.from(x.getImageData(0, 0, s.width, s.height).data)
}, d)
const diff = (a, c) => { let t = 0, n = 0; for (let i = 0; i < a.length; i += 4) { t += Math.abs(a[i]-c[i]) + Math.abs(a[i+1]-c[i+1]); n++ } return +(t/n).toFixed(3) }

const STEP = 0.002
for (const [lo, label] of [[0.631, 'ACROSS THE WRAP (zf 0.999 -> 0.001)'], [0.300, 'control: mid-octave, same step'], [0.100, 'control: mid-octave, same step']]) {
  const a = await grab(lo), c = await grab(lo + STEP)
  console.log(`divePhase ${lo} -> ${(lo+STEP).toFixed(3)}  mean|diff| = ${String(diff(a,c)).padEnd(7)} ${label}`)
}
const a = await grab(0.30), c = await grab(0.55)
console.log(`divePhase 0.30 -> 0.550   mean|diff| = ${String(diff(a,c)).padEnd(7)} (big move, for scale)`)
await b.close()
