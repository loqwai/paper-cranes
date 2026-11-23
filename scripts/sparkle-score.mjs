// SPARKLE SCORE: measures the one-frame flicker ("static", "sparkle") in a shader's output, and
// draws where it happens. Docs: docs/sparkle-score.md.
//
// A pixel sparkles when it jumps one way and straight back: f[t]-f[t-1] and f[t+1]-f[t] have opposite
// signs. Smooth motion (an edge sliding across a pixel) changes a pixel monotonically and scores ~0;
// an under-sampled filament that pops in for one frame scores the size of the pop. Per pixel-frame:
//   flip = d1*d2 < 0 ? min(|d1|, |d2|) : 0      (max over R, G, B, in 0..255)
//
//   Render mode: deterministic, headless (Playwright, virtual clock, fixed dt, features replayed per frame)
//     node scripts/sparkle-score.mjs --shader claude/wip/clit-vibej/1 --controller clit-set \
//       --trace synth --frames 120 --warmup 600 --out /tmp/sparkle/before
//   Video mode: score any recording (ffmpeg decodes it)
//     node scripts/sparkle-score.mjs --video show.mp4 --out /tmp/sparkle/show [--crop w:h:x:y]
//
// Options (render mode):
//   --shader <path>        shader under shaders/, no .frag
//   --controller <name>    repeatable; same as ?controller=
//   --params "a=1&b=2"     extra query params (knobs, voyage0, seed...)
//   --trace synth|silence|<file.json>   audio features fed each frame (file: array of feature objects,
//                          e.g. recorded from a live page with --record in the browser; see docs)
//   --frames N             frames scored (default 120)    --warmup N   frames run before scoring (default 60)
//   --dt S                 seconds per frame (default 1/60)
//   --warmdt S             seconds per warmup frame (default 0.25: 600 warmup frames = 150 s of controller time;
//                          the controller clamps dt at 0.25, so envelopes and clocks still integrate)
//   --size WxH             canvas CSS size (default 408x816, the phone)   --dpr N   device pixel ratio (default 1)
//   --base URL             dev server (default http://127.0.0.1:6969)
//   --ss N                 supersample: render at N x the pixels and box-average down (an aliasing-free
//                          reference: if sparkle is aliasing, --ss 4 scores near 0)
//   --gpu                  try the host GPU instead of SwiftShader
//   --state '{"time":36000}'  JSON merged into window.__clitSetState before load (controller state: e.g.
//                          start the clocks an hour in, to test float precision of long-running uniforms)
//   --bench N              after scoring, time N more frames (each waits for the GPU) -> msPerFrame
//   --keep                 also write every scored frame as PNG
// Outputs in --out: score.json, heat.png (sparkle map over the middle frame), heat-only.png, mid.png,
// and with --keep frames/NNNN.png. Prints one JSON line: { flipMean, sparkleFrac, ... }.

import { spawn, spawnSync } from 'child_process'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'

const args = process.argv.slice(2)
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`)
  return i < 0 ? d : args[i + 1]
}
const flag = name => args.includes(`--${name}`)
const all = name => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []))

const OUT = opt('out', 'tmp/sparkle')
const FLIP_HOT = 24   // a flip over ~10% of full scale counts as a sparkle

// ---------- analysis (shared by both modes) ----------
// frames: array of Uint8Array RGB (w*h*3)
export const analyse = (frames, w, h) => {
  const n = w * h
  const heat = new Float32Array(n)
  let sum = 0, hot = 0, count = 0
  const perFrame = []
  for (let t = 1; t < frames.length - 1; t++) {
    const a = frames[t - 1], b = frames[t], c = frames[t + 1]
    let fs = 0, fh = 0
    for (let i = 0; i < n; i++) {
      let m = 0
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k
        const d1 = b[j] - a[j], d2 = c[j] - b[j]
        if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
          const f = Math.min(Math.abs(d1), Math.abs(d2))
          if (f > m) m = f
        }
      }
      heat[i] += m
      fs += m
      if (m > FLIP_HOT) fh++
    }
    sum += fs; hot += fh; count += n
    perFrame.push(+(fs / n).toFixed(3))
  }
  const frames2 = frames.length - 2
  for (let i = 0; i < n; i++) heat[i] /= Math.max(1, frames2)
  // Motion, for context: mean |f[t]-f[t-1]|. Sparkle is only a problem relative to how much moves.
  let mot = 0
  for (let t = 1; t < frames.length; t++) {
    const a = frames[t - 1], b = frames[t]
    for (let j = 0; j < a.length; j += 7) mot += Math.abs(b[j] - a[j])
  }
  mot /= (frames.length - 1) * Math.ceil(frames[0].length / 7)
  // Brightness, for context: a fix that just darkens the frame would also "reduce sparkle"
  let lum = 0
  const mid = frames[frames.length >> 1]
  for (let j = 0; j < mid.length; j += 3) lum += 0.2126 * mid[j] + 0.7152 * mid[j + 1] + 0.0722 * mid[j + 2]
  lum /= n
  // Vividness, for context: averaging noise greys it. Over lit pixels (max channel > 60): mean saturation
  // (max-min)/max, and the share that is near-grey (saturation < 0.25)
  let sat = 0, grey = 0, lit = 0
  for (const f of [frames[frames.length >> 2], mid, frames[(frames.length * 3) >> 2]]) {
    for (let j = 0; j < f.length; j += 3) {
      const mx = Math.max(f[j], f[j + 1], f[j + 2]), mn = Math.min(f[j], f[j + 1], f[j + 2])
      if (mx <= 60) continue
      const s = (mx - mn) / mx
      lit++; sat += s; if (s < 0.25) grey++
    }
  }
  return {
    saturation: +(sat / Math.max(1, lit)).toFixed(3),
    greyFrac: +(grey / Math.max(1, lit)).toFixed(4),
    flipMean: +(sum / count).toFixed(3),
    sparkleFrac: +(hot / count).toFixed(5),
    motion: +mot.toFixed(3),
    meanLuma: +lum.toFixed(2),
    perFrame,
    heat,
  }
}

const ffmpegWrite = (rgb, w, h, path) => {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-i', '-', path], { input: Buffer.from(rgb.buffer, rgb.byteOffset, rgb.byteLength) })
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`)
}

// Heat colour: black → red → yellow → white, scaled so a mean flip of 40 is white
const heatRGB = v => {
  const x = Math.min(1, v / 40)
  return [Math.min(1, x * 3), Math.min(1, Math.max(0, x * 3 - 1)), Math.min(1, Math.max(0, x * 3 - 2))].map(c => c * 255)
}

const writeImages = async (frames, w, h, res) => {
  const mid = frames[frames.length >> 1]
  const n = w * h
  const over = new Uint8Array(n * 3), only = new Uint8Array(n * 3)
  for (let i = 0; i < n; i++) {
    const hc = heatRGB(res.heat[i])
    const a = Math.min(1, res.heat[i] / 12)
    for (let k = 0; k < 3; k++) {
      only[i * 3 + k] = hc[k]
      // the frame dimmed to 35% grey-ish, the sparkle painted over it
      over[i * 3 + k] = Math.round(mid[i * 3 + k] * 0.35 * (1 - a) + hc[k] * a)
    }
  }
  ffmpegWrite(mid, w, h, `${OUT}/mid.png`)
  ffmpegWrite(over, w, h, `${OUT}/heat.png`)
  ffmpegWrite(only, w, h, `${OUT}/heat-only.png`)
  if (flag('keep')) {
    await mkdir(`${OUT}/frames`, { recursive: true })
    frames.forEach((f, i) => ffmpegWrite(f, w, h, `${OUT}/frames/${String(i).padStart(4, '0')}.png`))
  }
}

const finish = async (frames, w, h, meta) => {
  const res = analyse(frames, w, h)
  await writeImages(frames, w, h, res)
  const { heat, ...num } = res
  const out = { ...meta, w, h, frames: frames.length, ...num }
  await writeFile(`${OUT}/score.json`, JSON.stringify(out, null, 1))
  const { perFrame, ...short } = out
  console.log(JSON.stringify(short))
}

// ---------- video mode ----------
const fromVideo = async (path) => {
  const crop = opt('crop')
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path]).stdout.toString().trim().split(',').map(Number)
  let [w, h] = probe
  const vf = []
  if (crop) { vf.push(`crop=${crop}`); [w, h] = crop.split(':').map(Number) }
  const start = opt('start'), dur = opt('duration')
  const p = spawn('ffmpeg', ['-loglevel', 'error', ...(start ? ['-ss', start] : []), '-i', path, ...(dur ? ['-t', dur] : []), ...(vf.length ? ['-vf', vf.join(',')] : []), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
  const size = w * h * 3
  const frames = []
  let buf = Buffer.alloc(0)
  for await (const chunk of p.stdout) {
    buf = Buffer.concat([buf, chunk])
    while (buf.length >= size) {
      frames.push(new Uint8Array(buf.subarray(0, size)))
      buf = buf.subarray(size)
    }
  }
  return { frames, w, h }
}

// ---------- render mode ----------
// Synthetic music: 128 BPM four-on-the-floor, hats on the off-beats, a slow energy swell. Every feature
// the clit-set controller reads, so a run is reproducible without a mic.
const synth = (i, dt) => {
  const t = i * dt, beat = t * 128 / 60, ph = beat % 1
  const kick = Math.exp(-ph * 9), hat = Math.exp(-((beat + 0.5) % 1) * 18)
  const swell = 0.5 + 0.5 * Math.sin(t * 0.4)
  return {
    energy: 0.02 + 0.03 * kick + 0.01 * swell, energyNormalized: 0.4 + 0.4 * kick, energyZScore: -0.2 + 1.1 * kick,
    energySlope: 0.002 * Math.cos(t * 0.4), energyRSquared: 0.4,
    bass: 0.1 + 0.25 * kick, bassNormalized: 0.3 + 0.6 * kick, bassZScore: -0.3 + 1.3 * kick,
    midsZScore: 0.2 * Math.sin(t * 1.3), midsNormalized: 0.5,
    trebleZScore: -0.2 + 1.0 * hat, trebleNormalized: 0.3 + 0.6 * hat,
    spectralCentroidZScore: 0.3 * Math.sin(t * 0.7), spectralCentroidNormalized: 0.5 + 0.2 * Math.sin(t * 0.3),
    spectralFluxZScore: -0.2 + 0.9 * kick, spectralEntropyNormalized: 0.6 + 0.1 * Math.sin(t * 0.9),
    spectralCrestNormalized: 0.4 + 0.3 * hat, spectralKurtosisZScore: 0.2 * Math.sin(t), spectralSpreadNormalized: 0.5,
    spectralRoughnessNormalized: 0.4 + 0.2 * kick, pitchClass: 0.25, pitchClassMedian: 0.25,
    wavelet_bassHit: ph < dt * 128 / 60 ? 1 : 0, wavelet_confirmedDrop: 0,
  }
}

const boxDown = (src, w, h, s) => {
  const W = Math.floor(w / s), H = Math.floor(h / s)
  const out = new Uint8Array(W * H * 3)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) {
    let acc = 0
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) acc += src[((y * s + j) * w + x * s + i) * 3 + k]
    out[(y * W + x) * 3 + k] = Math.round(acc / (s * s))
  }
  return out
}

const virtualClock = () => {
  // Runs before any page script. Replaces the frame clock with a stepped one, and seeds Math.random.
  let vt = 1000, id = 0, seed = 12345
  const q = new Map()
  performance.now = () => vt
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  window.requestAnimationFrame = cb => { q.set(++id, cb); return id }
  window.cancelAnimationFrame = i => q.delete(i)
  // No hot reload: an edit to the .frag mid-run would swap the shader under the measurement
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
  window.__grab = () => {
    const c = document.querySelector('canvas')
    const w = c.width, h = c.height
    const g = c.getContext('webgl2')
    const px = new Uint8Array(w * h * 4)
    g.bindFramebuffer(g.READ_FRAMEBUFFER, null)
    g.readPixels(0, 0, w, h, g.RGBA, g.UNSIGNED_BYTE, px)
    // flip rows, drop alpha
    const rgb = new Uint8Array(w * h * 3)
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4, dst = y * w * 3
      for (let x = 0; x < w; x++) {
        rgb[dst + x * 3] = px[src + x * 4]
        rgb[dst + x * 3 + 1] = px[src + x * 4 + 1]
        rgb[dst + x * 3 + 2] = px[src + x * 4 + 2]
      }
    }
    let s = ''
    for (let i = 0; i < rgb.length; i += 0x8000) s += String.fromCharCode.apply(null, rgb.subarray(i, i + 0x8000))
    return { w, h, b64: btoa(s) }
  }
}

const fromRender = async () => {
  const { chromium } = await import('playwright')
  const shader = opt('shader', 'claude/wip/clit-vibej/1')
  const base = opt('base', 'http://127.0.0.1:6969')
  const [W, H] = opt('size', '408x816').split('x').map(Number)
  const ss = Number(opt('ss', '1'))
  // The canvas is sized from its CSS size (no devicePixelRatio), so supersampling renders a bigger viewport:
  // the shader scales by iResolution.y, so the picture is the same, with ss x ss samples per output pixel
  const dpr = Number(opt('dpr', '1'))
  const N = Number(opt('frames', '120')), WARM = Number(opt('warmup', '60'))
  const dt = Number(opt('dt', String(1 / 60)))
  const traceArg = opt('trace', 'synth')
  let trace = null
  if (traceArg !== 'synth' && traceArg !== 'silence') trace = JSON.parse(await readFile(traceArg, 'utf8'))
  const feats = i => traceArg === 'silence' ? {} : trace ? trace[i % trace.length] : synth(i, dt)

  const q = new URLSearchParams({ shader, noaudio: 'true', fullscreen: 'true', seed: '0.5', seed2: '0.5', seed3: '0.5', seed4: '0.5' })
  for (const c of all('controller')) q.append('controller', c)
  for (const [k, v] of new URLSearchParams(opt('params', ''))) q.set(k, v)
  const url = `${base}/?${q}`

  const gpuArgs = flag('gpu') ? ['--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  const browser = await chromium.launch({ headless: true, args: gpuArgs })
  const page = await (await browser.newContext({ viewport: { width: W * ss, height: H * ss }, deviceScaleFactor: dpr })).newPage()
  page.on('pageerror', e => console.error('[pageerror]', e.message))
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()) })
  await page.addInitScript(virtualClock)
  if (opt('state')) await page.addInitScript(s => { window.__clitSetState = JSON.parse(s) }, opt('state'))
  await page.goto(url, { waitUntil: 'load' })
  // step until the shader has compiled and frames are flowing
  for (let tries = 0; tries < 400; tries++) {
    const fc = await page.evaluate(() => window.__step ? window.__step(1) : 0)
    const ok = await page.evaluate(() => !!(window.cranes && window.cranes.frameCount > 3 && !window.cranes.error))
    if (ok) break
    await page.waitForTimeout(50)
  }
  const t0 = Date.now()
  const warmdt = Number(opt('warmdt', '0.25'))
  for (let i = 0; i < WARM; i++) await page.evaluate(([ms, f]) => window.__step(ms, f), [warmdt * 1000, feats(Math.round(i * warmdt / dt))])
  const warmMs = Date.now() - t0
  const frames = []
  let w = 0, h = 0
  const ctl = []
  for (let i = 0; i < N; i++) {
    await page.evaluate(([ms, f]) => window.__step(ms, f), [dt * 1000, feats(Math.round(WARM * warmdt / dt) + i)])
    const g = await page.evaluate(() => window.__grab())
    w = g.w; h = g.h
    const raw = new Uint8Array(Buffer.from(g.b64, 'base64'))
    frames.push(ss > 1 ? boxDown(raw, w, h, ss) : raw)
    if (i % 10 === 0) ctl.push(await page.evaluate(() => { const c = window.cranes.controllerFeatures; return { cs_time: c.cs_time, cs_flow: c.cs_flow, cs_drift: c.cs_drift, cs_beat: c.cs_beat, cs_thump: c.cs_thump, cs_bass: c.cs_bass, cs_lz: c.cs_lz, cs_voyage: c.cs_voyage } }))
  }
  const renderer = await page.evaluate(() => {
    const g = document.querySelector('canvas').getContext('webgl2')
    const e = g.getExtension('WEBGL_debug_renderer_info')
    return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)
  })
  let msPerFrame = null
  const B = Number(opt('bench', '0'))
  if (B > 0) {
    msPerFrame = await page.evaluate(([n, ms]) => {
      const g = document.querySelector('canvas').getContext('webgl2')
      const px = new Uint8Array(4)
      window.__step(ms); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px)
      const t = Date.now()
      for (let i = 0; i < n; i++) { window.__step(ms); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px) }
      return (Date.now() - t) / n
    }, [B, dt * 1000])
  }
  const err = await page.evaluate(() => window.cranes.error ?? null)
  await browser.close()
  if (err) throw new Error(`shader error: ${err}`)
  if (ss > 1) { w = Math.floor(w / ss); h = Math.floor(h / ss) }
  return { frames, w, h, meta: { url, renderer, msPerFrame, ss, trace: traceArg, dt, warmup: WARM, warmMsPerFrame: +(warmMs / Math.max(1, WARM)).toFixed(1), controllerSample: ctl } }
}

await mkdir(OUT, { recursive: true })
if (opt('video')) {
  const { frames, w, h } = await fromVideo(opt('video'))
  await finish(frames, w, h, { video: opt('video') })
} else {
  const { frames, w, h, meta } = await fromRender()
  await finish(frames, w, h, meta)
}
