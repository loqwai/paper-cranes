// The page half of the live show (docs/live-show-contract.md): the HANDS lock, dial release,
// KEEP, PANIC, vjpad presence and proposal cards. Everything here must be instant, so none of it
// waits on a model: agents only read the signals this posts and send the messages it answers.
//
// No window, no DOM, no sockets: RemoteDisplay.js wires it to the page (src/remote/RemoteDisplay.js),
// and the tests drive it with fake timers.
//
// Hot path: Aaron's own writes are applied by the caller BEFORE `moved` is called, and `moved` only
// stamps times (and starts a timer when none runs). Holding never touches his path.

const KNOB = /^knob_\d+$/
// A PANIC fork named over the room must be a shader under shaders/ (the VJ MCP's strictShader
// rule): PANIC is the safety button, so no peer can point it at another host or a path escape.
// ?panic= in the page's own link is the operator's choice and is not checked here.
export const roomFork = (fork) =>
  typeof fork === 'string' && /^[A-Za-z0-9_-][A-Za-z0-9_.\/-]*$/.test(fork) && !fork.includes('..') && !fork.includes('//')
    ? fork.replace(/\.frag$/, '')
    : undefined
const SHADER_KEYS = ['shader', 'shaderCode']

/**
 * apply(data)        apply params as Aaron's own write (RemoteDisplay.applyParams)
 * post(signal)       a vj-signal ({type, ...}); a no-op when the page has no ?vj=1
 * broadcast(t, d)    send a message to the room / dev broker (reaches every vjpad)
 * swap(fork)         hot-swap the shader in place; resolves when it is on screen
 * snapshot()         save a snapshot through the page's own snapshot path (may be undefined)
 * state()            { shader, params } on screen now
 * bootFork           the fork PANIC swaps to
 */
export const createLiveShow = ({
  apply,
  post = () => {},
  broadcast = () => {},
  swap = async () => {},
  snapshot,
  state = () => ({ shader: null, params: {} }),
  bootFork = null,
  handsMs = 8000,
  releaseMs = 50,
  proposalMs = 30000,
  padMs = 5000,
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (t) => clearTimeout(t),
  onChange = () => {},
}) => {
  // HANDS
  let handsOn = false
  let lastMove = 0
  let handsTimer = null
  let held = {}
  const knobs = new Map() // knob -> { at, value, timer }

  const endHands = () => {
    handsTimer = null
    const left = handsMs - (now() - lastMove)
    if (left > 0) {
      handsTimer = setTimer(endHands, left)
      return
    }
    handsOn = false
    // idleMs: how long his hands were really still. handsMs when the timer was on time; more when
    // the main thread was blocked (a slow software-GL frame delays every timer by up to a frame).
    post({ type: 'hands', on: false, knob: null, idleMs: Math.round(now() - lastMove) })
    const release = held
    held = {}
    if (Object.keys(release).length) apply(release)
    onChange()
  }

  const releaseKnob = (knob) => {
    const k = knobs.get(knob)
    if (!k) return
    const left = releaseMs - (now() - k.at)
    if (left > 0) {
      k.timer = setTimer(() => releaseKnob(knob), left)
      return
    }
    knobs.delete(knob)
    post({ type: 'release', knob, value: k.value })
  }

  // His write is newer than any held agent value for the same key, so that value is dropped: the
  // lock's end must never move a dial back from where he left it. (held is {} unless an agent
  // wrote mid-lock, so this is one property check on his path.)
  const supersede = (key) => {
    if (key in held) {
      delete held[key]
      onChange()
    }
  }

  // A dial, pad, MIDI or board move. Called after the value is already applied.
  const moved = (knob, value) => {
    supersede(knob)
    lastMove = now()
    if (!handsOn) {
      handsOn = true
      post({ type: 'hands', on: true, knob })
      onChange()
    }
    if (!handsTimer) handsTimer = setTimer(endHands, handsMs)
    const k = knobs.get(knob)
    if (k) {
      k.at = lastMove
      k.value = value
    } else {
      knobs.set(knob, { at: lastMove, value, timer: setTimer(() => releaseKnob(knob), releaseMs) })
    }
  }

  // After Aaron's own update-params was applied: every knob in it counts as a move.
  const fromHands = (data) => {
    if (!data || typeof data !== 'object') return
    for (const [key, value] of Object.entries(data)) {
      if (KNOB.test(key) && value !== null) moved(key, value)
      else if (SHADER_KEYS.includes(key)) SHADER_KEYS.forEach(supersede)
      else supersede(key)
    }
  }

  // An agent's write: applied now when his hands are off, else held (newest wins per key).
  const fromAgent = (data) => {
    if (!data || typeof data !== 'object') return { held: false }
    if (!handsOn) {
      apply(data)
      return { held: false }
    }
    // One shader write at a time: a newer name replaces held code, and newer code a held name.
    if (SHADER_KEYS.some((k) => k in data)) for (const k of SHADER_KEYS) delete held[k]
    held = { ...held, ...data }
    onChange()
    return { held: true }
  }

  // PROPOSALS
  const proposals = new Map() // id -> { id, label, params, shader?, expiresAt, timer }
  // ttlMs rides beside expiresAt because the pad's clock is not the display's: a phone a few
  // seconds off would count a card down wrong, or hide it at once, if it trusted expiresAt.
  const card = ({ id, label, params, shader, expiresAt }) => ({ id, label, params, ...(shader ? { shader } : {}), expiresAt, ttlMs: Math.max(0, expiresAt - now()) })

  const drop = (id, why) => {
    const p = proposals.get(id)
    if (!p) return false
    clearTimer(p.timer)
    proposals.delete(id)
    broadcast('proposal-clear', { id, why })
    post({ type: 'proposal-dropped', id, why })
    onChange()
    return true
  }

  const propose = ({ id, label, params = {}, shader } = {}) => {
    if (typeof id !== 'string' || !id) return null
    if (proposals.has(id)) drop(id, 'replaced')
    const p = { id, label: String(label ?? id), params, shader, expiresAt: now() + proposalMs }
    p.timer = setTimer(() => drop(id, 'timeout'), proposalMs)
    proposals.set(id, p)
    broadcast('proposal', card(p))
    onChange()
    return card(p)
  }

  const answer = ({ id, take } = {}) => {
    const p = proposals.get(id)
    if (!p) return false
    if (!take) return drop(id, 'dismissed')
    clearTimer(p.timer)
    proposals.delete(id)
    apply({ ...p.params, ...(p.shader ? { shader: p.shader } : {}) })
    broadcast('proposal-clear', { id, why: 'taken' })
    post({ type: 'proposal-taken', id })
    onChange()
    return true
  }

  // KEEP
  const keep = async () => {
    const { shader, params } = state()
    post({ type: 'keep', shader, params, t: new Date(now()).toISOString() })
    try {
      await snapshot?.()
    } catch (e) {
      console.warn('[live] KEEP snapshot failed', e)
    }
  }

  // PANIC
  const panic = async ({ fork } = {}) => {
    const target = fork || bootFork
    held = {}
    for (const id of [...proposals.keys()]) drop(id, 'panic')
    if (!target) return { ok: false, why: 'no boot fork' }
    await swap(target)
    post({ type: 'panic', fork: target })
    onChange()
    return { ok: true, fork: target }
  }

  // PADS
  const pads = new Map() // pad id -> last seen
  let padTimer = null
  const sweepPads = () => {
    padTimer = null
    const cut = now() - padMs
    for (const [id, at] of pads) if (at <= cut) pads.delete(id)
    if (!pads.size) {
      post({ type: 'pad-alive', alive: false, pads: 0 })
      onChange()
      return
    }
    padTimer = setTimer(sweepPads, 1000)
  }
  const padHello = ({ pad } = {}) => {
    const id = String(pad ?? 'pad')
    const fresh = !pads.has(id)
    const wasEmpty = !pads.size
    pads.set(id, now())
    if (wasEmpty) {
      post({ type: 'pad-alive', alive: true, pads: pads.size })
      onChange()
    }
    // A pad that just joined has missed the open cards.
    if (fresh) for (const p of proposals.values()) broadcast('proposal', card(p))
    if (!padTimer) padTimer = setTimer(sweepPads, 1000)
  }

  // Room messages this module owns. Returns true when it handled one.
  const onMessage = (message) => {
    const data = message?.data ?? {}
    switch (message?.type) {
      case 'vj-keep': keep(); return true
      case 'vj-panic': panic({ fork: roomFork(data.fork) }); return true
      case 'vj-propose': propose(data); return true
      case 'proposal-answer': answer(data); return true
      case 'pad-hello': padHello(data); return true
      default: return false
    }
  }

  return {
    fromHands, fromAgent, moved, propose, answer, keep, panic, padHello, onMessage,
    get handsOn() { return handsOn },
    status: () => ({
      hands: handsOn,
      held: Object.keys(held),
      proposals: [...proposals.values()].map(card),
      pads: pads.size,
      bootFork,
    }),
  }
}
