// When a page turns MIDI on, and when it may ask for the permission (docs/midi-mapping.md).
//
// Live mode is a page a show runs on: a remote display, a phone wall, or a page with the VJ runtime.
// There MIDI is on by default and `?midi=false` turns it off. Anywhere else (a plain index.html)
// MIDI stays opt-in with `?midi=true`. jam.html and show.html always load it (`always`).

/** Is this page a show's wall: `remote=display`, `wall=1` or `vj=1`? */
export const isLiveMode = (params) =>
  params.get('remote') === 'display' || params.get('wall') === '1' || params.get('vj') === '1'

/** Should this page load src/midi.js? `?midi=` wins; then live mode, or `always` (jam, show). */
export const shouldLoadMidi = (params, { always = false } = {}) => {
  const midi = params.get('midi')
  if (midi === 'true') return true
  if (midi === 'false') return false
  return always || isLiveMode(params)
}

/**
 * How src/midi.js asks for MIDI access:
 * - 'now': at load, as it always has (an explicit `?midi=true`, or a page that is not a wall);
 * - 'gated': a wall must never show the permission prompt unasked, so it checks the permission
 *   first and asks only on the page's first user gesture.
 */
export const midiStart = (params) => (params.get('midi') === 'true' || !isLiveMode(params) ? 'now' : 'gated')

const GESTURES = ['pointerdown', 'touchstart', 'mousedown', 'keydown']

/** Call `fn` once, on the first user gesture anywhere on the page. */
export const onFirstGesture = (fn, target = globalThis.window) => {
  let done = false
  const fire = () => {
    if (done) return
    done = true
    GESTURES.forEach((type) => target.removeEventListener(type, fire, true))
    fn()
  }
  GESTURES.forEach((type) => target.addEventListener(type, fire, true))
}

/**
 * The gated start: connect now if the permission is granted, on the first gesture if the browser
 * would prompt, and not at all (one console line, no UI) if it is denied or Web MIDI is missing.
 * A permission granted later (the show browser grants over CDP) connects at once.
 * Resolves to what it did: 'connected' | 'waiting' | 'denied' | 'unsupported'.
 */
export const startGated = async ({ nav = globalThis.navigator, connect, onGesture = onFirstGesture, log = console.info }) => {
  if (typeof nav?.requestMIDIAccess !== 'function') {
    log('[midi] Web MIDI is not available in this browser; MIDI is off')
    return 'unsupported'
  }
  let status = null
  try {
    status = await nav.permissions?.query({ name: 'midi' })
  } catch {
    status = null // a browser that cannot query 'midi' asks on the first gesture
  }
  if (status?.state === 'granted') {
    connect()
    return 'connected'
  }
  if (status?.state === 'denied') {
    log('[midi] MIDI permission is denied for this site; MIDI is off')
    return 'denied'
  }
  let started = false
  const once = () => {
    if (started) return
    started = true
    connect()
  }
  if (status) status.onchange = () => { if (status.state === 'granted') once() }
  onGesture(once)
  return 'waiting'
}
