// First look at hero.frag. The controller supplies the phases live, but URL params override
// features, so a static check can pin them directly and skip the controller entirely.
import { chromium } from 'playwright'

const PORT = process.env.PORT || 6994
const B = `http://localhost:${PORT}/?shader=redaphid/wip/lattice-bead/hero`
  + '&noaudio=true&fullscreen=true&time=8'
  + '&seed=0.618&seed2=0.755'
  // monotonic phases, posed at an arbitrary point along their travel
  + '&spin_angle=2.10&morph_phase=1.30&flow_phase=0.80&hue_phase=3.40'
  // slow envelopes - a mid-energy passage
  + '&bass_env=0.55&mids_env=0.45&treble_env=0.35&energy_env=0.50'
  + '&entropy_env=0.40&centroid_env=0.45&flux_env=0.30'

const V = [
  ['hakkaku · 6 satellites',        '&image=images/beads/mon-hakkaku.png&bass_pump=0.1&drop_glow=0.0'],
  ['hakkaku · mid-drop',            '&image=images/beads/mon-hakkaku.png&bass_pump=0.6&drop_glow=0.55&pitch_pulse=0.3'],
  ['tomoe · 4 satellites',          '&image=images/beads/mon-tomoe.png&satellites=4&bass_pump=0.2'],
  ['kiku · 9 satellites, big hero', '&image=images/beads/mon-kiku.png&satellites=9&heroScale=0.78&bass_pump=0.2'],
]

const run = async () => {
  const br = await chromium.launch()
  const p = await br.newPage({ viewport: { width: 560, height: 560 } })
  const errs = []
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
  const tiles = []
  for (const [label, q] of V) {
    process.stdout.write('· ')
    await p.goto(B + q, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('canvas', { timeout: 15000 })
    await p.waitForTimeout(2300)
    const st = await p.evaluate(() => {
      const c = document.querySelector('canvas')
      const g = document.createElement('canvas'); g.width = 200; g.height = 200
      const x = g.getContext('2d'); x.drawImage(c, 0, 0, 200, 200)
      const d = x.getImageData(0, 0, 200, 200).data
      let s = 0, s2 = 0, n = 0
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; s2 += l * l; n++
      }
      const m = s / n
      return { lum: +m.toFixed(1), contrast: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1) }
    })
    tiles.push({ label: `${label}\nlum ${st.lum} · contrast ${st.contrast}`,
                 b64: (await p.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'), st })
  }
  const out = await br.newPage({ viewport: { width: 1180, height: 720 } })
  await out.setContent(`<style>
    body{margin:0;background:#0b0b0f;font:13px -apple-system,sans-serif;color:#e8e8f0}
    h1{font-size:18px;margin:14px 16px 3px}.sub{margin:0 16px 12px;color:#8b8ba0;font-size:12px}
    .g{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0 14px 16px;max-width:1140px}
    figure{margin:0}img{width:100%;display:block;border-radius:5px;background:#000}
    figcaption{margin-top:5px;font-size:11.5px;color:#b9b9cc;white-space:pre-line;line-height:1.35}
  </style>
  <h1>hero.frag &mdash; first look</h1>
  <div class="sub">one hero centred, satellites on a monotonic orbit &middot; phases pinned, no controller</div>
  <div class="g">${tiles.map(t => `<figure><img src="data:image/jpeg;base64,${t.b64}"><figcaption>${t.label}</figcaption></figure>`).join('')}</div>`)
  await out.screenshot({ path: 'journals/lab/shots/hero-look.png', fullPage: true })
  await br.close()
  console.log('\nconsole errors:', errs.length ? errs.slice(0, 3) : 'none')
}
run().catch(e => { console.error(e); process.exit(1) })
