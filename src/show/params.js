// Pure helpers for show mode (see boot.js). No DOM, so vitest can import them.

export const SHOW_CONFIG_ID = 'show-config'
export const MIDI_PROFILES_KEY = 'cranes-midi-profiles'

/** URL params with the show's defaults filled in under anything the URL already says. */
export const mergeShowParams = (search, config = {}) => {
    const params = new URLSearchParams(search)
    if (config.shader && !params.has('shader')) params.set('shader', config.shader)
    if (!params.has('controller')) for (const name of config.controllers ?? []) params.append('controller', name)
    for (const [key, value] of Object.entries(config.params ?? {})) {
        if (!params.has(key)) params.set(key, String(value))
    }
    // On a static host there is no dev-server /ws, so remote jamming goes through the relay, and a
    // room is what opts in. `?room=<secret>` alone makes this page a display in that room.
    if (params.has('room') && !params.has('remote')) params.set('remote', 'display')
    return params
}

/**
 * A query string for the address bar. URLSearchParams encodes `/` as %2F; a `/` is legal in a query
 * (RFC 3986), and `?shader=claude/wip/x/2` is what people read, type and paste.
 */
export const toSearch = (params) => params.toString().replace(/%2F/gi, '/')

/**
 * The stored MIDI profiles with the show's profiles added for devices this browser has never
 * mapped. A device the browser already knows keeps its mapping: hands-on remapping wins.
 * Returns null when there is nothing to add.
 */
export const seedMidiProfiles = (stored, seedProfiles = {}) => {
    const base = stored?.version === 1 ? stored : { version: 1, profiles: {} }
    const missing = Object.entries(seedProfiles).filter(([device]) => !base.profiles[device])
    if (!missing.length) return null
    return { ...base, profiles: { ...base.profiles, ...Object.fromEntries(missing) } }
}
