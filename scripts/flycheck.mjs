import { chromium } from 'playwright'
const u = (fly, t) => `http://localhost:6994/?shader=redaphid/wip/lattice-bead/2&controller=lattice-nav`
  + `&noaudio=true&fullscreen=true&image=images/beads/mon-kikyo.png&knob_161=1&navZoom=0.62`
  + `&seed=0.618&seed2=0.755&seed3=0.892&seed4=0.029&knob_168=0.9&knob_169=0.28`
  + `&quietGate=1&energySpring=0.5&time=${t}&autofly=${fly}`
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 420, height: 420 } })
const shot = async (fly, t) => { await p.goto(u(fly, t), { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas'); await p.waitForTimeout(2200); return await p.screenshot({ type: 'png' }) }
const px = async (buf) => buf.length
// time PINNED via URL -> iTime frozen. Only autofly can change the frame.
const a = await shot(0, 8), a2 = await shot(0, 8), c = await shot(1, 8), d = await shot(1, 40)
console.log('autofly=0 @t8  vs itself   :', a.equals(a2) ? 'IDENTICAL (frame is deterministic)' : 'differs -> test invalid')
console.log('autofly=0 @t8  vs autofly=1:', a.equals(c) ? 'IDENTICAL -> autofly does NOTHING' : 'DIFFERS -> autofly is live')
console.log('autofly=1 @t8  vs @t40     :', c.equals(d) ? 'IDENTICAL -> camera not moving over time' : 'DIFFERS -> camera wanders with time')
await b.close()
