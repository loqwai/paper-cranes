// gallery-shot.mjs — headless thumbnails of every lattice-bead variant, for the public gallery
// Artifact. Modelled on scripts/hero-look.mjs: the controllers are NOT loaded, their uniforms are
// pinned from the URL instead, so every tile is a deterministic frame at time=8 and the family can
// be compared honestly.
//
//   node scripts/lab/gallery-shot.mjs [name ...]     # no names = render all
//
// Writes <OUT>/<id>.jpg plus <OUT>/shots.json (lum, contrast, ink, console errors per tile).
import { chromium } from 'playwright'
import { readdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'

const PORT = process.env.PORT || 6969
const OUT = process.env.OUT
  || 'C:/Users/HYPNOD~1/AppData/Local/Temp/claude/D--Projects-pc-lab-sub2/ff0d2913-98d5-4f34-9d63-20d7e9e1e714/scratchpad/gallery'
const ROOT = 'D:/Projects/pc-lab-sub2/shaders/redaphid/wip'
const W = 640, H = 400

// ── the frame every tile is posed at ────────────────────────────────────────────────────────────
const BASE = {
  noaudio: 'true', wavelet: 'true', fullscreen: 'true',
  time: '8', seed: '0.618', seed2: '0.755',
  image: 'images/beads/mon-hakkaku.png',
}

// Controller-supplied uniforms, pinned. springs .4 · quietGate 1 · phases 3 · evoPhase 6 · medians .5
const SPRINGS = ['waveletBassSpring', 'waveletBand1Spring', 'waveletBand2Spring', 'waveletBand3Spring',
  'waveletBand4Spring', 'waveletBand5Spring', 'waveletCentroidSpring', 'energySpring']
const MEDIANS = ['spectralSkewMedian', 'spectralEntropyMedian', 'spectralKurtosisMedian',
  'spectralSpreadMedian', 'spectralCentroidMedian', 'pitchClassMedian']
const PHASES = ['flowPhase', 'morphPhase', 'divePhase']

const CTRL = {
  ...Object.fromEntries(SPRINGS.map(k => [k, '0.4'])),
  ...Object.fromEntries(MEDIANS.map(k => [k, '0.5'])),
  ...Object.fromEntries(PHASES.map(k => [k, '3'])),
  quietGate: '1', evoPhase: '6',
  melodyFlow: '0.4', spectralCrestSmooth: '0.4', spectralRoughnessSmooth: '0.35',
  spectralEntropySmooth: '0.4', spectralSpreadRSquared: '0.5',
  evoWarp: '0.4', evoPlasma: '0.4', wubDepth: '0.3', bassNoteFlow: '0.4',
  sectionMode: '0', sectionMix: '0.5',
  navX: '0', navY: '0', navZoom: '0.14', navZoom0: '0.14', flybyZoom: '0',
}

// hero.frag / spiral.frag are a different architecture — their own envelope + phase set.
const HERO_CTRL = {
  spin_angle: '2.10', morph_phase: '1.30', flow_phase: '0.80', hue_phase: '3.40',
  bass_env: '0.55', mids_env: '0.45', treble_env: '0.35', energy_env: '0.50',
  entropy_env: '0.40', centroid_env: '0.45', flux_env: '0.30',
  bass_pump: '0.20', drop_glow: '0.0', pitch_pulse: '0.10',
}

// The family's working recipe (4.frag's figure/ground levers). Shaders that do not declare these
// simply ignore them; the ones that do are shown the way they would actually be projected.
// paletteShift is deliberately NOT set: the bare default is the 0%-crush palette the family was
// corrected onto, and pinning it here would re-introduce the look that was retracted.
const LEGIBLE = { knob_161: '1', knob_168: '1.0', knob_169: '0.60', legible: '1' }

const HERO_FAMILY = new Set(['hero', 'spiral'])

const listFrags = dir => existsSync(dir)
  ? readdirSync(dir).filter(f => f.endsWith('.frag')).map(f => f.replace(/\.frag$/, '')).sort()
  : []

export const variants = () => {
  const out = []
  for (const [dir, prefix] of [['lattice-bead', 'lattice-bead'], ['lattice-bead-vj', 'lattice-bead-vj']]) {
    for (const name of listFrags(join(ROOT, dir))) {
      const file = join(ROOT, dir, `${name}.frag`)
      const src = readFileSync(file, 'utf8')
      const heroish = /uniform float spin_angle/.test(src)
      out.push({
        id: `${prefix}--${name}`,
        name, dir,
        path: `redaphid/wip/${dir}/${name}`,
        file,
        mtime: statSync(file).mtimeMs,
        params: { ...BASE, ...(heroish ? HERO_CTRL : { ...CTRL, ...LEGIBLE }) },
      })
    }
  }
  return out
}

// 127.0.0.1, not "localhost": the dev server binds IPv4 only, and localhost resolves to ::1 first
// on this box, which fails to connect and renders an indistinguishable black frame.
const url = v => `http://127.0.0.1:${PORT}/?` + new URLSearchParams({ shader: v.path, ...v.params })

// Sample the canvas, cheaply, so the wait can be adaptive.
const probe = () => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const g = document.createElement('canvas'); g.width = 200; g.height = 200
  const x = g.getContext('2d'); x.drawImage(c, 0, 0, 200, 200)
  const d = x.getImageData(0, 0, 200, 200).data
  let s = 0, s2 = 0, n = 0, ink = 0
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    s += l; s2 += l * l; n++; if (l > 12) ink++
  }
  const m = s / n
  return { lum: +m.toFixed(1), contrast: +Math.sqrt(Math.max(s2 / n - m * m, 0)).toFixed(1), ink: +(100 * ink / n).toFixed(1) }
}

// Which variants are new, or have been written since their tile was taken.
const changed = all => {
  const f = join(OUT, 'shots.json')
  const prev = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}
  return all.filter(v => !prev[v.id] || prev[v.id].mtime !== v.mtime || !existsSync(join(OUT, `${v.id}.jpg`)))
}

const run = async () => {
  const argv = process.argv.slice(2)
  const all = variants()

  // --changed lists what a refresh would re-render, without launching a browser.
  if (argv[0] === '--changed') return console.log(changed(all).map(v => v.id).join('\n'))

  const only = argv.filter(a => !a.startsWith('--'))
  const todo = argv.includes('--stale') ? changed(all)
    : only.length ? all.filter(v => only.includes(v.id) || only.includes(v.name)) : all
  if (!todo.length) return console.log('nothing changed')
  console.log(`rendering ${todo.length} of ${all.length} variants at ${W}x${H}`)

  // Chromium caps the number of live WebGL contexts per process, and a shader page never
  // relinquishes one cleanly. Past ~18 tiles every later page silently renders BLACK — which reads
  // exactly like a dead shader and is not one. Recycle the whole browser every few tiles.
  const RECYCLE = 5
  const launch = () => chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] })
  let br = await launch()
  const results = {}
  let n = 0
  for (const v of todo) {
    if (n && n % RECYCLE === 0) { await br.close(); br = await launch() }
    n++
    const p = await br.newPage({ viewport: { width: W, height: H } })
    const errs = []
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
    p.on('pageerror', e => errs.push(String(e).slice(0, 160)))
    let st = { lum: 0, contrast: 0, ink: 0 }
    try {
      await p.goto(url(v), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await p.waitForSelector('canvas', { timeout: 20000 })
      // Adaptive: a shader may take a moment to compile, and the dev server is shared with other
      // agents, so a fixed sleep produces black frames that look exactly like a dead shader. Wait
      // for the canvas to actually carry ink, then one more beat for the frame to settle.
      await p.waitForTimeout(1200)
      for (let i = 0; i < 14; i++) {
        st = await p.evaluate(probe) || st
        if (st.ink > 0.5) break
        await p.waitForTimeout(900)
      }
      await p.waitForTimeout(900)
      st = await p.evaluate(probe) || st
      await p.screenshot({ path: join(OUT, `${v.id}.jpg`), type: 'jpeg', quality: 70 })
    } catch (e) {
      errs.push(`RENDER FAILED: ${String(e).slice(0, 160)}`)
    }
    await p.close()
    results[v.id] = { ...v, ...st, errs: errs.slice(0, 3), url: url(v) }
    const flag = st.ink < 1 ? ' ⚑ BLACK' : errs.length ? ' ⚑ err' : ''
    console.log(`  ${v.id.padEnd(34)} lum ${String(st.lum).padStart(5)}  sd ${String(st.contrast).padStart(5)}  ink ${String(st.ink).padStart(5)}%${flag}`)
  }
  await br.close()

  const prev = existsSync(join(OUT, 'shots.json')) ? JSON.parse(readFileSync(join(OUT, 'shots.json'), 'utf8')) : {}
  writeFileSync(join(OUT, 'shots.json'), JSON.stringify({ ...prev, ...results }, null, 1))
  console.log(`\nwrote ${Object.keys(results).length} tiles → ${OUT}`)
}

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) run().catch(e => { console.error(e); process.exit(1) })
