#!/usr/bin/env node
// shader-check: the numbers the shader skill's gate asks for, in one run.
// Needs a running instance (verify-paper-cranes: `pc-verify launch`) or --base <url>.
//
//   node .claude/skills/shader/bin/shader-check.mjs --shader wip/<series>/1
//        [--controller <name>]...   repeatable, same as ?controller=
//        [--params "wavelet=true&knob_3=0.4"]   extra query params for every scenario
//        [--knobs 1,2,5|none]       knobs to push to 1 one at a time (default: every knob_N the .frag reads)
//        [--times 3,37,400]         clock values (seconds) for the silence stills
//        [--viewport 390x844]       canvas size; default a phone
//        [--base URL]               default: the pc-verify instance
//        [--frag FILE]              serve this file as the shader instead of shaders/<shader>.frag
//                                   (nothing is written under shaders/; the tests use it)
//
// The page runs on a virtual clock (the same trick as scripts/sparkle-score.mjs): every scenario is a
// fresh load that steps the same frames with the same dt, so two scenarios differ ONLY in the input
// they were given. That makes "silence vs loud" Aaron's freeze-time test: anything that differs is
// audio, including audio-driven controller clocks.
//
// Scenarios, each a frame with its pixel census:
//   silence@T          no audio, every knob 0, clock advanced to T s
//   knobN=1, all=1     at the middle clock value
//   quiet/loud/kick    phone-mic-level features (energy 0.006 / 0.05) injected for 1.5 s before the frame
//   motion             1 s of frames apart, silent and loud
// Prints one line per check (PASS / WARN / FAIL / INFO), writes summary.json and a PNG per scenario to
// the proof folder, exits 1 on any FAIL. A WARN means "open the PNG": the thresholds encode Aaron's
// taste rules (references/taste.md), not physics.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const { REPO, baseUrl, proofDir, startBrowser, newPage, writeJson } = await import(resolve(HERE, '../../verify-paper-cranes/bin/lib.mjs'))

const argv = process.argv.slice(2)
const opt = (k, d) => { const i = argv.lastIndexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d }
const all = (k) => argv.flatMap((a, i) => (a === `--${k}` ? [argv[i + 1]] : []))

const shader = opt('shader')
if (!shader) { console.error('usage: shader-check.mjs --shader <path under shaders/, no .frag> [...]'); process.exit(2) }
const base = baseUrl(opt('base'))
const [vw, vh] = opt('viewport', '390x844').split('x').map(Number)
const times = opt('times', '3,37,400').split(',').map(Number)
const HOLD = times[Math.min(1, times.length - 1)]
const fragFile = opt('frag')
const src = readFileSync(fragFile ?? join(REPO, 'shaders', `${shader}.frag`), 'utf8')
// Knobs the shader reads, ignoring commented-out lines (the #define swap pattern leaves those around)
const live = src.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n')
const knobs = opt('knobs') === 'none' ? [] : opt('knobs') ? opt('knobs').split(',').filter(Boolean).map(Number)
  : [...new Set([...live.matchAll(/\bknob_(\d+)\b/g)].map((m) => Number(m[1])))].sort((a, b) => a - b)

// Phone-mic levels: energy sits at 0.01-0.07 on a phone at a club (journals/2026-11-22-clit-coaster-show.md).
const QUIET = {
  energy: 0.006, energyNormalized: 0.15, energyZScore: -0.4, energyMedian: 0.006, energyMean: 0.006,
  bass: 0.05, bassNormalized: 0.15, bassZScore: -0.3, bassMedian: 0.15, mids: 0.04, midsNormalized: 0.2, midsZScore: -0.2,
  treble: 0.02, trebleNormalized: 0.2, trebleZScore: -0.2, spectralCentroidNormalized: 0.4, spectralCentroidMedian: 0.4,
  spectralFluxNormalized: 0.1, spectralFluxZScore: -0.3, spectralEntropyNormalized: 0.5, spectralCrestNormalized: 0.4,
  spectralRoughnessNormalized: 0.2, spectralSpreadNormalized: 0.4, spectralKurtosisNormalized: 0.4, spectralRolloffNormalized: 0.4,
  pitchClassNormalized: 0.25, pitchClassMedian: 0.25,
}
const LOUD = {
  ...QUIET,
  energy: 0.05, energyNormalized: 0.7, energyZScore: 0.5, energyMedian: 0.04, energyMean: 0.04,
  bass: 0.3, bassNormalized: 0.7, bassZScore: 0.4, bassMedian: 0.6, mids: 0.2, midsNormalized: 0.65, midsZScore: 0.3,
  treble: 0.12, trebleNormalized: 0.6, trebleZScore: 0.3, spectralCentroidNormalized: 0.55, spectralFluxNormalized: 0.5,
  spectralFluxZScore: 0.3, spectralEntropyNormalized: 0.6, spectralCrestNormalized: 0.5, spectralRoughnessNormalized: 0.55,
}
// A kick on top of LOUD, landing on the frame that is captured
const KICK = {
  ...LOUD,
  energyZScore: 0.9, bassNormalized: 1, bassZScore: 1, spectralFluxZScore: 0.9,
  onsetKick: 1, onsetKickTrigger: 1, onsetKickStrength: 1, onsetKickAge: 0, onsetFull: 0.8, onsetFullAge: 0,
  wavelet_bassHit: 1, wavelet_punch: 1,
}

// Runs before any page script: a stepped frame clock and a seeded Math.random, no HMR swaps mid-run.
const virtualClock = () => {
  let vt = 1000, id = 0, seed = 12345
  const q = new Map()
  performance.now = () => vt
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  window.requestAnimationFrame = (cb) => { q.set(++id, cb); return id }
  window.cancelAnimationFrame = (i) => q.delete(i)
  const WS = window.WebSocket
  window.WebSocket = function (url, proto) {
    if (String(proto).includes('vite-hmr')) return { readyState: 0, send () {}, close () {}, addEventListener () {}, removeEventListener () {} }
    return new WS(url, proto)
  }
  window.WebSocket.prototype = WS.prototype
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 })
  window.__step = (ms, feats) => {
    if (feats && window.cranes) Object.assign(window.cranes.manualFeatures, feats)
    vt += ms
    const cbs = [...q.values()]
    q.clear()
    for (const cb of cbs) { try { cb(vt) } catch (e) { console.error(e) } }
    return window.cranes?.frameCount ?? 0
  }
  // The frame as RGB (rows top-down), plus a PNG of it
  window.__grab = () => {
    const c = document.querySelector('canvas')
    const w = c.width, h = c.height
    const g = c.getContext('webgl2')
    const px = new Uint8Array(w * h * 4)
    g.bindFramebuffer(g.READ_FRAMEBUFFER, null)
    g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px)
    const out = document.createElement('canvas'); out.width = w; out.height = h
    const ctx = out.getContext('2d'); const img = ctx.createImageData(w, h)
    const rgb = new Uint8Array(w * h * 3)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = ((h - 1 - y) * w + x) * 4, d = (y * w + x)
        rgb[d * 3] = img.data[d * 4] = px[s]; rgb[d * 3 + 1] = img.data[d * 4 + 1] = px[s + 1]; rgb[d * 3 + 2] = img.data[d * 4 + 2] = px[s + 2]
        img.data[d * 4 + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    let s = ''
    for (let i = 0; i < rgb.length; i += 0x8000) s += String.fromCharCode.apply(null, rgb.subarray(i, i + 0x8000))
    return { w, h, b64: btoa(s), png: out.toDataURL('image/png') }
  }
}

// Census of one frame: Rec.709 luminance like scripts/vj/aesthetic-meter.js, OKLab chroma and hue like
// the 2026-11-22 show's colour census.
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i / 255))
const census = (rgb) => {
  const n = rgb.length / 3
  let lum = 0, dark = 0, clip = 0, lit = 0, vivid = 0, grey = 0, hot = 0, hx = 0, hy = 0, hn = 0, okL = 0
  const colours = new Set()
  for (let i = 0; i < rgb.length; i += 3) {
    const r8 = rgb[i], g8 = rgb[i + 1], b8 = rgb[i + 2]
    const l709 = (0.2126 * r8 + 0.7152 * g8 + 0.0722 * b8) / 255
    lum += l709
    if (l709 < 0.08) dark++
    if (l709 > 0.92 || r8 > 250 || g8 > 250 || b8 > 250) clip++
    if (r8 + g8 + b8 > 30) lit++
    colours.add(((r8 >> 3) << 10) | ((g8 >> 3) << 5) | (b8 >> 3))
    const R = LIN[r8], G = LIN[g8], B = LIN[b8]
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    const C = Math.hypot(A, Bb), h = Math.atan2(Bb, A)
    const hd = ((h * 180) / Math.PI + 360) % 360
    okL += L
    if (C > 0.08) { vivid++; if (hd > 300 || hd < 15) hot++ }
    if (C < 0.03 && L > 0.3 && L < 0.8) grey++
    if (C > 0.04) { hx += Math.cos(h); hy += Math.sin(h); hn++ }
  }
  const f = (x) => +x.toFixed(3)
  return {
    lum: f(lum / n), okL: f(okL / n), dark: f(dark / n), clip: f(clip / n), lit: f(lit / n), colours: colours.size,
    vivid: f(vivid / n), grey: f(grey / n), hotPink: f(vivid ? hot / vivid : 0), hueConc: f(hn ? Math.hypot(hx, hy) / hn : 0),
  }
}
const diff = (a, b) => { let t = 0; for (let i = 0; i < a.length; i++) t += Math.abs(a[i] - b[i]); return +(t / a.length).toFixed(2) }

const dir = proofDir(`shader-check-${shader.replace(/\//g, '_')}`)
const results = []
const check = (level, name, detail) => { results.push({ level, name, detail }); console.log(`${level.padEnd(4)} ${name}: ${detail}`) }
const stats = {}

const browser = await startBrowser()
const DT = 1000 / 60
// One scenario: fresh load, advance the clock to `clock` s in silence, then `frames` frames of `features`.
const run = async (name, { params = {}, clock = HOLD, features = {}, frames = 90, last = null, also = null }) => {
  const { ctx, page, log, close } = await newPage(browser, { viewport: { width: vw, height: vh }, init: virtualClock })
  const q = new URLSearchParams({ shader, noaudio: 'true', fullscreen: 'true', seed: '0.5', seed2: '0.5', seed3: '0.5', seed4: '0.5' })
  for (const c of all('controller')) q.append('controller', c)
  for (const [k, v] of new URLSearchParams(opt('params', ''))) q.set(k, v)
  for (const [k, v] of Object.entries(params)) q.set(k, String(v))
  if (fragFile) {
    // A shader that is not in shaders/ has no built PWA manifest either; index.html parses it as JSON.
    await page.route(`**/shaders/${shader}.frag*`, (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: src }))
    await page.route(`**/manifests/${shader.replace(/\//g, '--')}.json*`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"name":"shader-check","icons":[]}' }))
  }
  await page.goto(`${base}/?${q}`, { waitUntil: 'load' })
  for (let i = 0; i < 400; i++) {
    await page.evaluate(() => window.__step(1))
    const st = await page.evaluate(() => ({ ok: (window.cranes?.frameCount ?? 0) > 3, err: window.cranes?.error ?? null }))
    if (st.err) throw new Error(`shader error: ${JSON.stringify(st.err)}`)
    if (st.ok) break
    await page.waitForTimeout(50)
  }
  // One jump to the clock value. iTime lands on it; controllers clamp dt (0.05 s in wavelet-ease,
  // 0.25 s in clit-set), so their own clocks only move a little, the same in every scenario.
  const target = clock * 1000 - frames * DT
  if (target > 0) await page.evaluate((ms) => window.__step(ms), target)
  for (let i = 0; i < frames; i++) await page.evaluate(([ms, f]) => window.__step(ms, f), [DT, i === frames - 1 && last ? last : features])
  const t0 = Date.now()
  const g = await page.evaluate(() => window.__grab())
  const grabMs = Date.now() - t0
  writeFileSync(join(dir, `${name}.png`), Buffer.from(g.png.split(',')[1], 'base64'))
  const rgb = new Uint8Array(Buffer.from(g.b64, 'base64'))
  let later = null
  if (also) {
    for (let i = 0; i < also; i++) await page.evaluate(([ms, f]) => window.__step(ms, f), [DT, features])
    const g2 = await page.evaluate(() => window.__grab())
    writeFileSync(join(dir, `${name}-later.png`), Buffer.from(g2.png.split(',')[1], 'base64'))
    later = new Uint8Array(Buffer.from(g2.b64, 'base64'))
  }
  if (log.pageErrors.length) check('FAIL', `${name} page errors`, log.pageErrors.join(' | '))
  writeFileSync(join(dir, `${name}-console.txt`), log.console.join('\n'))
  await close()
  stats[name] = census(rgb)
  return { rgb, later, s: stats[name], grabMs, size: [g.w, g.h] }
}

// The look, judged on every frame. Thresholds come from references/taste.md. FAIL is a broken
// shader (calibrated so plasma, clit-vibej/2 and silk-vortex/1 clear it by a wide margin); WARN
// means open the PNG.
const judge = (name, s) => {
  if (s.lit < 0.2 || s.lum < 0.03) return check('FAIL', `${name} black`, `lit ${s.lit}, lum ${s.lum} ("Looks black to me")`)
  if (s.clip >= 0.5) return check('FAIL', `${name} white-out`, `clip ${s.clip} >= 0.5 (references max 0.08)`)
  if (s.colours < 50) return check('FAIL', `${name} flat fill`, `${s.colours} colours < 50 (references min 728)`)
  const bad = []
  if (s.clip > 0.03) bad.push(`clip ${s.clip} > 0.03 (white-out)`)
  if (s.grey > 0.15) bad.push(`grey ${s.grey} > 0.15 ("It's gray")`)
  if (s.hotPink > 0.15) bad.push(`hotPink ${s.hotPink} > 0.15 of vivid ("never want to see that magenta")`)
  if (s.hueConc > 0.85) bad.push(`hueConc ${s.hueConc} > 0.85 ("multiple colors, not just one shade")`)
  if (s.dark < 0.03) bad.push(`dark ${s.dark} < 0.03 (no dark floor, reads washed out)`)
  if (s.colours < 300) bad.push(`${s.colours} colours < 300 (banding or a flat fill)`)
  check(bad.length ? 'WARN' : 'PASS', `${name} look`, bad.join('; ') || JSON.stringify(s))
}

try {
  for (const t of times) judge(`silence@${t}`, (await run(`silence-${t}`, { clock: t })).s)
  for (const k of knobs) judge(`knob_${k}=1`, (await run(`knob${k}-1`, { params: { [`knob_${k}`]: 1 } })).s)
  if (knobs.length > 1) judge('all knobs=1', (await run('knobs-all-1', { params: Object.fromEntries(knobs.map((k) => [`knob_${k}`, 1])) })).s)

  const sil = await run('silence-ref', {})
  const quiet = await run('quiet', { features: QUIET })
  const loud = await run('loud', { features: LOUD })
  const kick = await run('kick', { features: LOUD, last: KICK })
  for (const [n, r] of [['quiet', quiet], ['loud', loud], ['kick', kick]]) judge(n, r.s)
  const dSQ = diff(sil.rgb, quiet.rgb), dQL = diff(quiet.rgb, loud.rgb), dLK = diff(loud.rgb, kick.rgb)
  check(dQL >= 2 ? 'PASS' : 'WARN', 'audio moves the picture', `quiet->loud diff ${dQL} (want >= 2; "It is not moving"); silence->quiet ${dSQ}`)
  check(dLK >= 1 ? 'PASS' : 'WARN', 'a kick shows on its frame', `loud->kick diff ${dLK} (want >= 1)`)
  const pump = loud.s.lum / Math.max(quiet.s.lum, 1e-3)
  check(pump > 2 ? 'FAIL' : pump <= 1.3 ? 'PASS' : 'WARN', 'no whole-frame brightness pump', `lum loud/quiet ${pump.toFixed(2)} (want <= 1.30, FAIL > 2; "global brightness shift")`)
  check(quiet.s.lum > loud.s.lum * 1.5 ? 'FAIL' : quiet.s.lum <= loud.s.lum * 1.1 ? 'PASS' : 'WARN', 'quiet is not brighter than loud', `lum quiet ${quiet.s.lum} vs loud ${loud.s.lum} (WARN > loud x 1.1, FAIL > x 1.5; "very bright when it is quiet")`)
  const kickPump = kick.s.lum / Math.max(loud.s.lum, 1e-3)
  check(kickPump <= 1.25 ? 'PASS' : 'WARN', 'the kick is local, not a strobe', `lum kick/loud ${kickPump.toFixed(2)} (want <= 1.25)`)

  const mSil = await run('motion-silent', { also: 60 })
  const mLoud = await run('motion-loud', { features: LOUD, also: 60 })
  const ds = diff(mSil.rgb, mSil.later), dl = diff(mLoud.rgb, mLoud.later)
  check(ds < 0.05 ? 'FAIL' : ds >= 0.5 ? 'PASS' : 'WARN', 'alive in silence', `1 s frame diff ${ds} (want >= 0.5, FAIL < 0.05; "almost still except for time")`)
  check('INFO', 'motion over 1 s', `loud ${dl} vs silent ${ds}; canvas ${mSil.size.join('x')}`)
} catch (e) {
  check('FAIL', 'run', e.message)
} finally {
  await browser.close()
  writeJson(dir, 'summary.json', { shader, base, controllers: all('controller'), params: opt('params', ''), knobs, times, stats, results })
  console.log(`proof: ${dir}`)
}
process.exit(results.some((r) => r.level === 'FAIL') ? 1 : 0)
