// Shared helpers for verify-paper-cranes: ports, run state, the proof folder, and a Playwright
// browser that collects errors and records video. Import it from a recipe script by absolute path;
// `playwright` resolves from this file's location, so the repo needs `npm ci` once.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, renameSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import net from 'node:net'

export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO = resolve(SKILL_DIR, '../../..')

// Aaron's dev server and the live show. Never bind, probe-by-driving, or kill these.
export const FORBIDDEN_PORTS = [6969, 6977, 6978, 6991]
export const PORT_RANGE = [7140, 7149]

export const PHONE = { width: 390, height: 844 }
export const DESKTOP = { width: 1280, height: 800 }

// SwiftShader gives Chromium WebGL2 on any box, GPU or not, headless or headful.
export const CHROMIUM_ARGS = [
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--autoplay-policy=no-user-gesture-required',
]

export const assertPortAllowed = (port) => {
  if (FORBIDDEN_PORTS.includes(Number(port))) {
    throw new Error(`port ${port} belongs to Aaron's dev server or the live show; pick another (pc-verify port)`)
  }
}

const portFree = (port) => new Promise((res) => {
  const s = net.createServer()
  s.once('error', () => res(false))
  s.listen(port, '127.0.0.1', () => s.close(() => res(true)))
})

export const freePort = async () => {
  for (let p = PORT_RANGE[0]; p <= PORT_RANGE[1]; p++) if (await portFree(p)) return p
  throw new Error(`no free port in ${PORT_RANGE.join('-')}; run pc-verify cleanup, or pass --port`)
}

// Run state is scratch, one file per checkout, so two worktrees can verify side by side.
const repoKey = createHash('sha1').update(REPO).digest('hex').slice(0, 12)
export const STATE_DIR = join(process.env.XDG_RUNTIME_DIR || tmpdir(), 'pc-verify')
export const STATE_FILE = join(STATE_DIR, `${repoKey}.json`)

export const readState = () => (existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : null)
export const writeState = (s) => { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)) }

// Proof is durable and outside the checkout: cleanup and worktree removal never touch it.
export const PROOF_ROOT = process.env.PC_PROOF_DIR || join(homedir(), 'paper-cranes-proof')

const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z')

export const runId = () => {
  const s = readState()
  if (s?.runId) return s.runId
  const id = `${stamp()}-verify`
  writeState({ ...(s || {}), runId: id })
  return id
}

export const proofDir = (feature) => {
  const dir = join(PROOF_ROOT, runId(), feature)
  mkdirSync(dir, { recursive: true })
  return dir
}

export const baseUrl = (override) => {
  if (override) return override.replace(/\/+$/, '')
  const s = readState()
  if (s?.base) return s.base
  throw new Error('no running instance: run `pc-verify launch`, or pass --base <url>')
}

/**
 * Start a browser. headful needs a display (WSLg DISPLAY=:0, or wrap the command in xvfb-run).
 * Chromium (default) is for pixels: SwiftShader WebGL2, and features injected through
 * window.cranes.manualFeatures. Firefox is for real audio: measured 2026-11-24 on WSL, Playwright's
 * bundled Chromium never resolves audioWorklet.addModule (headless or headful), so audio_file=,
 * the mic and tab audio give no features there; Playwright Firefox gives them.
 */
export const startBrowser = async ({ headful = false, browser = 'chromium' } = {}) => {
  if (headful && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new Error('headful needs a display: set DISPLAY (WSLg gives :0) or run under `xvfb-run -a`')
  }
  const pw = await import('playwright')
  if (browser === 'firefox') return pw.firefox.launch({ headless: !headful, firefoxUserPrefs: { 'media.autoplay.default': 0 } })
  return pw.chromium.launch({ headless: !headful, args: CHROMIUM_ARGS })
}

/**
 * A fresh context and page, with every error collected. With videoDir, Playwright records the
 * page to <videoDir>/<name>.webm, finalized by close().
 */
export const newPage = async (browser, { viewport = DESKTOP, videoDir, name = 'page', init } = {}) => {
  const ctx = await browser.newContext({
    viewport,
    ...(videoDir ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
  })
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  const log = { console: [], pageErrors: [], badResponses: [] }
  page.on('console', (m) => log.console.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => log.pageErrors.push(e.message))
  page.on('response', (r) => { if (r.status() >= 400) log.badResponses.push(`${r.status()} ${r.url()}`) })
  const close = async () => {
    const video = page.video()
    await ctx.close()
    if (video && videoDir) {
      const out = join(videoDir, `${name}.webm`)
      renameSync(await video.path(), out)
      return out
    }
    return null
  }
  return { ctx, page, log, close }
}

/** Poll until fn() is truthy, then return it. */
export const until = async (fn, { timeout = 25_000, interval = 250, what = 'condition' } = {}) => {
  for (const end = Date.now() + timeout; ;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > end) throw new Error(`timed out after ${timeout}ms waiting for ${what}`)
    await new Promise((r) => setTimeout(r, interval))
  }
}

/** Wait until the render loop has drawn n more frames than now. */
export const framesAdvance = async (page, n = 5) => {
  const start = await page.evaluate(() => window.cranes?.frameCount ?? 0)
  return until(() => page.evaluate((s) => (window.cranes?.frameCount ?? 0) >= s, start + n), { what: `${n} frames` })
}

// Decode a PNG in the page and measure it: lit share, distinct colours, mean RGB.
const statsInPage = async (src) => {
  const img = new Image()
  img.src = src
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const g = c.getContext('2d')
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height).data
  let lit = 0
  const sum = [0, 0, 0]
  const colours = new Set()
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] + d[i + 1] + d[i + 2] > 30) lit++
    sum[0] += d[i]; sum[1] += d[i + 1]; sum[2] += d[i + 2]
    colours.add(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3))
  }
  const n = d.length / 4
  return { width: c.width, height: c.height, litFraction: +(lit / n).toFixed(4), colours: colours.size, meanRgb: sum.map((s) => Math.round(s / n)) }
}

/** Screenshot the #visualizer canvas to `path` and return its pixel stats. */
export const canvasShot = async (page, path) => {
  const png = await page.locator('#visualizer').screenshot({ path })
  return page.evaluate(statsInPage, `data:image/png;base64,${png.toString('base64')}`)
}

/** Mean absolute per-channel difference (0-255) between two PNG files, decoded in `page`. */
export const pngDiff = (page, a, b) => page.evaluate(async ([sa, sb]) => {
  const load = async (src) => {
    const img = new Image(); img.src = src; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    return g.getImageData(0, 0, c.width, c.height).data
  }
  const [da, db] = await Promise.all([load(sa), load(sb)])
  if (da.length !== db.length) return null
  let total = 0
  for (let i = 0; i < da.length; i += 4) total += Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])
  return +(total / (da.length / 4) / 3).toFixed(2)
}, [a, b].map((p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`))

/** Shader compile errors the page reported (Visualizer sets window.cranes.error). */
export const shaderError = (page) => page.evaluate(() => window.cranes?.error || null)

export const writeJson = (dir, name, data) => writeFileSync(join(dir, name), JSON.stringify(data, null, 2))
export const writeLog = (dir, name, lines) => appendFileSync(join(dir, name), lines.join('\n') + (lines.length ? '\n' : ''))
