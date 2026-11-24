// Jam page — the shader and nothing else on screen. Projected live, so nothing here may draw:
// no drawer, no toasts, no indicators. Feedback goes to the console.
import { createParamsManager } from './src/params/ParamsManager.js'
import { loadControllers, composeControllers } from './src/controllerChain.js'
import { buildSnapshot, postSnapshot, undoSnapshot } from './src/snapshot.js'
import { shaderOnScreen } from './src/shaderLoader.js'

const searchParams = new URLSearchParams(window.location.search)

// Knob moves mirror into the URL (debounced) so a refresh keeps the set's state. With
// ?remote=control they also drive remote displays (MIDI here → the projector elsewhere).
const paramsManager = createParamsManager({
    syncToUrl: true,
    remoteMode: searchParams.get('remote') === 'control',
    onRemoteStatusChange: (status, info) => console.log(`[jam] remote ${status}`, info),
})
window.paramsManager = paramsManager

const snapshotPreset = async () => {
    const data = await postSnapshot(buildSnapshot(window.cranes, shaderOnScreen()))
    console.log('[jam] snapshot saved', data)
}

const undoLastSnapshot = async () => {
    const data = await undoSnapshot(shaderOnScreen())
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
        if (shader !== shaderOnScreen()) return
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
