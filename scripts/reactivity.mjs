// How much does the frame actually MOVE with the music? Loads once, then drives the
// audio-derived uniforms the shader really reads (via manualFeatures, which outranks the
// URL) through quiet -> groove -> drop, and measures mean |pixel delta| between states.
// iTime is pinned, so ONLY the audio varies -- any delta is genuine reactivity.
import { chromium } from 'playwright'
const P = process.env.PORT || 6994
const BASE = `http://localhost:${P}/?shader=redaphid/wip/lattice-bead/2&controller=lattice-nav`
  + `&noaudio=true&fullscreen=true&knob_161=1&navZoom=0.62&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029`
  + `&time=8&evoPhase=5.5&evoWarp=0.5&evoPlasma=0.5&flowPhase=0.4&morphPhase=0.3&warpGrow=2&navX=0&navY=0`
  + `&paletteShift=1.7&image=images/beads/mon-kikyo.png&knob_169=0.28`

// the uniforms 2.frag actually consumes from audio (controller outputs + medians)
const QUIET = { quietGate:0.15, energySpring:0.05, waveletBassSpring:0.05, waveletBand1Spring:0.05,
  waveletBand2Spring:0.05, waveletBand3Spring:0.05, waveletBand4Spring:0.05, waveletBand5Spring:0.05,
  waveletCentroidSpring:0.10, spectralCrestSmooth:0.10, spectralRoughnessSmooth:0.05, melodyFlow:0.10,
  bassNoteFlow:0.20, wubDepth:0.0, sectionMode:0, sectionMix:0 }
const DROP  = { quietGate:1.0, energySpring:0.95, waveletBassSpring:0.95, waveletBand1Spring:0.90,
  waveletBand2Spring:0.85, waveletBand3Spring:0.85, waveletBand4Spring:0.90, waveletBand5Spring:0.95,
  waveletCentroidSpring:0.90, spectralCrestSmooth:0.90, spectralRoughnessSmooth:0.80, melodyFlow:0.90,
  bassNoteFlow:0.80, wubDepth:0.9, sectionMode:1, sectionMix:1 }

const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 460, height: 460 } })
const grab = st => pg.evaluate(async (s) => {
  Object.assign(window.cranes.manualFeatures, s)
  for (let i=0;i<10;i++) await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)))
  const c=document.querySelector('canvas'), k=document.createElement('canvas')
  k.width=c.width; k.height=c.height; const x=k.getContext('2d'); x.drawImage(c,0,0)
  return Array.from(x.getImageData(0,0,k.width,k.height).data)
}, st)
const delta = (a,c) => { let t=0,n=0; for(let i=0;i<a.length;i+=4){ t+=(Math.abs(a[i]-c[i])+Math.abs(a[i+1]-c[i+1])+Math.abs(a[i+2]-c[i+2]))/3; n++ } return +(t/n).toFixed(2) }

const CASES = [
  ['theme 0 luminous (DEFAULT), seed 0.9', '&theme=0&knob_168=0.9'],
  ['theme 0 luminous, SEED OFF',   '&theme=0&knob_168=0'],
  ['theme 1 vj9, seed 0.9',        '&theme=1&knob_168=0.9'],
  ['theme 2 midtone, seed 0.9',    '&theme=2&knob_168=0.9'],
  ['theme 3 contrast, seed 0.9',   '&theme=3&knob_168=0.9'],
]
const REF = ['lattice-vj/9 (BENCHMARK)', BASE.replace('lattice-bead/2','lattice-vj/9')]
console.log('mean |pixel delta| quiet -> drop  (higher = more visibly music-reactive)')
for (const [label, q] of CASES) {
  await pg.goto(BASE + q, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('canvas'); await pg.waitForTimeout(2200)
  const a = await grab(QUIET), c = await grab(DROP)
  console.log(`  ${label.padEnd(38)} ${String(delta(a,c)).padStart(7)}`)
}
{
  const [label, u] = REF
  await pg.goto(u, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('canvas'); await pg.waitForTimeout(2200)
  const a = await grab(QUIET), c = await grab(DROP)
  console.log(`  ${label.padEnd(38)} ${String(delta(a,c)).padStart(7)}`)
}
await b.close()
