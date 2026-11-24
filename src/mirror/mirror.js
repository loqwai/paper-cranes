// mirror.html: the wall's picture, for a draw board or any page that wants to watch the show
// (docs/board-mirror.md). It joins the relay as a viewer (/view/<view id>), so it cannot steer the
// wall, is never a display, and never needs the room name or the display secret. The wall sends
// the uniforms it drew its last frame with (src/remote/mirrorFeed.js); this page draws the same
// shader from them at `scale` of its size, at most `fps` times a second, and draws nothing while
// it is hidden or scrolled out of view.
import { makeVisualizer } from '../Visualizer.js'
import { mirrorSettings } from './link.js'

const settings = mirrorSettings(window.location.search)
const note = document.getElementById('mirror-note')
const say = (text, { fade = false } = {}) => {
  note.textContent = text
  note.style.opacity = fade ? '0' : '1'
}

// What the page has heard, and what a test or a person can read from the console.
const stats = { frames: 0, drawn: 0, bytes: 0, states: 0, lagMs: null, startedAt: performance.now() }
window.mirror = stats

// Shared code (the Visualizer's error report) writes to window.cranes.
window.cranes = { seeds: [0, 0, 0, 0], shader: null, error: null }

let latest = null // { t, f, at }
let code = null

const handle = (raw) => {
  stats.bytes += raw.length
  let msg
  try { msg = JSON.parse(raw) } catch { return }
  if (msg?.type === 'mirror-state' && typeof msg.data?.code === 'string') {
    stats.states++
    code = msg.data.code
    return
  }
  if (msg?.type === 'mirror-frame' && msg.data && typeof msg.data.f === 'object') {
    stats.frames++
    if (typeof msg.data.sent === 'number') stats.lagMs = Date.now() - msg.data.sent
    latest = { t: Number(msg.data.t) || 0, f: msg.data.f, at: performance.now() }
    stats.uniforms = msg.data.f
  }
}

// A plain socket that only listens; the relay drops anything a viewer sends anyway.
const listen = (url, delay = 1000) => {
  const socket = new WebSocket(url)
  socket.onopen = () => { delay = 1000; say('waiting for the wall') }
  socket.onmessage = (e) => typeof e.data === 'string' && handle(e.data)
  socket.onclose = () => {
    say('reconnecting')
    setTimeout(() => listen(url, Math.min(delay * 2, 30000)), delay)
  }
  window.mirror.socket = socket
}

// Seen: the page is visible and its canvas is on screen. Inside an iframe the observer's implicit
// root is the top-level viewport, so a board that pans the iframe out of view stops the drawing too.
let onScreen = true
const seen = () => onScreen && document.visibilityState === 'visible'

const main = async () => {
  if (!settings) return say('no view: open this page with ?view=<view id>')
  const canvas = document.getElementById('visualizer')
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting }).observe(canvas)
  listen(settings.socketUrl)
  const render = await makeVisualizer({ canvas, initialImageUrl: 'images/placeholder-image.png', wakeLock: false, maxRatio: settings.scale })
  const gap = 1000 / settings.fps
  let last = 0
  const frame = (now) => {
    requestAnimationFrame(frame)
    if (!code || !latest || !seen() || now - last < gap - 2) return
    last = now
    const age = now - latest.at
    if (age > 3000) return say('the wall went quiet')
    if (stats.drawn === 0 || note.style.opacity !== '0') say('live', { fade: true })
    // The wall's clock, carried forward since its last frame (at most a second, if frames stall).
    const time = latest.t + Math.min(age, 1000) / 1000
    try {
      // A `time` the wall's own features carry (a ?time= freeze) wins there, so it wins here too.
      render({ time, features: { time, iTime: time, ...latest.f }, fragmentShader: code })
      stats.drawn++
    } catch (e) {
      console.error('[mirror] render failed', e)
    }
  }
  requestAnimationFrame(frame)
}

main()
