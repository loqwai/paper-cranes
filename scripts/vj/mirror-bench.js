#!/usr/bin/env node
// Measure three ways to show the wall inside a board-like page (docs/board-mirror.md, "Measured"):
//   none    the board page alone (baseline)
//   mirror  (a) an iframe of mirror.html, drawing the wall's shader from the wall's uniforms
//   webrtc  (b) a <video> fed by canvas.captureStream() from the wall over a peer connection
//   snap    (c) an <img> swapped for a JPEG of the wall once a second
// The "board" is a stand-in page: a big grid panned every frame (a person dragging the board) with
// a button beside the picture, tapped 20 times. It reports the board's frame times while panning,
// the tap's input delay, CPU seconds per second for each browser, bytes per second, the picture's
// frame rate, and how far behind the wall it runs.
//
//   node scripts/vj/mirror-bench.js [--profile phone|desktop] [--only mirror,webrtc] [--seconds 10]
//
// phone: Pixel 7 emulation, CPU throttled 4x, and site isolation off, as on Android, where a
// cross-site iframe shares the page's renderer process. GPU is whatever this machine's headless
// Chromium has (SwiftShader or llvmpipe in WSL: software, so slower than a phone's GPU).
// Ports 7171 (relay) and 7172 (Vite): never one the live show uses.
import { chromium, devices } from 'playwright'
import { createServer } from 'vite'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
const PROFILE = arg('profile', 'phone')
const ONLY = arg('only', 'none,mirror,webrtc,snap').split(',')
const SECONDS = Number(arg('seconds', 10))
const SHADER = arg('shader', 'clit-set/2')
const RELAY_PORT = 7171, VITE_PORT = 7172
const RELAY = `127.0.0.1:${RELAY_PORT}`
const ROOM = `bench-${Math.random().toString(36).slice(2)}`
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-features=WebRtcHideLocalIpsWithMdns', '--autoplay-policy=no-user-gesture-required']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const until = async (fn, ms = 20_000) => {
  for (const end = Date.now() + ms; ; await sleep(100)) {
    const v = await fn().catch(() => null)
    if (v) return v
    if (Date.now() > end) throw new Error('timed out')
  }
}

// CPU seconds used so far by the browser launched with this user-data dir and every process under
// it (renderers and the GPU process name no user-data dir, so they are found by parent pid).
const TICK = 100
const cpuOf = (dir) => {
  const procs = new Map()
  for (const pid of readdirSync('/proc').filter((p) => /^\d+$/.test(p))) {
    try {
      const f = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')
      procs.set(pid, { ppid: f[1], ticks: Number(f[11]) + Number(f[12]), root: readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes(`--user-data-dir=${dir}`) })
    } catch { /* gone */ }
  }
  const inTree = (pid, seen = 0) => {
    const p = procs.get(pid)
    if (!p || seen > 20) return false
    return p.root || inTree(p.ppid, seen + 1)
  }
  let ticks = 0
  for (const [pid, p] of procs) if (inTree(pid)) ticks += p.ticks
  return ticks / TICK
}
const launch = async (args, contextOptions = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'mirror-bench-'))
  const context = await chromium.launchPersistentContext(dir, { args: [...GL, ...args], ...contextOptions })
  return { context, cpu: () => cpuOf(dir) }
}

// Every hypnosound feature with its statistics, moving, as the wall's mic would give them.
const FAKE_AUDIO = () => {
  const names = ['spectralCentroid', 'spectralFlux', 'spectralSpread', 'spectralRolloff', 'spectralRoughness', 'spectralKurtosis', 'spectralEntropy', 'spectralCrest', 'spectralSkew', 'pitchClass', 'bass', 'mids', 'treble', 'energy']
  const stats = ['', 'Normalized', 'Mean', 'Median', 'Min', 'Max', 'StandardDeviation', 'ZScore', 'Slope', 'Intercept', 'RSquared']
  window.cranes.audio = {
    getFeatures: () => {
      const t = performance.now() / 1000
      const out = { beat: Math.sin(t * 8) > 0.9 }
      names.forEach((n, i) => stats.forEach((s, j) => { out[n + s] = 0.5 + 0.5 * Math.sin(t * (1 + i * 0.37) + j) }))
      return out
    },
  }
}

const BOARD = (kind, src) => `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:#111}
#board{position:absolute;width:3000px;height:3000px;background:repeating-linear-gradient(0deg,#222 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,#222 0 1px,transparent 1px 40px);will-change:transform}
#slot{position:absolute;left:1260px;top:1365px;width:480px;height:270px;background:#000;border:2px solid #c084fc}
#slot>*{width:100%;height:100%;border:0;display:block}
#btn{position:absolute;left:1260px;top:1660px;width:120px;height:60px;background:#2f9e44;color:#fff;font:20px sans-serif;border:0}</style>
<div id=board><div id=slot>${kind === 'mirror' ? `<iframe src="${src}" allow="" referrerpolicy="no-referrer"></iframe>` : kind === 'webrtc' ? '<video id=v muted autoplay playsinline></video>' : kind === 'snap' ? '<img id=img>' : ''}</div><button id=btn>KEEP</button></div>
<script>
window.bench = { frames: [], taps: [], panning: false }
let last = performance.now(), t0 = last
const pan = (now) => {
  requestAnimationFrame(pan)
  if (bench.panning) bench.frames.push(now - last)
  last = now
  const t = (now - t0) / 1000
  // Keep the picture and the button on screen while the board drifts, as a thumb drag would.
  document.getElementById('board').style.transform = 'translate(' + (-1260 + innerWidth / 2 - 240 + Math.sin(t) * 60) + 'px,' + (-1365 + 80 + Math.cos(t * 0.7) * 40) + 'px)'
}
requestAnimationFrame(pan)
document.getElementById('btn').addEventListener('pointerdown', (e) => {
  const handled = performance.now()
  requestAnimationFrame(() => bench.taps.push({ delay: handled - e.timeStamp, toFrame: performance.now() - e.timeStamp }))
})
</script>`

const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null }
const r1 = (x) => (x === null || x === undefined ? null : Math.round(x * 10) / 10)

const main = async () => {
  const vite = await createServer({ configFile: resolve(ROOT, 'vite.config.js'), server: { port: VITE_PORT, host: '127.0.0.1', strictPort: true }, logLevel: 'silent' })
  await vite.listen()
  const relay = spawn('npx', ['wrangler', 'dev', '--config', 'workers/remote-relay/wrangler.jsonc', '--ip', '127.0.0.1', '--port', String(RELAY_PORT),
    '--local-upstream', RELAY, '--show-interactive-dev-session=false', '--persist-to', resolve(ROOT, '.wrangler/bench-state')],
  { cwd: ROOT, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' }, detached: true })
  const results = []
  try {
    await until(() => fetch(`http://${RELAY}/`).then((r) => r.ok), 60_000)
    const view = (await (await fetch(`http://${RELAY}/view-key/${ROOM}`)).json()).view

    // The wall: its own browser, so its CPU is counted apart from the board's.
    const wall = await launch([], { viewport: { width: 960, height: 540 } })
    const wallPage = wall.context.pages()[0] ?? await wall.context.newPage()
    await wallPage.goto(`http://127.0.0.1:${VITE_PORT}/?shader=${SHADER}&remote=display&room=${ROOM}&relay=${RELAY}&noaudio=true&fullscreen=true`)
    await until(() => wallPage.evaluate(() => window.cranes?.frameCount > 30))
    await wallPage.evaluate(FAKE_AUDIO)

    const phone = PROFILE === 'phone'
    for (const kind of ONLY) {
      const board = await launch(phone ? ['--disable-site-isolation-trials'] : [], phone ? { ...devices['Pixel 7'] } : { viewport: { width: 1280, height: 800 } })
      const page = board.context.pages()[0] ?? await board.context.newPage()
      if (phone) await (await board.context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await page.setContent(BOARD(kind, `http://127.0.0.1:${VITE_PORT}/mirror.html?view=${view}&relay=${RELAY}`))
      let snapTimer = null, snapBytes = 0, snapCount = 0
      if (kind === 'mirror') {
        await until(async () => page.frames().find((f) => f.url().includes('mirror.html'))?.evaluate(() => window.mirror?.drawn > 10))
      }
      if (kind === 'webrtc') {
        const offer = await wallPage.evaluate(async () => {
          const pc = new RTCPeerConnection()
          window.benchPc = pc
          pc.addTrack(document.getElementById('visualizer').captureStream(30).getVideoTracks()[0])
          await pc.setLocalDescription(await pc.createOffer())
          await new Promise((r) => (pc.iceGatheringState === 'complete' ? r() : pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r())))
          return pc.localDescription.toJSON()
        })
        const answer = await page.evaluate(async (offer) => {
          const pc = new RTCPeerConnection()
          window.benchPc = pc
          pc.ontrack = (e) => { document.getElementById('v').srcObject = new MediaStream([e.track]) }
          await pc.setRemoteDescription(offer)
          await pc.setLocalDescription(await pc.createAnswer())
          await new Promise((r) => (pc.iceGatheringState === 'complete' ? r() : pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r())))
          return pc.localDescription.toJSON()
        }, offer)
        await wallPage.evaluate((a) => window.benchPc.setRemoteDescription(a), answer)
        await until(() => page.evaluate(() => document.getElementById('v').readyState >= 2))
      }
      if (kind === 'snap') {
        const grab = async () => {
          const jpeg = await wallPage.evaluate(() => {
            const c = document.getElementById('visualizer'), s = document.createElement('canvas')
            s.width = 480; s.height = 270
            s.getContext('2d').drawImage(c, 0, 0, 480, 270)
            return s.toDataURL('image/jpeg', 0.6)
          })
          snapBytes += Math.round((jpeg.length - 23) * 3 / 4)
          snapCount++
          await page.evaluate((src) => { document.getElementById('img').src = src }, jpeg)
        }
        await grab()
        snapTimer = setInterval(() => grab().catch(() => {}), 1000)
      }
      await sleep(3000)
      const mirrorFrame = page.frames().find((f) => f.url().includes('mirror.html'))
      const before = {
        board: board.cpu(), wall: wall.cpu(),
        mirror: await mirrorFrame?.evaluate(() => ({ drawn: window.mirror.drawn, bytes: window.mirror.bytes })),
        rtc: kind === 'webrtc' ? await page.evaluate(async () => { for (const s of (await window.benchPc.getStats()).values()) if (s.type === 'inbound-rtp') return { bytes: s.bytesReceived, frames: s.framesDecoded, jb: s.jitterBufferDelay, jbn: s.jitterBufferEmittedCount, dec: s.totalDecodeTime } }) : null,
        snapBytes, snapCount,
      }
      await page.evaluate(() => { window.bench.panning = true })
      const lags = []
      const end = Date.now() + SECONDS * 1000
      for (let i = 0; Date.now() < end; i++) {
        await page.locator('#btn').tap({ force: true }).catch(() => page.locator('#btn').click({ force: true }))
        if (mirrorFrame) lags.push(await mirrorFrame.evaluate(() => window.mirror.lagMs))
        await sleep(Math.max(0, SECONDS * 1000 / 20 - 30))
      }
      await page.evaluate(() => { window.bench.panning = false })
      const secs = SECONDS
      const after = {
        board: board.cpu(), wall: wall.cpu(),
        mirror: await mirrorFrame?.evaluate(() => ({ drawn: window.mirror.drawn, bytes: window.mirror.bytes })),
        rtc: kind === 'webrtc' ? await page.evaluate(async () => { for (const s of (await window.benchPc.getStats()).values()) if (s.type === 'inbound-rtp') return { bytes: s.bytesReceived, frames: s.framesDecoded, jb: s.jitterBufferDelay, jbn: s.jitterBufferEmittedCount, dec: s.totalDecodeTime } }) : null,
        rtcOut: kind === 'webrtc' ? await wallPage.evaluate(async () => { for (const s of (await window.benchPc.getStats()).values()) if (s.type === 'outbound-rtp') return { enc: s.totalEncodeTime, frames: s.framesEncoded, w: s.frameWidth, h: s.frameHeight } }) : null,
        snapBytes, snapCount,
      }
      clearInterval(snapTimer)
      const { frames, taps } = await page.evaluate(() => window.bench)
      const row = {
        kind, profile: PROFILE,
        boardFps: r1(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)),
        boardP95ms: r1(pct(frames, 0.95)),
        jankPct: r1(100 * frames.filter((f) => f > 34).length / frames.length),
        tapDelayP50ms: r1(pct(taps.map((t) => t.delay), 0.5)),
        tapToFrameP95ms: r1(pct(taps.map((t) => t.toFrame), 0.95)),
        boardCpu: r1((after.board - before.board) / secs * 100) + '%',
        wallCpu: r1((after.wall - before.wall) / secs * 100) + '%',
      }
      if (kind === 'mirror') Object.assign(row, {
        pictureFps: r1((after.mirror.drawn - before.mirror.drawn) / secs),
        kBps: r1((after.mirror.bytes - before.mirror.bytes) / secs / 1024),
        lagP50ms: r1(pct(lags.filter((x) => x !== null), 0.5)),
      })
      if (kind === 'webrtc') Object.assign(row, {
        pictureFps: r1((after.rtc.frames - before.rtc.frames) / secs),
        kBps: r1((after.rtc.bytes - before.rtc.bytes) / secs / 1024),
        lagP50ms: r1(1000 * ((after.rtc.jb - before.rtc.jb) / Math.max(1, after.rtc.jbn - before.rtc.jbn) + (after.rtc.dec - before.rtc.dec) / Math.max(1, after.rtc.frames - before.rtc.frames)) + 1000 * after.rtcOut.enc / Math.max(1, after.rtcOut.frames)),
        sent: `${after.rtcOut.w}x${after.rtcOut.h}`,
      })
      if (kind === 'snap') Object.assign(row, {
        pictureFps: r1((after.snapCount - before.snapCount) / secs),
        kBps: r1((after.snapBytes - before.snapBytes) / secs / 1024),
        lagP50ms: 500,
      })
      results.push(row)
      console.error(JSON.stringify(row))
      if (kind === 'webrtc') await wallPage.evaluate(() => window.benchPc.close())
      await board.context.close()
    }
    await wall.context.close()
  } finally {
    await vite.close()
    try { process.kill(-relay.pid, 'SIGTERM') } catch { /* gone */ }
  }
  console.log(JSON.stringify(results, null, 1))
}

main().catch((e) => { console.error(e); process.exit(1) })
