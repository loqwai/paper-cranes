// Jam page — the shader and nothing else on screen. Projected live, so nothing here may draw:
// no drawer, no toasts, no indicators. Feedback goes to the console.
import { createParamsManager } from './src/params/ParamsManager.js'
import { loadControllers, composeControllers } from './src/controllerChain.js'

const searchParams = new URLSearchParams(window.location.search)

// Knob moves mirror into the URL (debounced) so a refresh keeps the set's state.
const paramsManager = createParamsManager({ syncToUrl: true, remoteMode: false })
window.paramsManager = paramsManager

const AUDIO_FEATURES = [
    'bass', 'energy', 'mids', 'treble',
    'spectralCentroid', 'spectralFlux', 'spectralEntropy',
    'spectralRoughness', 'spectralKurtosis', 'spectralSpread',
    'spectralCrest', 'spectralRolloff', 'spectralSkew', 'pitchClass',
]

const round = (n, places) => Math.round((n || 0) * 10 ** places) / 10 ** places

// Spacebar snapshot — captures everything /preset needs so Claude can process offline
const snapshotPreset = async () => {
    const shader = searchParams.get('shader')
    if (!shader) throw new Error('No shader in URL — cannot snapshot')

    const knobs = Object.fromEntries(Object.entries(window.cranes.manualFeatures).filter(([k]) => k.startsWith('knob_')))
    const flat = window.cranes.flattenFeatures()
    const audio = Object.fromEntries(AUDIO_FEATURES.map(name => [name, {
        normalized: round(flat[name + 'Normalized'], 3),
        zScore: round(flat[name + 'ZScore'], 3),
        slope: round(flat[name + 'Slope'], 4),
        rSquared: round(flat[name + 'RSquared'], 3),
    }]))

    const res = await fetch('/__snapshot-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shader, knobs, audio, name: null, musicTab: window.cranes.tabAudioLabel || null, userNote: null }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(`Snapshot failed: ${data.error}`)
    console.log('[jam] snapshot saved', data)
}

const undoLastSnapshot = async () => {
    const shader = searchParams.get('shader')
    if (!shader) throw new Error('No shader in URL')

    const res = await fetch('/__snapshot-preset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shader }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'Nothing to undo')
    console.log(`[jam] deleted ${data.deleted} (${data.remaining} left)`)
}

document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return
    if (event.code === 'Space') {
        event.preventDefault()
        snapshotPreset()
        return
    }
    if (event.code === 'Backspace' || event.code === 'Delete') {
        event.preventDefault()
        undoLastSnapshot()
    }
})

// index.js (an earlier module) has already built window.cranes synchronously in main().
// MIDI writes knobs through cranes.updateFeature; route it via paramsManager so it reaches the URL too.
window.cranes.updateFeature = (name, value) => paramsManager.set(name, value)
import('./src/midi.js')

// Hot-swap shader code without reloading (preserves the audio pipeline and its feature history)
if (import.meta.hot) {
    import.meta.hot.on('shader-update', ({ shader, code }) => {
        if (shader !== searchParams.get('shader')) return
        window.cranes.shader = code
    })

    // Rebuild the whole controller CHAIN (any `?controller=` in it may have been edited) and
    // recompose into window._hotController, which the index.js loop reads.
    import.meta.hot.on('controller-update', async ({ controller }) => {
        const names = searchParams.getAll('controller')
        if (!names.includes(controller)) return
        const fns = await loadControllers(window.cranes, names, { bust: true })
        if (!fns.length) return
        window._hotController = composeControllers(fns)
        console.log(`[jam] controller updated: ${controller}`)
    })
}
