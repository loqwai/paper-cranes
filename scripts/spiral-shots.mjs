// Render named variants of lattice-bead-vj/spiral.frag headless (pinned phases) to PNG.
import { chromium } from 'playwright'
const PORT = process.env.PORT || 6969, OUT = process.env.OUT || '.'
const PIN = '&spin_angle=2.0&morph_phase=1.0&flow_phase=3.0&bass_env=0.5&mids_env=0.5&treble_env=0.4&energy_env=0.5&entropy_env=0.5&centroid_env=0.4&flux_env=0.3&bass_pump=0.25'
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/spiral&embed=true&noaudio=true&fullscreen=true&beads=32&turns=2.6`
const V = {
  hue04:  '&image=images/beads/mon-hakkaku.png&hue_phase=0.4',
  hue34:  '&image=images/beads/mon-hakkaku.png&hue_phase=3.4',
  tomoe:  '&image=images/beads/mon-tomoe.png&hue_phase=1.2',
  kiku:   '&image=images/beads/mon-kiku.png&hue_phase=1.2',
  ume:    '&image=images/beads/mon-ume.png&hue_phase=1.2',
  arms2:  '&image=images/beads/mon-tomoe.png&hue_phase=1.2&arms=2&beads=20&turns=1.6',
  bighero:'&image=images/beads/mon-hakkaku.png&hue_phase=1.2&heroScale=0.21&sizeExp=0.55&flow=0.02',
}
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(V)
const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 960, height: 540 } })
  const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)) })
  for (const k of want) {
    await p.goto(B + V[k] + PIN, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas', { timeout: 15000 }); await p.waitForTimeout(2200)
    const st = await p.evaluate(() => {
      const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 240; g.height = 135
      const x = g.getContext('2d'); x.drawImage(c, 0, 0, 240, 135); const d = x.getImageData(0, 0, 240, 135).data
      let s = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const l = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; s += l; if (l > 50) b++; n++ }
      return { lum: +(s/n).toFixed(1), bright: +(100*b/n).toFixed(1) }
    })
    await p.screenshot({ path: `${OUT}/spiral-${k}.png` }); console.log(k, JSON.stringify(st))
  }
  if (errs.length) console.log('console errors:', errs.slice(0, 3))
  await br.close()
}
run().catch(e => { console.error(e); process.exit(1) })
