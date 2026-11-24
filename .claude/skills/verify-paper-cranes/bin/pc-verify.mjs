#!/usr/bin/env node
// pc-verify: launch, check, drive and tear down a paper-cranes instance for verification.
// See ../SKILL.md. Every capture lands in the proof folder ($PC_PROOF_DIR, default
// ~/paper-cranes-proof/<run-id>/<feature>/), which cleanup never deletes.
//
//   pc-verify port                                   print a free port in 7140-7149
//   pc-verify launch [--mode dev|preview] [--port N] start the app, wait until it serves a canvas
//   pc-verify doctor [--base URL]                    read-only: is this instance worth driving?
//   pc-verify render [--shader S] [--features JSON] [--params QS] [--video] [--base URL]
//                                                    A/B a shader at rest vs injected features
//   pc-verify open <path|url> [--viewport WxH] [--headful] [--video] [--canvas]
//                  [--eval JS] [--wait MS] [--name N] [--feature F] [--base URL]
//                  [--browser chromium|firefox]  (firefox for real audio; see lib.mjs)
//                                                    capture any page: screenshot, log, eval
//   pc-verify cleanup                                stop what launch started; keep the proof
import { spawn, execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, realpathSync, rmSync, copyFileSync, openSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  REPO, STATE_FILE, STATE_DIR, PROOF_ROOT, DESKTOP, FORBIDDEN_PORTS,
  assertPortAllowed, freePort, readState, writeState, runId, proofDir, baseUrl,
  startBrowser, newPage, until, framesAdvance, canvasShot, pngDiff, shaderError, writeJson, writeLog,
} from './lib.mjs'

// Recipes that write shaders put them here; cleanup removes it.
export const SCRATCH_SHADER_DIR = join(REPO, 'shaders/claude/wip/verify-scratch')
// Generated test audio goes here as verify-*.mp3 (the folder is gitignored); cleanup removes those.
export const SCRATCH_AUDIO_DIR = join(REPO, 'public/test-audio')
// Starting the dev server or a build refreshes this baked file (docs: CLAUDE.md, shader dates).
const RESTORABLE_SIDE_EFFECTS = ['shader-dates.json']

const [cmd, ...rest] = process.argv.slice(2)
const args = {}
const positional = []
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const key = rest[i].slice(2)
    const next = rest[i + 1]
    if (next === undefined || next.startsWith('--')) args[key] = true
    else { args[key] = next; i++ }
  } else positional.push(rest[i])
}

const git = (...a) => execFileSync('git', ['-C', REPO, ...a], { encoding: 'utf8' }).trim()
const dirtyFiles = () => git('status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3))
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16)
const vite = join(REPO, 'node_modules/.bin/vite')

const listenerPid = (port) => {
  const out = spawnSync('ss', ['-ltnpH', `sport = :${port}`], { encoding: 'utf8' }).stdout || ''
  const m = out.match(/pid=(\d+)/)
  return m ? Number(m[1]) : null
}
const pgrpOf = (pid) => {
  try { return Number(readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[2]) } catch { return null }
}

const launch = async () => {
  const s = readState()
  if (s?.pid && alive(s.pid)) throw new Error(`already running: pid ${s.pid} on ${s.base}. Run pc-verify cleanup first.`)
  if (!existsSync(vite)) throw new Error('no node_modules: run `npm ci` in the repo first')
  const mode = args.mode || 'dev'
  const port = args.port ? Number(args.port) : await freePort()
  assertPortAllowed(port)
  const id = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z')}-${git('rev-parse', '--short', 'HEAD')}`
  writeState({ runId: id })
  const logFile = join(STATE_DIR, `${id}-server.log`)
  const out = openSync(logFile, 'a')
  if (mode === 'preview') {
    console.log('building (npm run build)...')
    const b = spawnSync('npm', ['run', 'build'], { cwd: REPO, stdio: ['ignore', out, out] })
    if (b.status !== 0) throw new Error(`build failed; see ${logFile}`)
  }
  const viteArgs = mode === 'preview'
    ? ['preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1']
    : ['--port', String(port), '--strictPort', '--host', '127.0.0.1']
  const dirtyAtLaunch = dirtyFiles()
  const child = spawn(vite, viteArgs, { cwd: REPO, detached: true, stdio: ['ignore', out, out] })
  child.unref()
  const base = `http://127.0.0.1:${port}`
  writeState({ runId: id, mode, port, pid: child.pid, pgid: child.pid, base, repo: REPO, sha: git('rev-parse', 'HEAD'), startedAt: new Date().toISOString(), log: logFile, dirtyAtLaunch })
  await until(async () => {
    if (!alive(child.pid)) throw new Error(`server exited; log:\n${readFileSync(logFile, 'utf8').slice(-2000)}`)
    try {
      const r = await fetch(`${base}/`)
      return r.ok && (await r.text()).includes('id="visualizer"')
    } catch { return false }
  }, { timeout: 90_000, interval: 500, what: `${base}/ to serve the visualizer canvas` })
  console.log(`ready: ${base} (mode ${mode}, pid ${child.pid}, run ${id})`)
  console.log(`proof: ${join(PROOF_ROOT, id)}`)
}

const doctor = async () => {
  const s = readState()
  const base = baseUrl(args.base)
  const checks = []
  const check = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), detail })
  const remote = Boolean(args.base) && args.base.replace(/\/+$/, '') !== s?.base
  if (!remote) {
    check('port allowed', !FORBIDDEN_PORTS.includes(s.port), `port ${s.port}`)
    check('server process alive', alive(s.pid), `pid ${s.pid}`)
    const lp = listenerPid(s.port)
    check('port owned by this run', lp && pgrpOf(lp) === s.pgid, `listener pid ${lp}, its process group ${lp && pgrpOf(lp)}, ours ${s.pgid}`)
    let cwd = null
    try { cwd = realpathSync(`/proc/${lp}/cwd`) } catch {}
    check('served from this checkout', cwd === realpathSync(REPO), `${cwd}`)
    const head = git('rev-parse', 'HEAD')
    const newDirty = dirtyFiles().filter((f) => !s.dirtyAtLaunch.includes(f))
    check('build = this checkout', head === s.sha, `HEAD ${head.slice(0, 9)}, launched at ${s.sha.slice(0, 9)}, ${s.mode === 'dev' ? 'dev serves the working tree' : 'preview serves dist/ built at launch'}${newDirty.length ? `; changed since launch: ${newDirty.join(', ')}` : ''}`)
  }
  const page = await fetch(`${base}/`).then(async (r) => ({ status: r.status, html: await r.text() })).catch((e) => ({ status: 0, html: '', err: e.message }))
  check('page serves the canvas', page.status === 200 && page.html.includes('id="visualizer"'), `GET / -> ${page.status}${page.err ? ` ${page.err}` : ''}`)
  if (remote || s.mode === 'preview') {
    const served = await fetch(`${base}/assets/main.js`).then(async (r) => (r.ok ? sha256(Buffer.from(await r.arrayBuffer())) : `HTTP ${r.status}`)).catch((e) => e.message)
    const localFile = join(REPO, 'dist/assets/main.js')
    const local = existsSync(localFile) ? sha256(readFileSync(localFile)) : null
    check('bundle fingerprint', typeof served === 'string' && !served.startsWith('HTTP'),
      `served /assets/main.js sha256 ${served}; local dist ${local ?? 'none (npm run build to compare)'}${local ? (local === served ? ' MATCH' : ' DIFFERS') : ''}`)
  }
  const browser = await startBrowser()
  try {
    const { page: p, log, close } = await newPage(browser)
    await p.goto(`${base}/?shader=plasma&noaudio=true&time=5`)
    const frames = await framesAdvance(p, 5).then(() => true, () => false)
    const gl = await p.evaluate(() => {
      const g = document.createElement('canvas').getContext('webgl2')
      if (!g) return null
      const ext = g.getExtension('WEBGL_debug_renderer_info')
      return ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)
    })
    check('WebGL2 available', gl, gl || 'getContext("webgl2") returned null')
    check('render loop running', frames, frames ? 'window.cranes.frameCount advanced' : `no frames; errors: ${log.pageErrors.join(' | ')}`)
    await close()
  } finally { await browser.close() }
  for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name}: ${c.detail}`)
  if (checks.some((c) => !c.ok)) process.exitCode = 1
}

// Default A/B for plasma: these drive its hue (spectralCentroid), saturation (bassZScore),
// brightness (energyZScore, trebleZScore) and phase (spectralRoughnessZScore). shaders/plasma.frag
const PLASMA_LOUD = { spectralCentroid: 0.5, bassZScore: 1, energyZScore: 1, trebleZScore: 1, spectralRoughnessZScore: 0.8 }

const render = async () => {
  const base = baseUrl(args.base)
  const shader = args.shader || 'plasma'
  const loud = args.features ? JSON.parse(args.features) : PLASMA_LOUD
  const extra = args.params ? `&${args.params}` : ''
  const dir = proofDir(`render-${shader.replace(/\//g, '_')}`)
  const summary = { feature: 'shader-render', shader, base, injected: loud, startedAt: new Date().toISOString(), checks: [] }
  const check = (name, ok, detail) => summary.checks.push({ name, ok: Boolean(ok), detail })

  // Stills: one page, iTime held, so the only thing that changes between the two frames is the
  // injected features.
  const stillsUrl = `${base}/?shader=${shader}&noaudio=true&time=5${extra}`
  const browser = await startBrowser()
  try {
    const { page, log, close } = await newPage(browser)
    await page.goto(stillsUrl)
    await framesAdvance(page, 5)
    const rest = await canvasShot(page, join(dir, 'rest.png'))
    await page.evaluate((f) => Object.assign(window.cranes.manualFeatures, f), loud)
    await framesAdvance(page, 5)
    const inj = await canvasShot(page, join(dir, 'injected.png'))
    const diff = await pngDiff(page, join(dir, 'rest.png'), join(dir, 'injected.png'))
    const err = await shaderError(page)
    const shaderLen = await page.evaluate(() => (window.cranes?.shader || '').length)
    await close()
    Object.assign(summary, { stillsUrl, rest, injectedFrame: inj, meanAbsDiff: diff, shaderError: err, shaderLength: shaderLen })
    check('rest frame is lit', rest.litFraction > 0.2 && rest.colours > 50, rest)
    check('injected frame is lit', inj.litFraction > 0.2 && inj.colours > 50, inj)
    check('injection changed the picture', diff !== null && diff > 8, `mean |rest - injected| = ${diff} (of 255; > 8 passes)`)
    check('shader compiled', !err && shaderLen > 0, err || `${shaderLen} chars of GLSL`)
    check('no uncaught page errors', log.pageErrors.length === 0, log.pageErrors)
    writeLog(dir, 'console-stills.txt', [...log.console, ...log.pageErrors.map((e) => `[pageerror] ${e}`), ...log.badResponses.map((r) => `[http] ${r}`)])
  } finally { await browser.close() }

  // Video: headful, live clock, the injected features swept rest -> loud -> rest twice over 8 s.
  if (args.video) {
    const videoUrl = `${base}/?shader=${shader}&noaudio=true${extra}`
    const vb = await startBrowser({ headful: true })
    try {
      const { page, log, close } = await newPage(vb, { viewport: DESKTOP, videoDir: dir, name: 'render-sweep' })
      await page.goto(videoUrl)
      await framesAdvance(page, 5)
      const timeline = await page.evaluate(async (target) => {
        const out = []
        const t0 = performance.now()
        while (performance.now() - t0 < 8000) {
          const t = (performance.now() - t0) / 1000
          const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 4)
          const f = Object.fromEntries(Object.entries(target).map(([key, v]) => [key, +(v * k).toFixed(3)]))
          Object.assign(window.cranes.manualFeatures, f)
          out.push({ t: +t.toFixed(2), k: +k.toFixed(3), frame: window.cranes.frameCount })
          await new Promise((r) => setTimeout(r, 100))
        }
        return out
      }, loud)
      const video = await close()
      writeJson(dir, 'sweep-timeline.json', timeline)
      writeLog(dir, 'console-video.txt', [...log.console, ...log.pageErrors.map((e) => `[pageerror] ${e}`)])
      const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' })
      const duration = parseFloat(probe.stdout) || null
      const frames = timeline.at(-1).frame - timeline[0].frame
      spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', video, '-vf', 'fps=0.75,scale=320:-1,tile=3x2', '-frames:v', '1', join(dir, 'sweep-strip.png')])
      Object.assign(summary, { videoUrl, video, videoSeconds: duration, framesDuringSweep: frames, headful: true })
      check('headful video recorded', video && statSync(video).size > 50_000 && duration >= 6, `${video} (${duration ?? '?'} s, ${video ? statSync(video).size : 0} bytes)`)
      check('render loop ran during sweep', frames > 60, `${frames} frames in 8 s`)
    } finally { await vb.close() }
  }

  summary.pass = summary.checks.every((c) => c.ok)
  writeJson(dir, 'summary.json', summary)
  for (const c of summary.checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name}`)
  console.log(`${summary.pass ? 'PASS' : 'FAIL'}  evidence: ${dir}`)
  if (!summary.pass) process.exitCode = 1
}

const open = async () => {
  const target = positional[0]
  if (!target) throw new Error('usage: pc-verify open <path|url> [...]')
  const url = /^https?:/.test(target) ? target : `${baseUrl(args.base)}/${target.replace(/^\//, '')}`
  const [w, h] = (args.viewport || '1280x800').split('x').map(Number)
  const name = args.name || 'page'
  const dir = proofDir(args.feature || 'open')
  const browser = await startBrowser({ headful: Boolean(args.headful || args.video), browser: args.browser || 'chromium' })
  try {
    const { page, log, close } = await newPage(browser, { viewport: { width: w, height: h }, videoDir: args.video ? dir : null, name })
    await page.goto(url)
    let stats = null
    if (args.canvas) { await framesAdvance(page, 5); stats = await canvasShot(page, join(dir, `${name}-canvas.png`)) }
    else await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    if (args.wait) await page.waitForTimeout(Number(args.wait))
    // eslint-disable-next-line no-eval
    const evalResult = args.eval ? await page.evaluate((src) => (0, eval)(src), args.eval) : undefined
    await page.screenshot({ path: join(dir, `${name}.png`) })
    const finalUrl = page.url()
    const video = await close()
    const result = { url, finalUrl, viewport: { width: w, height: h }, canvas: stats, eval: evalResult, video, pageErrors: log.pageErrors, badResponses: log.badResponses }
    writeJson(dir, `${name}.json`, result)
    writeLog(dir, `${name}-console.txt`, log.console)
    console.log(JSON.stringify(result, null, 2))
    console.log(`evidence: ${dir}`)
  } finally { await browser.close() }
}

const cleanup = async () => {
  const s = readState()
  if (!s) { console.log('nothing to clean: no run state'); return }
  if (s.pid) {
    // Kill only the process group launch started. Never by name or pattern.
    if (alive(s.pid)) {
      try { process.kill(-s.pgid, 'SIGTERM') } catch {}
      await until(() => !alive(s.pid), { timeout: 8000, what: 'server to stop' }).catch(() => { try { process.kill(-s.pgid, 'SIGKILL') } catch {} })
    }
    console.log(`stopped pid ${s.pid} (group ${s.pgid}); port ${s.port} ${listenerPid(s.port) ? 'STILL BUSY' : 'free'}`)
    const changed = dirtyFiles().filter((f) => !s.dirtyAtLaunch.includes(f))
    for (const f of changed.filter((f) => RESTORABLE_SIDE_EFFECTS.includes(f))) {
      git('checkout', '--', f)
      console.log(`restored ${f} (rewritten by the dev server/build at launch)`)
    }
    const left = changed.filter((f) => !RESTORABLE_SIDE_EFFECTS.includes(f) && !f.startsWith('shaders/claude/wip/verify-scratch'))
    if (left.length) console.log(`left alone (changed during the run, not ours to revert): ${left.join(', ')}`)
  }
  if (existsSync(SCRATCH_SHADER_DIR)) { rmSync(SCRATCH_SHADER_DIR, { recursive: true, force: true }); console.log(`removed ${SCRATCH_SHADER_DIR}`) }
  if (existsSync(SCRATCH_AUDIO_DIR)) {
    for (const f of readdirSync(SCRATCH_AUDIO_DIR).filter((f) => f.startsWith('verify-'))) {
      rmSync(join(SCRATCH_AUDIO_DIR, f), { force: true })
      console.log(`removed public/test-audio/${f}`)
    }
  }
  const proof = join(PROOF_ROOT, s.runId)
  if (s.log && existsSync(s.log)) {
    if (existsSync(proof)) copyFileSync(s.log, join(proof, 'server.log'))
    rmSync(s.log, { force: true })
  }
  rmSync(STATE_FILE, { force: true })
  if (existsSync(proof)) {
    const files = readdirSync(proof, { recursive: true })
    console.log(`proof kept: ${proof} (${files.length} entries)`)
  } else console.log(`no proof folder for run ${s.runId}`)
}

const commands = {
  port: async () => { const p = await freePort(); assertPortAllowed(p); console.log(p) },
  launch, doctor, render, open, cleanup,
}

if (!commands[cmd]) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
  process.exit(cmd ? 2 : 0)
}
await commands[cmd]().catch((e) => { console.error(`pc-verify ${cmd}: ${e.message}`); process.exitCode = 1 })
