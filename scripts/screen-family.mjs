// Screen every lattice-bead shader: does it COMPILE, and does it produce a non-degenerate image?
// "Successful" is judged empirically because the lab LEDGER only ever recorded one verdict.
//
// Degenerate = a GLSL error, a black frame, or a flat frame (sd below ~2/255 is a solid fill).
// Uniforms normally supplied by a controller are passed as URL params instead, since any numeric
// query param becomes a float uniform - that makes the screen deterministic and controller-free.
import { chromium } from 'playwright'
import { readdirSync } from 'fs'

const PORT = process.env.PORT || 6994
const DIR = 'shaders/redaphid/wip/lattice-bead'
const W = 480

// mid-scale values for the controller-supplied uniforms used across the family
const DRIVE = '&spin_angle=2.1&morph_phase=1.3&flow_phase=0.8&hue_phase=3.4'
  + '&bass_env=0.55&mids_env=0.45&treble_env=0.35&energy_env=0.5&entropy_env=0.4'
  + '&centroid_env=0.45&flux_env=0.3&bass_pump=0.3&drop_glow=0.2&pitch_pulse=0.2'
  + '&quietGate=1&navZoom0=1&satellites=6'

const PROBE = `(() => {
  const c = document.querySelector('canvas')
  if (!c) return { err: 'no canvas' }
  const g = document.createElement('canvas'); g.width = c.width; g.height = c.height
  const x = g.getContext('2d'); x.drawImage(c, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height).data
  let s = 0, s2 = 0, n = 0, nz = 0
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]
    s += l; s2 += l*l; n++; if (l > 3) nz++
  }
  const m = s/n
  return { lum: +m.toFixed(2), sd: +Math.sqrt(Math.max(s2/n - m*m, 0)).toFixed(2),
           ink: +(100*nz/n).toFixed(1), w: c.width, h: c.height }
})()`

const run = async () => {
  const files = readdirSync(DIR).filter(f => f.endsWith('.frag')).sort()
  const br = await chromium.launch()
  const rows = []
  for (const f of files) {
    const name = f.replace(/\.frag$/, '')
    const p = await br.newPage({ viewport: { width: W, height: W } })
    const errs = []
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    p.on('pageerror', e => errs.push(String(e.message)))
    const url = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/${name}`
      + `&noaudio=true&fullscreen=true&time=8&seed=0.618&seed2=0.755&seed3=0.31&seed4=0.87`
      + `&image=images/beads/mon-hakkaku.png` + DRIVE
    let r = {}
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await p.waitForSelector('canvas', { timeout: 15000 })
      await p.waitForTimeout(1600)
      r = await p.evaluate(PROBE)
    } catch (e) { r = { err: String(e.message).slice(0, 60) } }
    const glsl = errs.filter(e => /ERROR:|GLSL|compile|shader/i.test(e))
    const bad = r.err || glsl.length > 0 || (r.sd ?? 0) < 2.0 || (r.ink ?? 0) < 0.5
    rows.push({ name, ...r, glsl: glsl.length, bad })
    console.log(`${bad ? 'FAIL' : ' ok '} ${name.padEnd(16)} lum ${String(r.lum ?? '-').padStart(6)}  sd ${String(r.sd ?? '-').padStart(6)}  ink ${String(r.ink ?? '-').padStart(5)}%  glslErr ${glsl.length}${r.err ? '  ' + r.err : ''}`)
    if (glsl.length) console.log(`        ${glsl[0].slice(0, 150)}`)
    await p.close()
  }
  await br.close()
  const good = rows.filter(r => !r.bad), bad = rows.filter(r => r.bad)
  console.log(`\n${good.length} render, ${bad.length} do not.`)
  if (bad.length) console.log('  failing: ' + bad.map(r => r.name).join(' '))
}
run().catch(e => { console.error(e); process.exit(1) })
