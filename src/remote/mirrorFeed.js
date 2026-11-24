// The wall's side of a board mirror (docs/board-mirror.md). While the relay room reports viewers
// (status.data.viewers > 0), a display sends what it drew with, so mirror.html can draw the same
// picture without a microphone, a controller or the room name:
//   mirror-state  { code, shader, fullscreen }      when the feed starts, a viewer joins, or the shader changes
//   mirror-frame  { t, f, sent }                     FRAME_HZ times a second: wall time, uniforms, Date.now()
// `f` holds only the uniforms the shader on screen names (an identifier in its source), rounded,
// so a frame is a few hundred bytes, not the 200+ features the wall computes. The relay passes
// both only from a registered display, and only to viewers (workers/remote-relay/src/mirror.js).

export const FRAME_HZ = 20
// A viewer joining asks for the shader again, at most this often: a crowd of joins (a public board
// opening, a mirror's reconnect loop) costs the wall one resend a second, not one per join.
export const STATE_GAP_MS = 1000
const ROUND = 1e4

const IDENT = /[A-Za-z_][A-Za-z0-9_]*/g

/** The identifiers in a shader's source: every uniform it could read is one of them. */
export const namesIn = (code) => new Set(String(code ?? '').match(IDENT) ?? [])

const round = (v) => Math.round(v * ROUND) / ROUND

/** The uniforms in `features` that `names` uses, numbers rounded, strings and objects left out. */
export const frameUniforms = (features, names) => {
  const out = {}
  for (const [key, value] of Object.entries(features ?? {})) {
    if (!names.has(key)) continue
    if (typeof value === 'number') {
      if (Number.isFinite(value)) out[key] = round(value)
    } else if (typeof value === 'boolean') out[key] = value
    else if (Array.isArray(value) && value.length <= 4 && value.every((n) => typeof n === 'number' && Number.isFinite(n))) out[key] = value.map(round)
  }
  return out
}

/**
 * @param send   (type, data) => void, the display's socket
 * @param read   () => ({ code, shader, last }) where last is window.cranes.lastRender ({ time, features })
 * @param timers injectable for tests
 */
export const createMirrorFeed = ({ send, read, now = () => Date.now(), setInterval: every = setInterval, clearInterval: stop = clearInterval }) => {
  let timer = null
  let viewers = 0
  let sentCode = null
  let names = new Set()
  let stateAt = -Infinity
  let stateDue = false

  const sendState = () => {
    const { code, shader } = read()
    sentCode = code
    stateAt = now()
    stateDue = false
    names = namesIn(code)
    send('mirror-state', { code, shader: shader ?? null, fullscreen: String(code ?? '').includes('@fullscreen: true') })
  }

  const tick = () => {
    const { code, last } = read()
    if (code !== sentCode || (stateDue && now() - stateAt >= STATE_GAP_MS)) sendState()
    if (!last) return
    send('mirror-frame', { t: round(last.time), f: frameUniforms(last.features, names), sent: now() })
  }

  return {
    /** The room's viewer count, from each status message. */
    viewers: (count) => {
      const next = Number(count) || 0
      const joined = next > viewers
      viewers = next
      if (viewers > 0 && !timer) {
        sendState()
        timer = every(tick, 1000 / FRAME_HZ)
        return
      }
      if (viewers === 0 && timer) {
        stop(timer)
        timer = null
        return
      }
      // A mirror that just joined needs the shader before its first frame (now, or on the tick
      // after STATE_GAP_MS when another join just had it sent).
      if (!joined) return
      if (now() - stateAt >= STATE_GAP_MS) sendState()
      else stateDue = true
    },
    running: () => Boolean(timer),
  }
}
