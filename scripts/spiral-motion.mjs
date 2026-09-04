// Motion check for lattice-bead-vj/spiral.frag: dodeca-bloom running (noaudio, base rates),
// 4 frames 1.5 s apart, phases logged per frame (must increase), lum/bright per frame.
import { chromium } from 'playwright'
const PORT = process.env.PORT || 6969, OUT = process.env.OUT || '.', TAG = process.env.TAG || 'm'
const Q = process.argv[2] || '&image=images/beads/mon-tomoe.png&arms=2&beads=20&turns=1.6'
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/spiral&embed=true&noaudio=true&fullscreen=true&controller=dodeca-bloom` + Q
const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 1280, height: 720 } })
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
  await p.goto(B, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 15000 }); await p.waitForTimeout(3000)
  const paths = []
  const DROP = process.env.DROP ? [0.85, 0.6, 0.35, 0.12] : null
  for (let f = 0; f < 4; f++) {
    if (DROP) { await p.evaluate(v => { window.cranes.manualFeatures.drop_glow = v }, DROP[f]); await p.waitForTimeout(150) }
    const st = await p.evaluate(() => {
      const ff = window.cranes.flattenFeatures()
      const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 320; g.height = 180
      const x = g.getContext('2d'); x.drawImage(c, 0, 0, 320, 180); const d = x.getImageData(0, 0, 320, 180).data
      let s = 0, b = 0, n = 0, mx = 0
      for (let i = 0; i < d.length; i += 4) { const l = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; s += l; if (l > 50) b++; if (l > mx) mx = l; n++ }
      return { spin: +ff.spin_angle.toFixed(3), flow: +ff.flow_phase.toFixed(3), hue: +ff.hue_phase.toFixed(3), lum: +(s/n).toFixed(1), bright: +(100*b/n).toFixed(1), max: Math.round(mx) }
    })
    const path = `${OUT}/spiral-${TAG}-f${f}.png`; await p.screenshot({ path }); paths.push(path)
    console.log(`f${f}`, JSON.stringify(st))
    if (f < 3) await p.waitForTimeout(1500)
  }
  if (errs.length) console.log('console errors:', errs.slice(0, 3))
  console.log(paths.join('\n'))
  await br.close()
}
run().catch(e => { console.error(String(e).slice(0, 300)); process.exit(1) })
