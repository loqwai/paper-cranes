// Page side of the VJ MCP server (docs/vj-mcp.md). A `?remote=display` page announces itself to
// its broker with `display-hello` and answers `inspect` requests on the same socket. The broker is
// the dev server's /ws, or on `?room=` the relay Worker's room Durable Object.
//
// Trust: `inspect` frames reach the page only from the broker. Both brokers drop any `inspect`,
// `display-welcome` or `display-rekey` a client sends and never broadcast `inspect-reply`, so
// another client can neither ask a display for anything nor read its answers. And the page answers
// nothing until the broker has answered its hello with `display-welcome`: a relay that predates the
// broker never welcomes, so there the inspector stays silent. (That old relay does pass the hello to
// peers, so a peer already in the room could forge a welcome; deploy the relay first. docs/vj-mcp.md)
//
// Read-only plus `validate` (a scratch compile): knob and shader changes go through the existing
// `update-params` path, not through here. Handlers are adapted from PR #182/#187's inspect.js.
import { hashSource } from './hash.js'
import { withoutSecret } from './relay.js'
import { shaderOnScreen as currentShader } from '../shaderLoader.js'

const S = (window.__cranesInspect ??= { logRing: [], consoleWrapped: false })

// One id per tab that survives a reload, so an agent holding `display: "a1b2c3"` keeps working
// after the page reloads (the per-load ids in #187 broke this).
// A duplicated tab (Chrome's Duplicate tab, window.open) inherits a copy of sessionStorage and so
// this key; the hub answers its hello with `display-rekey`, and `fresh` mints a key of its own.
const KEY = 'cranes-display-key'
const loadKey = (fresh = false) => {
  try {
    const k = (!fresh && sessionStorage.getItem(KEY)) || crypto.randomUUID()
    sessionStorage.setItem(KEY, k)
    return k
  } catch {
    if (fresh || !S.key) S.key = crypto.randomUUID()
    return S.key
  }
}
let displayKey = loadKey()

const LOG_MAX = 100
const safeJson = (v) => { try { return JSON.stringify(v) } catch { return String(v) } }
const pushLog = (level, parts) => {
  const msg = parts.map((p) => (p instanceof Error ? `${p.message}` : typeof p === 'string' ? p : safeJson(p))).join(' ').slice(0, 500)
  S.logRing.push({ t: Date.now(), level, msg })
  if (S.logRing.length > LOG_MAX) S.logRing.splice(0, S.logRing.length - LOG_MAX)
}
const installLogCapture = () => {
  if (S.consoleWrapped) return
  S.consoleWrapped = true
  for (const level of ['error', 'warn']) {
    const orig = console[level].bind(console)
    console[level] = (...args) => { pushLog(level, args); orig(...args) }
  }
  window.addEventListener('error', (e) => pushLog('uncaught', [e.message, `${e.filename}:${e.lineno}`]))
  window.addEventListener('unhandledrejection', (e) => pushLog('unhandledrejection', [String(e.reason)]))
}

const round = (v) => (typeof v === 'number' ? +v.toFixed(4) : v)
const numeric = (obj, test = () => true) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([k, v]) => (typeof v === 'number' || typeof v === 'boolean') && test(k)).map(([k, v]) => [k, round(v)]))

const CORE = /^(bass|mids|treble|energy|pitchClass|spectral[A-Za-z]+?)(Normalized|ZScore)?$/
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// A hidden tab gets no rAF, so never wait on a frame alone.
const nextFrameOr = (ms) => Promise.race([new Promise((r) => requestAnimationFrame(() => r())), sleep(ms)])
const canvasEl = () => document.getElementById('visualizer') ?? document.querySelector('canvas')
const code = () => window.cranes?.shader ?? ''

const audioState = () => {
  const ctx = window.cranes?.audioContext
  const energy = window.cranes?.measuredAudioFeatures?.energy
  // input: the mic or line-in track's label (index.js getAudioStream); null for a file, a tab or no audio.
  return { state: ctx?.state ?? 'none', energy: typeof energy === 'number' ? round(energy) : null, input: window.cranes?.audioInputLabel ?? null }
}

let fps = null
const measureFps = async () => {
  const f0 = window.cranes.frameCount, t0 = performance.now()
  await sleep(300)
  fps = +(((window.cranes.frameCount - f0) * 1000) / (performance.now() - t0)).toFixed(1)
  return fps
}

let validator = null
const validate = async (src) => {
  if (!validator) {
    const { shaderWrapper } = await import('../shader-transformers/shader-wrapper.js')
    const c = document.createElement('canvas'); c.width = 4; c.height = 4
    const gl = c.getContext('webgl2')
    if (!gl) throw new Error('no webgl2 for validation')
    validator = (s) => {
      const sh = gl.createShader(gl.FRAGMENT_SHADER)
      gl.shaderSource(sh, shaderWrapper(s)); gl.compileShader(sh)
      const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS)
      const info = ok ? null : gl.getShaderInfoLog(sh)
      gl.deleteShader(sh)
      return { ok: Boolean(ok), info }
    }
  }
  return validator(src)
}

export const hello = () => {
  const c = canvasEl()
  return {
    key: displayKey,
    href: withoutSecret(location.href).slice(0, 600),
    path: location.pathname,
    shader: currentShader(),
    ua: navigator.userAgent,
    canvas: c ? { w: c.width, h: c.height } : null,
    audio: audioState(),
  }
}

const commands = {
  // Everything an agent needs to decide its next move, in one round trip.
  // source: true adds the GLSL on screen (a script's need, e.g. setlists/sun-set/swap.mjs re-anchoring
  // against the live code; it is KBs, so a model should not ask for it).
  state: async ({ features = 'core', meterSecs = 10, source = false } = {}) => {
    const flat = window.cranes.flattenFeatures()
    const out = {
      href: withoutSecret(location.href).slice(0, 600),
      shader: currentShader(),
      shaderHash: hashSource(code()),
      shaderError: window.cranes.error ?? null,
      controllers: new URLSearchParams(location.search).getAll('controller'),
      frameCount: window.cranes.frameCount,
      fps: await measureFps(),
      visibility: document.visibilityState,
      audio: audioState(),
      knobs: numeric(flat, (k) => /^knob_\d+$/.test(k)),
      pinned: numeric(window.cranes.messageParams),
      manual: numeric(window.cranes.manualFeatures),
      controller: numeric(window.cranes.controllerFeatures),
      recentErrors: S.logRing.slice(-5),
      // The live show (src/vj/live.js): HANDS lock, held agent writes, open proposals, pads.
      live: window.cranes.live?.status?.() ?? null,
    }
    if (source) out.source = code()
    if (features !== 'none') {
      out.features = numeric(window.cranes.measuredAudioFeatures, features === 'all' ? () => true : (k) => CORE.test(k) || k === 'beat')
      if (features === 'all') out.wavelet = numeric(window.cranes.waveletFeatures)
    }
    const M = window.__vjMeter
    if (M) {
      try { out.meter = M.summary?.(meterSecs) ?? null } catch (e) { out.meter = String(e) }
    }
    if (window.__vjJank?.summary) out.jank = window.__vjJank.summary()
    return out
  },

  // Long side capped at 960 px: the JPEG encode runs on the render thread, and a 1920 px one can
  // drop a frame mid-show. Capping only the width let a portrait phone send 960x2080.
  shot: async ({ width = 480, quality = 0.7 } = {}) => {
    const src = canvasEl()
    if (!src) throw new Error('no canvas on the page')
    await nextFrameOr(100)
    const maxW = Math.min(960, (960 * src.width) / src.height)
    const w = Math.max(16, Math.round(Math.min(width, maxW, src.width)))
    const h = Math.round((src.height / src.width) * w)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    c.getContext('2d').drawImage(src, 0, 0, w, h)
    return { w, h, srcW: src.width, srcH: src.height, dataUrl: c.toDataURL('image/jpeg', quality) }
  },

  logs: async ({ n = 50 } = {}) => S.logRing.slice(-n),

  // The hub's liveness probe when a second tab says hello with this tab's key.
  ping: async () => ({ ok: true }),

  // Compile GLSL in a scratch context with the same wrapper the Visualizer uses. Nothing on
  // screen changes. `src` omitted = the shader currently on screen.
  validate: async ({ src } = {}) => validate(typeof src === 'string' ? src : code()),
}

// send(type, data) is the RemoteDisplay socket's send. secret() is the room's display secret for
// the socket open now (relay.js secretFor), or undefined: it goes in the hello and nowhere else.
export const createInspector = (send, { secret = () => undefined } = {}) => {
  installLogCapture()
  let welcomed = false
  const handle = async ({ id, cmd, args } = {}) => {
    if (!welcomed) return
    const fn = Object.hasOwn(commands, cmd) ? commands[cmd] : null
    if (!fn) return send('inspect-reply', { id, ok: false, error: `unknown cmd ${cmd}` })
    try {
      send('inspect-reply', { id, ok: true, result: await fn(args ?? {}) })
    } catch (e) {
      send('inspect-reply', { id, ok: false, error: String(e?.message ?? e) })
    }
  }
  const sayHello = () => {
    const displaySecret = secret()
    send('display-hello', displaySecret ? { ...hello(), displaySecret } : hello())
  }
  const rekey = () => {
    displayKey = loadKey(true)
    sayHello()
  }
  // A welcome names the id this tab's key maps to; one for another id is not for this tab.
  const welcome = ({ id } = {}) => { if (id === displayKey.replace(/-/g, '').slice(0, 6).toLowerCase()) welcomed = true }
  const unwelcome = () => { welcomed = false }
  // The relay refused this display: no display secret, a wrong one, or it was rotated. It stays a
  // room peer (knobs still arrive); only the VJ MCP no longer sees it.
  const refused = ({ reason } = {}) => {
    welcomed = false
    console.warn(`[Remote Display] the relay refused this display for the VJ MCP: ${reason ?? 'no reason given'}`)
  }
  return { handle, hello: sayHello, rekey, welcome, unwelcome, refused }
}
