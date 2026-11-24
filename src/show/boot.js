// Show-mode boot. Runs BEFORE index.js (show.html lists it first; module scripts run in document
// order), because index.js reads the URL params once, at module load.
//
// A show repo ships a show.json (shader, controllers, params, MIDI profiles). The show-config vite
// plugin inlines it into <script type="application/json" id="show-config">, so the bare URL
// (https://<show>.beadfamous.com/) boots the show with no query string. Anything already in the
// URL wins, so `?knob_3=0.4` or a different `?shader=` still works for rehearsal.

import { SHOW_CONFIG_ID, MIDI_PROFILES_KEY, seedMidiProfiles, withShowDefaults } from './params.js'

const readConfig = () => {
    const text = document.getElementById(SHOW_CONFIG_ID)?.textContent?.trim()
    if (!text) return {}
    try {
        return JSON.parse(text)
    } catch (e) {
        console.warn('[show] show-config is not JSON; booting with URL params only', e)
        return {}
    }
}

const applyMidiSeed = (seedProfiles) => {
    try {
        const stored = JSON.parse(localStorage.getItem(MIDI_PROFILES_KEY) ?? 'null')
        const next = seedMidiProfiles(stored, seedProfiles)
        if (next) localStorage.setItem(MIDI_PROFILES_KEY, JSON.stringify(next))
    } catch (e) {
        console.warn('[show] could not seed MIDI profiles', e)
    }
}

export const bootShow = () => {
    const config = readConfig()
    window.showConfig = config
    if (config.title) document.title = config.title
    const search = withShowDefaults(window.location, config)
    if (search !== window.location.search.replace(/^\?/, '')) {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}?${search}${window.location.hash}`)
    }
    if (config.midiProfiles) applyMidiSeed(config.midiProfiles)
}

bootShow()
