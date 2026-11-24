#!/usr/bin/env node
// Load-time benchmark for the production build: cold and warm time to the first shader frame.
import { createServer } from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { brotliCompressSync, constants as zc } from 'node:zlib'
import { extname, join, resolve, normalize, relative, sep } from 'node:path'
import { writeFileSync, openSync, closeSync, readFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'

const PROFILES = {
  // Lighthouse's mobile preset: 150 ms RTT, 1.6 Mbps down, 750 kbps up, 4x CPU slowdown.
  phone: { latency: 150, down: 1_600_000 / 8, up: 750_000 / 8, cpu: 4 },
  none: null,
}

const CASES = {
  default: { query: '' },
  heavy: { query: '?shader=sun/17' },
}

const usage = `usage:
  node scripts/bench-load.mjs --dir dist [--runs 15]
  node scripts/bench-load.mjs --a distA --b distB [--runs 15]
options:
  --cases default,heavy   cases to run (default: both); name=?query adds an ad-hoc case
  --profile phone|none    network+CPU throttle (default: phone)
  --runtime               also record steady-state frame time for 10 s on the heavy case
  --out file.json         write every raw sample
  --headed                show the browser`

const parseArgs = (argv) => {
  const args = { runs: 15, cases: Object.keys(CASES), profile: 'phone', runtime: false, headed: false }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '')
    if (['runtime', 'headed'].includes(key)) { args[key] = true; continue }
    const value = argv[++i]
    if (key === 'runs') args.runs = Number(value)
    else if (key === 'cases') args.cases = value.split(',').map((c) => {
      const [name, query] = c.split(/=(.*)/s)
      if (query !== undefined) CASES[name] = { query }
      return name
    })
    else args[key] = value
  }
  if (!args.dir && !args.a) throw new Error(usage)
  if (args.b && !args.a) throw new Error(usage)
  if (!(args.profile in PROFILES)) throw new Error(`unknown --profile ${args.profile}`)
  for (const c of args.cases) if (!CASES[c]) throw new Error(`unknown case ${c}`)
  return args
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.frag': 'text/plain; charset=utf-8',
  '.vert': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.frag', '.vert', '.svg', '.webmanifest'])

// Every file's path and bytes, so two dists that differ anywhere get different ids.
const hashTree = async (root) => {
  const hash = createHash('sha1')
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile())
    .map((e) => relative(root, join(e.parentPath, e.name)).split(sep).join('/'))
    .sort()
  for (const file of files) hash.update(file).update(String.fromCharCode(10)).update(await readFile(join(root, file)))
  return hash.digest('hex').slice(0, 12)
}

// Mirrors what Cloudflare Pages does for this site: ETag + revalidate every request, brotli for text.
const serveDir = async (dir) => {
  const root = resolve(dir)
  const buildId = await hashTree(root)
  const cache = new Map()
  const load = async (path) => {
    if (cache.has(path)) return cache.get(path)
    const body = await readFile(path)
    const ext = extname(path)
    const entry = {
      body,
      br: COMPRESSIBLE.has(ext) ? brotliCompressSync(body, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } }) : null,
      etag: `"${createHash('sha1').update(body).digest('hex').slice(0, 16)}"`,
      type: MIME[ext] ?? 'application/octet-stream',
    }
    cache.set(path, entry)
    return entry
  }
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    let path = normalize(join(root, decodeURIComponent(url.pathname)))
    if (!path.startsWith(root)) return res.writeHead(403).end()
    try {
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html')
    } catch {
      return res.writeHead(404).end()
    }
    const f = await load(path)
    const headers = { 'x-bench-build': buildId, 'content-type': f.type, etag: f.etag, 'cache-control': 'public, max-age=0, must-revalidate' }
    if (req.headers['if-none-match'] === f.etag) return res.writeHead(304, headers).end()
    const useBr = f.br && /\bbr\b/.test(req.headers['accept-encoding'] ?? '')
    if (useBr) headers['content-encoding'] = 'br'
    const body = useBr ? f.br : f.body
    headers['content-length'] = body.length
    res.writeHead(200, headers).end(body)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { origin: `http://localhost:${server.address().port}`, buildId, close: () => { server.closeAllConnections(); server.close() } }
}

// First frame = the first draw that writes to the canvas's default framebuffer (blitFramebuffer or a
// draw call while DRAW_FRAMEBUFFER is null), i.e. the first rAF callback in which the compiled shader
// reached the screen. Hooked from outside the app so any build, old or new, is measured the same way.
const FIRST_FRAME_HOOK = () => {
  const proto = WebGL2RenderingContext.prototype
  const names = ['blitFramebuffer', 'drawArrays', 'drawElements']
  const originals = Object.fromEntries(names.map((n) => [n, proto[n]]))
  const restore = () => names.forEach((n) => { proto[n] = originals[n] })
  for (const n of names) {
    proto[n] = function (...args) {
      if (this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null) {
        const t = performance.now()
        restore()
        performance.mark('bench:first-frame')
        const r = originals[n].apply(this, args)
        // Prove the frame drew something: sample the middle row and column of what reached the canvas.
        const readFb = this.getParameter(this.READ_FRAMEBUFFER_BINDING)
        this.bindFramebuffer(this.READ_FRAMEBUFFER, null)
        const w = this.drawingBufferWidth, h = this.drawingBufferHeight
        const row = new Uint8Array(w * 4), col = new Uint8Array(h * 4)
        this.readPixels(0, h >> 1, w, 1, this.RGBA, this.UNSIGNED_BYTE, row)
        this.readPixels(w >> 1, 0, 1, h, this.RGBA, this.UNSIGNED_BYTE, col)
        this.bindFramebuffer(this.READ_FRAMEBUFFER, readFb)
        let lit = 0
        for (const px of [row, col]) for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 24) lit++
        const ext = this.getExtension('WEBGL_debug_renderer_info')
        const renderer = this.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : this.RENDERER)
        globalThis.__benchFirstFrame?.({ t, controlled: !!navigator.serviceWorker?.controller, lit, sampled: w + h, renderer })
        return r
      }
      return originals[n].apply(this, args)
    }
  }
}

const RUNTIME_PROBE = (ms) => new Promise((done) => {
  const frames = []
  let last = performance.now()
  const end = last + ms
  const tick = (now) => {
    frames.push(now - last)
    last = now
    if (now < end) requestAnimationFrame(tick)
    else done(frames)
  }
  requestAnimationFrame(tick)
})

const withTimeout = (p, ms, what) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${what} after ${ms} ms`)), ms)),
])

// One throttled, instrumented page in a fresh context. `serviceWorkers` decides whether the app's
// service worker may register: CDP throttling on the page does not cover fetches the SW makes, so
// a SW that claims the page mid-visit would serve the rest of the cold load unthrottled.
const openPage = async ({ browser, origin, buildId, caseName, profile, serviceWorkers }) => {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, serviceWorkers,
  })
  const page = await context.newPage()
  let firstFrame
  await page.exposeFunction('__benchFirstFrame', (x) => firstFrame?.(x))
  await page.addInitScript(FIRST_FRAME_HOOK)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  if (profile) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: profile.latency, downloadThroughput: profile.down, uploadThroughput: profile.up,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu })
  }

  let requests = new Map()
  cdp.on('Network.requestWillBeSent', (e) => {
    requests.set(e.requestId, { url: e.request.url, start: e.timestamp, end: null, bytes: 0, fromSw: false })
  })
  const servedBuilds = []
  cdp.on('Network.responseReceived', (e) => {
    const r = requests.get(e.requestId)
    if (r) r.fromSw = !!e.response.fromServiceWorker
    if (e.type === 'Document') servedBuilds.push(e.response.headers['x-bench-build'] ?? 'none')
  })
  cdp.on('Network.loadingFinished', (e) => {
    const r = requests.get(e.requestId)
    if (r) Object.assign(r, { end: e.timestamp, bytes: e.encodedDataLength })
  })
  cdp.on('Network.loadingFailed', (e) => {
    const r = requests.get(e.requestId)
    if (r) Object.assign(r, { end: e.timestamp, failed: true })
  })

  const url = origin + '/' + CASES[caseName].query
  const measure = async (go) => {
    requests = new Map()
    const frame = new Promise((r) => { firstFrame = r })
    await go()
    const ff = await withTimeout(frame, 120_000, `first frame ${caseName}`)
    const served = servedBuilds.at(-1)
    // A warm document comes from the SW cache, which keeps the header the server sent on the cold visit.
    if (served !== buildId) throw new Error(`document came from build ${served}, expected ${buildId}`)
    if (ff.lit === 0) throw new Error(`first frame was black (${ff.sampled} pixels sampled)`)
    if (/swiftshader|software|llvmpipe/i.test(ff.renderer)) throw new Error(`software WebGL: ${ff.renderer}`)
    const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null)
    return summarize(ff, fcp, requests)
  }
  const summarize = (ff, fcp, reqs) => {
    // CDP timestamps are monotonic seconds; anchor them on the navigation request.
    const all = [...reqs.values()]
    const doc = all.find((r) => r.url.startsWith(url.split('?')[0])) ?? all[0]
    const t0 = doc?.start ?? 0
    const rel = (s) => (s - t0) * 1000
    const ffAbs = t0 + ff.t / 1000
    const before = all.filter((r) => r.end && r.end <= ffAbs)
    const esm = all.filter((r) => r.url.startsWith('https://esm.sh/') && r.start <= ffAbs && r.end)
    return {
      firstFrame: ff.t,
      litPixels: ff.lit,
      fcp,
      requestsToFirstFrame: before.length,
      bytesToFirstFrame: before.reduce((s, r) => s + (r.bytes || 0), 0),
      swControlled: ff.controlled,
      swServedBeforeFirstFrame: before.filter((r) => r.fromSw).length,
      esmRequests: esm.length,
      esmLastEnd: esm.length ? Math.max(...esm.map((r) => rel(r.end))) : null,
      esmBusy: esm.reduce((s, r) => s + (r.end - r.start) * 1000, 0),
      waterfall: all.map((r) => ({
        url: r.url.replace(origin, ''), start: Math.round(rel(r.start)), end: r.end ? Math.round(rel(r.end)) : null,
        bytes: r.bytes, fromSw: r.fromSw, ...(r.failed ? { failed: true } : {}),
      })),
    }
  }
  return { context, page, url, measure, allRequests: () => [...requests.values()] }
}

const runOnce = async ({ browser, origin, buildId, caseName, profile, runtime }) => {
  const opts = { browser, origin, buildId, caseName, profile }

  // Cold: first visit, no cache, service worker blocked so every request stays on the throttled network.
  const cold = await openPage({ ...opts, serviceWorkers: 'block' })
  let coldSummary, totalBytes, totalRequests, frames = null
  try {
    coldSummary = await cold.measure(() => cold.page.goto(cold.url, { waitUntil: 'commit' }))
    if (coldSummary.swControlled || coldSummary.swServedBeforeFirstFrame) {
      throw new Error('service worker was in control during the cold load')
    }
    await cold.page.waitForLoadState('load', { timeout: 120_000 })
    await cold.page.waitForTimeout(1500)
    const reqs = cold.allRequests()
    totalBytes = reqs.reduce((s, r) => s + (r.bytes || 0), 0)
    totalRequests = reqs.length
    if (runtime) frames = await cold.page.evaluate(RUNTIME_PROBE, 10_000)
  } finally {
    await cold.context.close()
  }

  // Warm: a first visit installs the service worker (unmeasured), then the reload is measured.
  const warm = await openPage({ ...opts, serviceWorkers: 'allow' })
  try {
    await warm.page.goto(warm.url, { waitUntil: 'load', timeout: 120_000 })
    await withTimeout(warm.page.evaluate(() => navigator.serviceWorker?.ready.then(() => true)), 60_000, 'sw ready')
    await warm.page.waitForTimeout(1500)
    const warmSummary = await warm.measure(() => warm.page.reload({ waitUntil: 'commit' }))
    if (!warmSummary.swControlled) throw new Error('service worker was not in control during the warm load')
    return {
      ...coldSummary, totalBytes, totalRequests,
      warmFirstFrame: warmSummary.firstFrame, warmSwControlled: warmSummary.swControlled,
      warmBytesToFirstFrame: warmSummary.bytesToFirstFrame,
      warmWaterfall: warmSummary.waterfall,
      frames,
    }
  } finally {
    await warm.context.close()
  }
}

// ---- statistics ----
const quantile = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo)
}
const median = (xs) => quantile(xs, 0.5)

const normalCdf = (z) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2
}

// Two-sided Mann-Whitney U, normal approximation with tie correction.
const mannWhitney = (a, b) => {
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v)
  const ranks = new Array(all.length)
  let tieTerm = 0
  for (let i = 0; i < all.length;) {
    let j = i
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j++
    for (let k = i; k <= j; k++) ranks[k] = (i + j) / 2 + 1
    const t = j - i + 1
    tieTerm += t ** 3 - t
    i = j + 1
  }
  const n1 = a.length, n2 = b.length, n = n1 + n2
  const r1 = all.reduce((s, x, i) => s + (x.g === 0 ? ranks[i] : 0), 0)
  const u = r1 - (n1 * (n1 + 1)) / 2
  const mu = (n1 * n2) / 2
  const sigma = Math.sqrt((n1 * n2 / 12) * ((n + 1) - tieTerm / (n * (n - 1))))
  if (sigma === 0) return 1
  const z = (Math.abs(u - mu) - 0.5) / sigma
  return Math.min(1, 2 * (1 - normalCdf(z)))
}

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// 95% bootstrap CI of median(b) - median(a).
const bootstrapDelta = (a, b, iters = 4000) => {
  const rand = rng(12345)
  const pick = (xs) => xs.map(() => xs[Math.floor(rand() * xs.length)])
  const deltas = Array.from({ length: iters }, () => median(pick(b)) - median(pick(a)))
  return [quantile(deltas, 0.025), quantile(deltas, 0.975)]
}

// The last column is the smallest delta worth calling: byte counts barely vary, so a few header
// bytes would otherwise test as significant.
const METRICS = [
  ['firstFrame', 'first frame (cold)', 'ms', 0],
  ['warmFirstFrame', 'first frame (warm)', 'ms', 0],
  ['fcp', 'FCP (cold)', 'ms', 0],
  ['bytesToFirstFrame', 'bytes to first frame', 'B', 512],
  ['totalBytes', 'bytes total (cold)', 'B', 512],
  ['requestsToFirstFrame', 'requests to first frame', '', 0.5],
  ['totalRequests', 'requests total (cold)', '', 0.5],
  ['esmLastEnd', 'esm.sh last byte', 'ms', 0],
  ['esmBusy', 'esm.sh request time sum', 'ms', 0],
]

const fmt = (v, unit) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '-'
  if (unit === 'B') return `${(v / 1024).toFixed(1)}KB`
  if (unit === 'ms') return `${v.toFixed(0)}`
  return v.toFixed(1)
}

const describe = (xs, unit) => {
  const v = xs.filter((x) => x !== null && x !== undefined)
  if (!v.length) return { text: '-', v }
  const q1 = quantile(v, 0.25), q3 = quantile(v, 0.75)
  return { text: `${fmt(median(v), unit)} [${fmt(q1, unit)}-${fmt(q3, unit)}]`, v, median: median(v), iqr: q3 - q1 }
}

const report = (results, variants, caseName) => {
  const lines = [`\n== case: ${caseName}  (median [IQR], n=${results.filter((r) => r.variant === variants[0].label && r.case === caseName && !r.error).length} per variant)`]
  const verdicts = {}
  for (const [key, label, unit, minEffect] of METRICS) {
    const cols = variants.map((v) => describe(results.filter((r) => r.variant === v.label && r.case === caseName && !r.error).map((r) => r[key]), unit))
    let row = `${label.padEnd(26)} ` + cols.map((c, i) => `${variants[i].label}: ${c.text}`.padEnd(32)).join('')
    if (variants.length === 2 && cols[0].v.length && cols[1].v.length) {
      const [a, b] = [cols[0].v, cols[1].v]
      const d = median(b) - median(a)
      const p = mannWhitney(a, b)
      const [lo, hi] = bootstrapDelta(a, b)
      const sig = p < 0.05 && (lo > 0 || hi < 0) && Math.abs(d) >= minEffect
      row += ` B-A: ${fmt(d, unit)} (${(100 * d / median(a)).toFixed(1)}%) CI[${fmt(lo, unit)}, ${fmt(hi, unit)}] p=${p.toFixed(4)} ${sig ? 'SIGNIFICANT' : 'n.s.'}`
      verdicts[key] = { delta: d, pct: 100 * d / median(a), ci: [lo, hi], p, significant: sig }
    } else if (cols[0].median !== undefined) {
      row += ` noise: IQR/median ${(100 * cols[0].iqr / cols[0].median).toFixed(1)}%`
    }
    lines.push(row)
  }
  const sw = results.filter((r) => r.case === caseName && !r.error)
  lines.push(`sw controlled page at cold first frame: ${sw.filter((r) => r.swControlled).length}/${sw.length}; at warm first frame: ${sw.filter((r) => r.warmSwControlled).length}/${sw.length}`)
  const runtimeRuns = sw.filter((r) => r.frames)
  for (const v of variants) {
    const fr = runtimeRuns.filter((r) => r.variant === v.label).flatMap((r) => r.frames.slice(5))
    if (fr.length) lines.push(`${v.label} steady-state frame time: median ${median(fr).toFixed(1)} ms, p95 ${quantile(fr, 0.95).toFixed(1)} ms (${fr.length} frames)`)
  }
  const errors = results.filter((r) => r.case === caseName && r.error)
  if (errors.length) lines.push(`errors: ${errors.length} -> ${[...new Set(errors.map((e) => e.error))].join(' | ')}`)
  return { text: lines.join('\n'), verdicts }
}

// One benchmark at a time on this machine: two concurrent runs turn each other into noise.
const LOCK = join(tmpdir(), 'paper-cranes-bench-load.lock')
const takeLock = async () => {
  for (let waited = 0; ; waited += 5) {
    try {
      const fd = openSync(LOCK, 'wx')
      writeFileSync(fd, String(process.pid))
      closeSync(fd)
      const release = () => { try { unlinkSync(LOCK) } catch {} }
      process.on('exit', release)
      process.on('SIGINT', () => process.exit(130))
      return
    } catch {
      const holder = Number(readFileSync(LOCK, 'utf8'))
      let alive = false
      try { process.kill(holder, 0); alive = true } catch {}
      if (!alive) { try { unlinkSync(LOCK) } catch {} ; continue }
      if (waited % 60 === 0) console.log(`waiting for ${LOCK} (held by pid ${holder}, ${waited} s)`)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  await takeLock()
  const variants = args.a
    ? [{ label: 'A', dir: args.a }, ...(args.b ? [{ label: 'B', dir: args.b }] : [])]
    : [{ label: 'A', dir: args.dir }]
  for (const v of variants) v.server = await serveDir(v.dir)
  const profile = PROFILES[args.profile]
  const browser = await chromium.launch({
    headless: !args.headed,
    // Vulkan ANGLE: D3D11 compiles big shaders through FXC (sun/17 took over 90 s), GL took 9.9 s.
    // The program caches are off so every cold run compiles the shader, as a first visit does.
    args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--enable-gpu', '--ignore-gpu-blocklist',
      '--disable-gpu-program-cache', '--disable-gpu-shader-disk-cache'],
  })
  const gpuStatus = async () => {
    const s = await browser.newBrowserCDPSession()
    const info = await s.send('SystemInfo.getInfo')
    await s.detach()
    return info.gpu.featureStatus
  }
  const status = await gpuStatus()
  if (status.gpu_compositing !== 'enabled' || !String(status.webgl2).startsWith('enabled')) {
    throw new Error(`no hardware GPU: gpu_compositing=${status.gpu_compositing} webgl2=${status.webgl2}`)
  }
  const gpu = await (async () => {
    const p = await browser.newPage()
    const r = await p.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return gl ? gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'no webgl2'
    })
    await p.close()
    return r
  })()
  console.log(`chromium ${browser.version()} | gpu: ${gpu} | gpu_compositing=${status.gpu_compositing} webgl2=${status.webgl2} | profile: ${args.profile} ${JSON.stringify(profile)}`)
  console.log(variants.map((v) => `${v.label} = ${v.dir} (${v.server.origin}, build ${v.server.buildId})`).join('\n'))

  const results = []
  const started = Date.now()
  for (let i = 0; i < args.runs; i++) {
    for (const caseName of args.cases) {
      // Interleave variants and alternate their order so drift lands on both equally.
      const order = i % 2 ? [...variants].reverse() : variants
      for (const v of order) {
        const base = { variant: v.label, case: caseName, iteration: i }
        try {
          const r = await runOnce({
            browser, origin: v.server.origin, buildId: v.server.buildId, caseName, profile,
            runtime: args.runtime && caseName === 'heavy',
          })
          results.push({ ...base, ...r })
          process.stdout.write(`  run ${i + 1}/${args.runs} ${caseName} ${v.label}: first frame ${r.firstFrame.toFixed(0)} ms, warm ${r.warmFirstFrame.toFixed(0)} ms\n`)
        } catch (e) {
          results.push({ ...base, error: e.message.split('\n')[0] })
          process.stdout.write(`  run ${i + 1}/${args.runs} ${caseName} ${v.label}: ERROR ${e.message.split('\n')[0]}\n`)
        }
      }
    }
  }
  const endStatus = await gpuStatus()
  console.log(`gpu_compositing at end: ${endStatus.gpu_compositing}`)
  await browser.close()
  variants.forEach((v) => v.server.close())

  const summary = {}
  for (const c of args.cases) {
    const { text, verdicts } = report(results, variants, c)
    console.log(text)
    summary[c] = verdicts
  }
  console.log(`\nwall time ${((Date.now() - started) / 1000).toFixed(0)} s`)
  if (args.out) {
    writeFileSync(args.out, JSON.stringify({ args: { ...args }, gpu, profile, variants: variants.map(({ label, dir }) => ({ label, dir })), summary, results }, null, 2))
    console.log(`raw samples -> ${args.out}`)
  }
  process.exit(results.some((r) => r.error) ? 2 : 0)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
