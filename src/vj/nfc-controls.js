// NFC show controls (docs/nfc-show-controls.md): smiley stickers on Aaron's forearm, read by the
// vjpad already open on his Android phone with Web NFC. One tap sends one message down the vjpad's
// own room socket, the same message its on-screen buttons send, so no model and no extra server
// sit in the path.
//
// A sticker holds only a short id (`s1`..`s8`) inside a URL record. The id means nothing until
// the phone's map says what it does (nfc-show-controls.json), so a sticker someone else reads
// carries no power, and a sticker is re-assigned by editing the map, never by rewriting the tag.

const ID = /^[a-z0-9-]{1,24}$/

// Distinct buzz per action, so he knows what fired without looking. Lengths in ms.
export const HAPTICS = {
  keep: [60],
  panic: [120, 60, 120],
  next: [25, 50, 25],
  prev: [25, 50, 25, 50, 25],
  take: [60, 40, 20],
  drop: [15],
  set: [20, 30, 20, 30, 20],
  unknown: [400],
  offline: [400, 100, 400],
  empty: [15, 80, 15],
}

/** The sticker id inside a URL: `#nfc=s1` (what the writer puts on tags) or `?nfc=s1`. */
export const idFromUrl = (href) => {
  let url
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const id = new URLSearchParams(url.hash.slice(1)).get('nfc') ?? url.searchParams.get('nfc')
  return id && ID.test(id) ? id : null
}

/** The sticker id from a Web NFC reading's records (url, absolute-url or text). */
export const idFromRecords = (records = []) => {
  for (const r of records) {
    if (!r?.data) continue
    const text = typeof r.data === 'string' ? r.data : new TextDecoder(r.encoding || 'utf-8').decode(r.data)
    if (r.recordType === 'url' || r.recordType === 'absolute-url') {
      const id = idFromUrl(text)
      if (id) return id
    }
    if (r.recordType === 'text') {
      const m = text.trim().match(/^nfc:([a-z0-9-]{1,24})$/)
      if (m) return m[1]
    }
  }
  return null
}

/**
 * The show the phone is running: the base sticker map with that show's overrides on top, and its
 * beats (setlists/<show>.json when that file exists in the build, else the config's own beats).
 */
export const resolveShow = (config, name, setlists = {}) => {
  const show = name && config.shows?.[name] ? name : config.default
  const own = config.shows?.[show] ?? {}
  const setlist = setlists[show]
  return {
    name: show,
    stickers: { ...config.stickers, ...own.stickers },
    beats: setlist?.beats ?? own.beats ?? [],
    panic: own.panic ?? setlist?.panic ?? null,
  }
}

/**
 * What one sticker does, as the wire messages of docs/live-show-contract.md. `ctx`:
 *   proposal  the newest open proposal id, or null
 *   beat      the current beat index (-1 before the first NEXT)
 * Returns { kind, messages, beat } where kind keys HAPTICS; messages is empty when there is
 * nothing to do (no proposal to take, no beat past the end).
 */
export const planAction = (show, id, { proposal = null, beat = -1 } = {}) => {
  const sticker = show.stickers[id]
  if (!sticker) return { kind: 'unknown', messages: [], beat }
  const msg = (type, data) => ({ type, data, via: 'nfc' })
  switch (sticker.do) {
    case 'keep':
      return { kind: 'keep', messages: [msg('vj-keep', {})], beat }
    case 'panic':
      return { kind: 'panic', messages: [msg('vj-panic', sticker.fork || show.panic ? { fork: sticker.fork || show.panic } : {})], beat }
    case 'take':
    case 'drop':
      if (!proposal) return { kind: 'empty', messages: [], beat }
      return { kind: sticker.do, messages: [msg('proposal-answer', { id: proposal, take: sticker.do === 'take' })], beat }
    case 'next':
    case 'prev': {
      const to = beat + (sticker.do === 'next' ? 1 : -1)
      const b = show.beats[to]
      if (!b) return { kind: 'empty', messages: [], beat }
      return { kind: sticker.do, messages: [msg('update-params', { ...b.params, shader: b.shader })], beat: to }
    }
    case 'set':
      if (!sticker.set || typeof sticker.set !== 'object') return { kind: 'unknown', messages: [], beat }
      return { kind: 'set', messages: [msg('update-params', { ...sticker.set })], beat }
    default:
      return { kind: 'unknown', messages: [], beat }
  }
}

/**
 * The scanner, with everything it touches passed in so tests can drive it without a phone.
 *   show       resolveShow(...)
 *   send       (message) => boolean, false when the socket is not open
 *   buzz       (pattern) => void
 *   storage    localStorage-like, for the beat cursor
 *   Reader     the NDEFReader constructor (window.NDEFReader), or undefined off Android Chrome
 *   onFire     ({ id, kind, label }) => void, for the page's own feedback
 *   now        () => ms
 * Returns { arm(), fire(id), onMessage(msg), armed, supported }.
 */
export const createNfcControls = ({ show, send, buzz, storage, Reader, onFire = () => {}, now = () => Date.now(), debounceMs = 1500 }) => {
  const BEAT_KEY = `cranes-nfc-beat:${show.name}`
  const proposals = [] // open proposal ids, newest last
  let beat = Number(storage?.getItem?.(BEAT_KEY) ?? -1)
  if (!Number.isInteger(beat)) beat = -1
  let last = { id: null, at: -Infinity }
  let armed = false

  const fire = (id) => {
    // A tag held a moment too long, or tapped twice by a shaking hand, reads twice. NEXT twice
    // would skip a beat, so the same sticker within debounceMs is one press.
    const t = now()
    if (id === last.id && t - last.at < debounceMs) return null
    last = { id, at: t }
    const plan = planAction(show, id, { proposal: proposals.at(-1) ?? null, beat })
    let kind = plan.kind
    if (plan.messages.length) {
      // Never queue: an action that lands after the moment has passed is worse than none.
      const sent = plan.messages.every((m) => send(m))
      if (!sent) kind = 'offline'
      else if (kind === 'take' || kind === 'drop') proposals.pop()
      else if (plan.beat !== beat) {
        beat = plan.beat
        storage?.setItem?.(BEAT_KEY, String(beat))
      }
    }
    buzz(HAPTICS[kind])
    const label = show.stickers[id]?.label ?? show.stickers[id]?.do ?? id
    onFire({ id, kind, label })
    return kind
  }

  const onMessage = (msg) => {
    if (msg?.type === 'proposal' && typeof msg.data?.id === 'string') {
      const i = proposals.indexOf(msg.data.id)
      if (i >= 0) proposals.splice(i, 1)
      proposals.push(msg.data.id)
    } else if (msg?.type === 'proposal-clear') {
      const i = proposals.indexOf(msg.data?.id)
      if (i >= 0) proposals.splice(i, 1)
    }
  }

  const arm = async () => {
    if (!Reader) throw new Error('Web NFC needs Chrome on Android')
    if (armed) return
    const reader = new Reader()
    reader.addEventListener('reading', (e) => {
      const id = idFromRecords(e.message?.records)
      fire(id ?? '?')
    })
    reader.addEventListener('readingerror', () => buzz(HAPTICS.unknown))
    await reader.scan()
    armed = true
  }

  return {
    arm,
    fire,
    onMessage,
    get armed() { return armed },
    get supported() { return Boolean(Reader) },
    get beat() { return beat },
  }
}
