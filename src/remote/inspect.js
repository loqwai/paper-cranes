// Remote inspect/change commands for a running paper-cranes page (see docs/remote-inspect.md).
//
// A CLI on the dev machine sends signed `inspect` requests over the dev server's /ws; the page
// verifies them against the token from the dev server's loopback-only endpoint and answers with
// `inspect-reply`. Loaded by src/remote/inspectClient.js, which self-accepts HMR, so edits to this
// file hot-swap into a running page without a reload.

import { verifyRequest } from './inspectAuth.js'
import { loadShader } from '../shaderLoader.js'

// State that must survive an HMR swap of this module lives on window.
const S = (window.__cranesInspect ??= { logRing: [], consoleWrapped: false })

const displayId = (() => {
  try {
    const id = sessionStorage.getItem('cranes-inspect-id') || Math.random().toString(16).slice(2, 8)
    sessionStorage.setItem('cranes-inspect-id', id)
    return id
  } catch {
    return (S.displayId ??= Math.random().toString(16).slice(2, 8))
  }
})()

// ---------------------------------------------------------------------------------------------
// Console capture: a ring of recent errors/warnings, so `logs` can show what the phone saw.
const LOG_MAX = 200
const logRing = S.logRing
const pushLog = (level, parts) => {
  const msg = parts
    .map((p) => (p instanceof Error ? `${p.message}\n${p.stack ?? ''}` : typeof p === 'string' ? p : safeJson(p)))
    .join(' ')
    .slice(0, 800)
  logRing.push({ t: Date.now(), level, msg })
  if (logRing.length > LOG_MAX) logRing.shift()
}
const safeJson = (v) => {
  try { return JSON.stringify(v) } catch { return String(v) }
}
const installLogCapture = () => {
  if (S.consoleWrapped) return
  S.consoleWrapped = true
  for (const level of ['error', 'warn']) {
    const orig = console[level].bind(console)
    console[level] = (...args) => { pushLog(level, args); orig(...args) }
  }
  window.addEventListener('error', (e) => pushLog('uncaught', [e.message, `${e.filename}:${e.lineno}`]))
  window.addEventListener('unhandledrejection', (e) => pushLog('unhandledrejection', [e.reason]))
}

// ---------------------------------------------------------------------------------------------
const round = (v) => (typeof v === 'number' ? +v.toFixed(4) : v)
const numericOnly = (obj) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => typeof v === 'number' || typeof v === 'boolean').map(([k, v]) => [k, round(v)]))

// Glob-ish key filter: "bass*", "cs_*", "energyZScore".
const matcher = (patterns) => {
  if (!patterns?.length) return null
  const res = patterns.map((p) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'))
  return (k) => res.some((r) => r.test(k))
}

// The default `features` view: the core features' value, normalized and zScore.
const CORE = /^(bass|mids|treble|energy|pitchClass|spectral[A-Za-z]+?)(Normalized|ZScore)?$/

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const currentShaderCode = () => window.cranes?.shader ?? window.shader

// Swap shader code and wait for the Visualizer's verdict. On a compile failure it keeps drawing
// the previous program and sets window.cranes.error, so a bad swap never blanks the screen.
const swapCode = async (code) => {
  if (code === currentShaderCode()) return { compiled: true, unchanged: true }
  window.cranes.error = undefined
  window.cranes.shader = code
  document.getElementById('visualizer')?.classList.toggle('fullscreen', code.includes('@fullscreen: true'))
  for (let waited = 0; waited < 5000; waited += 50) {
    await sleep(50)
    if (window.cranes.error === null) return { compiled: true }
    if (window.cranes.error) return { compiled: false, error: window.cranes.error }
  }
  return { compiled: null, error: 'no compile result within 5 s (tab hidden?)' }
}

const mirrorToUrl = (entries) => {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of entries) v === null ? url.searchParams.delete(k) : url.searchParams.set(k, v)
    window.history.replaceState({}, '', url.toString())
  } catch {}
}

// Knobs and params are written to manualFeatures: above URL params and controller outputs, below
// messageParams. A MIDI knob turn writes there too, so a remote `set` and the physical knob share
// one value instead of the remote one pinning it. null releases the key.
const setParams = (kv) => {
  const out = {}
  for (const [k, raw] of Object.entries(kv ?? {})) {
    if (k === 'remote_token' || k === 'shader' || k === 'controller') throw new Error(`cannot set ${k}`)
    if (raw === null) {
      delete window.cranes.manualFeatures[k]
      delete window.cranes.messageParams?.[k]
      out[k] = null
      continue
    }
    const num = typeof raw === 'number' ? raw : parseFloat(raw)
    const v = Number.isNaN(num) ? raw : num
    window.cranes.manualFeatures[k] = v
    delete window.cranes.messageParams?.[k]
    out[k] = v
  }
  mirrorToUrl(Object.entries(out))
  return out
}

let fpsCache = null
const measureFps = async () => {
  const f0 = window.cranes.frameCount, t0 = performance.now()
  await sleep(500)
  fpsCache = +(((window.cranes.frameCount - f0) * 1000) / (performance.now() - t0)).toFixed(1)
  return fpsCache
}

const redactedHref = (from = window.location.href) => {
  const url = new URL(from)
  if (url.searchParams.has('remote_token')) url.searchParams.set('remote_token', '…')
  return url.toString()
}

// index.js's controller loop reads window._hotController every frame once it is running.
// If the page booted without a controller there is no loop yet, so start an identical one.
const setController = (fn) => {
  window.cranes.controllerFeatures = {}
  window._hotController = fn
  if (!fn || window._hotControllerRunning) return
  window._hotControllerRunning = true
  const frame = () => {
    try {
      if (window._hotController) window.cranes.controllerFeatures = window._hotController(window.cranes.flattenFeatures()) ?? {}
    } catch (e) {
      console.error('Controller error:', e)
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const audioStatus = () => {
  const ctx = window.cranes.audioContext
  const energy = window.cranes.measuredAudioFeatures?.energy
  const state = ctx?.state ?? 'none'
  return {
    state,
    running: state === 'running' && typeof energy === 'number' && energy > 0,
    energy: typeof energy === 'number' ? round(energy) : null,
    input: window.cranes.audioInputLabel ?? null,
    gain: window.cranes.inputGain?.gain?.value ?? null,
    note: state === 'suspended' ? 'AudioContext suspended: needs a tap on the page (autoplay policy)' : undefined,
  }
}

// Params `navigate` can apply in place. Everything else (audio setup, wavelet, image, vj, ...) is
// read once at boot, so changing or removing it needs a real reload.
const IN_PLACE = (k) => k === 'shader' || k === 'controller' || k === 'time' || k === 'midi' || /^knob_\d+$/.test(k)
const BOOT_PARAMS = new URLSearchParams(window.location.search)

const planNavigate = (target) => {
  const cur = new URL(window.location.href)
  const next = new URL(target, cur)
  if (next.origin !== cur.origin) throw new Error('navigate stays on this host')
  if (next.pathname !== cur.pathname) return { reload: true, why: 'path changed', next }
  const keys = new Set([...cur.searchParams.keys(), ...next.searchParams.keys()])
  for (const k of keys) {
    const a = cur.searchParams.getAll(k).join('\u0000'), b = next.searchParams.getAll(k).join('\u0000')
    if (a === b) continue
    if (IN_PLACE(k)) continue
    // A numeric uniform param can be set in place, but not removed if the page booted with it.
    if (next.searchParams.has(k) && !Number.isNaN(parseFloat(next.searchParams.get(k)))) continue
    if (!next.searchParams.has(k) && !BOOT_PARAMS.has(k)) continue
    return { reload: true, why: `param ${k} is read at boot`, next }
  }
  return { reload: false, next, cur }
}

const commands = {
  ping: async () => ({ now: Date.now() }),

  status: async () => {
    const canvas = document.getElementById('visualizer') ?? document.querySelector('canvas')
    const url = new URL(window.location.href)
    return {
      href: redactedHref(),
      shader: url.searchParams.get('shader'),
      controllers: url.searchParams.getAll('controller'),
      frameCount: window.cranes.frameCount,
      fps: await measureFps(),
      canvas: canvas && { w: canvas.width, h: canvas.height, cssW: canvas.clientWidth, cssH: canvas.clientHeight },
      audio: audioStatus(),
      shaderError: window.cranes.error ?? null,
      manual: numericOnly(window.cranes.manualFeatures),
      vjMeter: Boolean(window.__vjMeter),
      midi: Boolean(window.cranes.midiMapper),
      visibility: document.visibilityState,
      ua: navigator.userAgent,
      logCount: logRing.length,
    }
  },

  // args: { keys?: string[] (globs over every uniform), all?: boolean, meter?: number (secs) }
  features: async ({ keys, all, meter } = {}) => {
    const flat = window.cranes.flattenFeatures()
    const match = matcher(keys)
    const pick = (obj, test) => numericOnly(Object.fromEntries(Object.entries(obj).filter(([k]) => test(k))))
    const out = { t: Date.now(), frame: window.cranes.frameCount, audioState: window.cranes.audioContext?.state ?? 'none' }
    if (match) out.values = pick(flat, match)
    else {
      out.audio = pick(window.cranes.measuredAudioFeatures ?? {}, all ? () => true : (k) => CORE.test(k) || k === 'beat')
      out.controller = numericOnly(window.cranes.controllerFeatures)
      out.knobs = pick(flat, (k) => /^knob_\d+$/.test(k))
      if (all) out.wavelet = numericOnly(window.cranes.waveletFeatures)
    }
    const M = window.__vjMeter
    if (M) {
      const secs = meter ?? 10
      try { out.meter = M.summary?.(secs) ?? null } catch (e) { out.meter = String(e) }
      try { out.residR = M.residR?.(Math.max(secs, 30)) ?? null } catch (e) { out.residR = String(e) }
    }
    return out
  },

  // args: { width?: px (default 480), quality?: 0..1 (default 0.7) }
  shot: async ({ width = 480, quality = 0.7 } = {}) => {
    const src = document.getElementById('visualizer') ?? document.querySelector('canvas')
    if (!src) throw new Error('no canvas')
    await nextFrame() // read right after a render; the Visualizer uses preserveDrawingBuffer anyway
    const w = Math.max(16, Math.min(width, src.width))
    const h = Math.round((src.height / src.width) * w)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    c.getContext('2d').drawImage(src, 0, 0, w, h)
    return { w, h, srcW: src.width, srcH: src.height, dataUrl: c.toDataURL('image/jpeg', quality) }
  },

  // args: { n?: number (default 50), since?: epoch ms }
  logs: async ({ n = 50, since = 0 } = {}) => logRing.filter((l) => l.t > since).slice(-n),

  // args: { params: { key: value | null } }
  set: async ({ params: kv } = {}) => setParams(kv),

  // args: { seconds: number | null } — freeze `time`/`iTime` at seconds, or null to release.
  time: async ({ seconds } = {}) => {
    const v = seconds === null || seconds === undefined ? null : Number(seconds)
    if (v !== null && !Number.isFinite(v)) throw new Error('seconds must be a number or null')
    for (const k of ['time', 'iTime']) v === null ? delete window.cranes.manualFeatures[k] : (window.cranes.manualFeatures[k] = v)
    mirrorToUrl([['time', v]])
    return { time: v }
  },

  // args: { path } — load shaders/<path>.frag from the dev server (same as ?shader=)
  shader: async ({ path } = {}) => {
    if (!path) throw new Error('path required')
    const before = currentShaderCode()
    const { code } = await loadShader(path, { updateUrl: true })
    window.cranes.shader = before // let swapCode see the change and wait for the compile verdict
    return { path, ...(await swapCode(code)) }
  },

  // args: { code } — hot-swap raw GLSL (the CLI reads a local .frag)
  code: async ({ code } = {}) => {
    if (typeof code !== 'string' || !code.trim()) throw new Error('code required')
    return swapCode(code)
  },

  // args: { names: string[] } — replace the controller chain (same names as ?controller=)
  controller: async ({ names = [] } = {}) => {
    const { loadControllers, composeControllers } = await import('../controllerChain.js')
    const fns = await loadControllers(window.cranes, names, { bust: true })
    if (names.length && !fns.length) throw new Error('no controller loaded (see logs)')
    setController(fns.length ? composeControllers(fns) : null)
    const url = new URL(window.location.href)
    url.searchParams.delete('controller')
    for (const n of names) url.searchParams.append('controller', n)
    window.history.replaceState({}, '', url.toString())
    return { controllers: names, loaded: fns.length }
  },

  // Full page reload. Replies first, then reloads; the page comes back and reconnects by itself.
  // A reload loses fullscreen and may leave audio suspended (see `status` afterwards).
  reload: async () => {
    setTimeout(() => location.reload(), 150)
    return { reloading: true }
  },

  // args: { url, reload?: boolean } — go to a URL on this host. When only shader / controller /
  // knobs / time / numeric params change it is applied IN PLACE (no reload; audio keeps running).
  navigate: async ({ url, reload = false } = {}) => {
    if (!url) throw new Error('url required')
    const plan = planNavigate(url)
    if (reload || plan.reload) {
      setTimeout(() => location.assign(plan.next.toString()), 150)
      return { reloading: true, why: reload ? 'forced' : plan.why, url: redactedHref(plan.next) }
    }
    const { cur, next } = plan
    const done = {}
    const nextShader = next.searchParams.get('shader')
    if (nextShader && nextShader !== cur.searchParams.get('shader')) done.shader = await commands.shader({ path: nextShader })
    const names = next.searchParams.getAll('controller')
    if (names.join() !== cur.searchParams.getAll('controller').join()) done.controller = await commands.controller({ names })
    if (next.searchParams.get('midi') === 'true' && !window.cranes.midiMapper) {
      await import('../midi.js')
      done.midi = 'loaded'
    }
    const kv = {}
    for (const [k, v] of next.searchParams) if (!['shader', 'controller', 'midi'].includes(k) && cur.searchParams.get(k) !== v) kv[k] = v
    for (const k of cur.searchParams.keys()) if (!next.searchParams.has(k) && !['shader', 'controller', 'midi'].includes(k)) kv[k] = null
    if (Object.keys(kv).length) done.set = setParams(kv)
    window.history.replaceState({}, '', next.toString())
    return { inPlace: true, ...done }
  },

  // args: { src } — evaluate JS in the page. Dev server only (this whole channel is), signed.
  // If src evaluates to a function it is called; promises are awaited.
  eval: async ({ src } = {}) => {
    let value = (0, eval)(`(${src})`)
    if (typeof value === 'function') value = value()
    value = await value
    if (value === undefined) return null
    try { return JSON.parse(JSON.stringify(value)) } catch { return String(value) }
  },
}

// ---------------------------------------------------------------------------------------------
// client: a connected WebSocketClient. token: the dev server's per-session token.
// Returns { handle(data), dispose() }.
export const createInspector = (client, token) => {
  const seenIds = (S.seenIds ??= new Set())
  installLogCapture()

  const reply = (id, body) => client.send('inspect-reply', { id, display: displayId, ...body })

  const handle = async (data) => {
    let verdict
    try {
      verdict = await verifyRequest(token, data, seenIds)
    } catch (e) {
      verdict = { ok: false, error: `bad request: ${e.message}` }
    }
    let id = null
    try { id = JSON.parse(data?.payload ?? 'null')?.id ?? null } catch {}
    if (!verdict.ok) return reply(id, { ok: false, error: verdict.error, skewMs: verdict.skewMs, now: verdict.skewMs !== undefined ? Date.now() : undefined })

    const { cmd, args } = verdict.request
    const fn = Object.hasOwn(commands, cmd) ? commands[cmd] : null
    if (!fn) return reply(id, { ok: false, error: `unknown cmd ${cmd}` })
    try {
      reply(id, { ok: true, result: await fn(args ?? {}) })
    } catch (e) {
      reply(id, { ok: false, error: String(e?.message ?? e) })
    }
  }

  // Forward local Web MIDI (src/midi.js dispatches `cranes-midi`) so an agent can `watch midi`.
  const onMidi = (e) => client.send('midi-event', { display: displayId, ...e.detail })
  window.addEventListener('cranes-midi', onMidi)

  // Announce ourselves so `watch` shows when a display (re)appears, e.g. after a reload.
  const hello = () => client.send('inspect-hello', { display: displayId, href: redactedHref(), audio: audioStatus() })

  return { handle, hello, displayId, dispose: () => window.removeEventListener('cranes-midi', onMidi) }
}
