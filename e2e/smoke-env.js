// Shared harness for the smoke suite (e2e/smoke.test.js, e2e/relay.test.js).
//
// Where it points:
//   E2E_BASE_URL unset  -> serves ./dist (run `npm run build` first) on 127.0.0.1:${E2E_PORT || 7129}
//                          with a static server that answers the way Cloudflare Pages does
//   E2E_BASE_URL=<url>  -> that site as deployed: https://visuals.beadfamous.com or a Pages preview
// E2E_VIDEO_DIR=<dir> records every page as <test>.webm there (Playwright recordVideo), plus a
// final <test>.png screenshot.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const ROOT = new URL('..', import.meta.url).pathname
export const DIST = path.join(ROOT, 'dist')
export const VIDEO_DIR = process.env.E2E_VIDEO_DIR || null
const REMOTE_BASE = process.env.E2E_BASE_URL?.replace(/\/+$/, '') || null
const PORT = Number(process.env.E2E_PORT || 7129)

export const PHONE = { width: 390, height: 844 }
export const DESKTOP = { width: 1280, height: 800 }

// Runnable when a target exists: a deployed URL, or a local build to serve.
export const hasTarget = () => Boolean(REMOTE_BASE) || fs.existsSync(path.join(DIST, 'index.html'))

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.frag': 'text/plain', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
}

// Cloudflare Pages behaviour that the app has had bugs against: `/x.html` 308s to `/x`, and a path
// with no file answers 200 with index.html (so a missing .frag comes back as a web page).
const servePagesLike = (root, port) => new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    let p = decodeURIComponent(url.pathname)
    if (p.endsWith('.html')) {
      res.writeHead(308, { location: p.replace(/(index)?\.html$/, '') + url.search })
      return res.end()
    }
    if (p.endsWith('/')) p += 'index.html'
    let file = path.join(root, p)
    if (!file.startsWith(root)) { res.writeHead(403); return res.end() }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (fs.existsSync(`${file}.html`)) file = `${file}.html`
      else file = path.join(root, 'index.html')
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' })
    fs.createReadStream(file).pipe(res)
  })
  server.once('error', reject)
  server.listen(port, '127.0.0.1', () => resolve(server))
})

// Start the target and a browser. Returns { base, browser, newPage, close }.
export const startSmoke = async () => {
  let server = null
  let base = REMOTE_BASE
  if (!base) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('no dist/ to serve: run `npm run build`, or set E2E_BASE_URL')
    server = await servePagesLike(DIST, PORT)
    base = `http://127.0.0.1:${PORT}`
  }
  // SwiftShader gives headless Chromium a WebGL2 context on any box, GPU or not.
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  })
  if (VIDEO_DIR) fs.mkdirSync(VIDEO_DIR, { recursive: true })

  // A fresh context per page (own storage, own service worker), with what went wrong collected.
  const newPage = async ({ viewport = DESKTOP, init, name } = {}) => {
    const ctx = await browser.newContext({
      viewport,
      ...(VIDEO_DIR ? { recordVideo: { dir: VIDEO_DIR, size: viewport } } : {}),
    })
    if (init) await ctx.addInitScript(init)
    const page = await ctx.newPage()
    const pageErrors = [], consoleErrors = [], badResponses = [], responses = []
    page.on('pageerror', e => pageErrors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })
    page.on('response', r => {
      responses.push({ status: r.status(), url: r.url() })
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`)
    })
    const close = async () => {
      const video = page.video()
      if (VIDEO_DIR && name && !page.isClosed()) await page.screenshot({ path: path.join(VIDEO_DIR, `${name}.png`) }).catch(() => {})
      await ctx.close()
      if (video && name) fs.renameSync(await video.path(), path.join(VIDEO_DIR, `${name}.webm`))
    }
    return { ctx, page, pageErrors, consoleErrors, badResponses, responses, close }
  }

  const close = async () => {
    await browser.close()
    await new Promise(r => (server ? server.close(r) : r()))
  }
  return { base, browser, newPage, close }
}

// Pixels of the #visualizer canvas as the screen shows them (a screenshot, so it works without
// preserveDrawingBuffer), decoded in the page: how many are lit and how many colours there are.
export const canvasStats = async page => {
  const png = await page.locator('#visualizer').screenshot()
  return page.evaluate(async src => {
    const img = new Image()
    img.src = src
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let lit = 0
    const colours = new Set()
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] > 30) lit++
      colours.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | d[i + 2] >> 3)
    }
    const total = d.length / 4
    return { total, lit, litFraction: lit / total, colours: colours.size }
  }, `data:image/png;base64,${png.toString('base64')}`)
}

// Poll until fn() is truthy (returns it) or the deadline passes.
export const until = async (fn, { timeout = 20_000, interval = 250, what = 'condition' } = {}) => {
  let last
  for (const end = Date.now() + timeout; ;) {
    last = await fn()
    if (last) return last
    if (Date.now() > end) throw new Error(`timed out after ${timeout}ms waiting for ${what}`)
    await new Promise(r => setTimeout(r, interval))
  }
}

// Wait for the canvas to be painted: some share of it lit and more than a handful of colours.
export const untilRendered = (page, { minLit = 0.2, minColours = 50, timeout = 25_000 } = {}) =>
  until(async () => {
    const s = await canvasStats(page)
    return s.litFraction >= minLit && s.colours >= minColours ? s : null
  }, { timeout, interval: 500, what: 'the canvas to render' })
