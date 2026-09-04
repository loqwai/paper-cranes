// Headless aspect check for lattice-bead-vj/spiral.frag: render wide and tall, measure the hero's
// bounding box from pixels. An isotropic bead gives a ~1.0 ratio in both viewports.
import { chromium } from 'playwright'
const PORT = process.env.PORT || 6969
const OUT = process.env.OUT || '.'
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead-vj/spiral&embed=true&noaudio=true&fullscreen=true`
  + '&image=images/beads/mon-hakkaku.png&beads=32&turns=2.6'
  + '&spin_angle=2.0&morph_phase=1.0&flow_phase=3.0&hue_phase=0.4'
  + '&bass_env=0.5&mids_env=0.5&treble_env=0.4&energy_env=0.5&entropy_env=0.5&centroid_env=0.4&flux_env=0.3'
const run = async () => {
  const br = await chromium.launch()
  for (const [name, w, h] of [['wide', 1600, 900], ['tall', 900, 1600]]) {
    const p = await br.newPage({ viewport: { width: w, height: h } })
    await p.goto(B, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas', { timeout: 15000 })
    await p.waitForTimeout(2500)
    const st = await p.evaluate(() => {
      const c = document.querySelector('canvas')
      const g = document.createElement('canvas'); g.width = c.width; g.height = c.height
      const x = g.getContext('2d'); x.drawImage(c, 0, 0)
      const d = x.getImageData(0, 0, g.width, g.height).data
      // hero only: search a centred window of 0.45*height on a side
      const cx = g.width / 2, cy = g.height / 2, R = g.height * 0.225
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0
      for (let y = Math.floor(cy - R); y < cy + R; y++) for (let xx = Math.floor(cx - R); xx < cx + R; xx++) {
        const i = (y * g.width + xx) * 4
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        if (l > 40) { n++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y }
      }
      return { canvas: g.width + 'x' + g.height, bw: x1 - x0 + 1, bh: y1 - y0 + 1, ratio: +((x1 - x0 + 1) / (y1 - y0 + 1)).toFixed(3), bright: n }
    })
    console.log(name, JSON.stringify(st))
    await p.screenshot({ path: `${OUT}/spiral-${name}.png` })
    await p.close()
  }
  await br.close()
}
run().catch(e => { console.error(e); process.exit(1) })
