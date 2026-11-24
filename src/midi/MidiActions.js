// MIDI buttons for the live show's PANIC and KEEP (docs/live-show-contract.md, docs/midi-mapping.md).
// A binding is one CC or note, optionally on one channel, persisted per browser like the knob
// profiles (localStorage `cranes-midi-actions`). Set it with ?midi_panic=cc:64 / ?midi_keep=note:36
// (append :<channel> to pin a channel), or press the button after window.cranes.midiActions.learn('panic').
// A bound CC or note never reaches the knob mapper, so it cannot also move a knob.

const STORAGE_KEY = 'cranes-midi-actions'
export const ACTIONS = ['panic', 'keep']

const SPEC = /^(cc|note):(\d{1,3})(?::(\d{1,2}))?$/

/** "cc:64" / "note:36:10" -> { kind, number, channel? }, or null */
export const parseBinding = (text) => {
  const m = SPEC.exec(String(text ?? '').trim().toLowerCase())
  if (!m) return null
  const number = Number(m[2])
  const channel = m[3] === undefined ? undefined : Number(m[3])
  if (number > 127 || (channel !== undefined && (channel < 1 || channel > 16))) return null
  return { kind: m[1], number, ...(channel !== undefined ? { channel } : {}) }
}

const load = (storage) => {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    if (data?.version !== 1 || typeof data.actions !== 'object' || !data.actions) return {}
    const out = {}
    for (const a of ACTIONS) {
      const b = data.actions[a]
      if (b && (b.kind === 'cc' || b.kind === 'note') && Number.isInteger(b.number)) out[a] = b
    }
    return out
  } catch {
    return {}
  }
}

/**
 * search    the page's location.search: ?midi_panic= / ?midi_keep= seed and persist a binding
 * storage   localStorage
 */
export const createMidiActions = ({ search = '', storage = globalThis.localStorage } = {}) => {
  let bindings = load(storage)
  const save = () => {
    try { storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, actions: bindings })) } catch { /* private mode */ }
  }
  const params = new URLSearchParams(search)
  let seeded = false
  for (const a of ACTIONS) {
    const b = parseBinding(params.get(`midi_${a}`))
    if (b) { bindings[a] = b; seeded = true }
  }
  if (seeded) save()

  const down = new Set() // CC bindings currently held past the threshold (edge detection)
  let learning = null

  const decode = ([status, number, value]) => {
    const kind = (status & 0xf0) === 0xb0 ? 'cc' : (status & 0xf0) === 0x90 ? 'note' : null
    return kind && { kind, number, value, channel: (status & 0x0f) + 1 }
  }
  const matches = (b, m) => b.kind === m.kind && b.number === m.number && (b.channel === undefined || b.channel === m.channel)

  /**
   * One raw MIDI message. Returns:
   *   { action }        fire this action now (a note-on, or a CC crossing up through 64)
   *   { consumed: true } a bound control's other half (note-off, CC release): swallow it
   *   null              not ours: let the knob mapper have it
   */
  const handle = (data) => {
    const m = decode(data)
    if (!m) return null
    if (learning && (m.kind === 'note' ? m.value > 0 : m.value >= 64)) {
      bindings[learning] = { kind: m.kind, number: m.number, channel: m.channel }
      save()
      learning = null
      return { consumed: true }
    }
    for (const a of ACTIONS) {
      const b = bindings[a]
      if (!b || !matches(b, m)) continue
      if (m.kind === 'note') return m.value > 0 ? { action: a } : { consumed: true }
      const key = `${a}`
      if (m.value >= 64 && !down.has(key)) { down.add(key); return { action: a } }
      if (m.value < 64) down.delete(key)
      return { consumed: true }
    }
    return null
  }

  return {
    handle,
    learn: (action) => { if (ACTIONS.includes(action)) learning = action },
    set: (action, spec) => {
      if (!ACTIONS.includes(action)) return false
      if (spec === null) delete bindings[action]
      else { const b = parseBinding(spec); if (!b) return false; bindings[action] = b }
      save()
      return true
    },
    get bindings() { return { ...bindings } },
  }
}
