// Show mode: the jam page's controls with nothing on screen, built to run from a static host.
// A show repo's index.html is a copy of show.html, so https://<show>.beadfamous.com/ is this page.
//
//   MIDI           always on; profiles persist per browser, seeded from show.json (src/show/boot.js)
//   remote jamming ?room=<secret> joins the relay as a display (vjpad.html?room=<secret> drives it);
//                  under `npm run dev`, ?remote=display uses the dev server's /ws as before
//   snapshots      Space saves, Backspace drops the last; to the dev server when there is one,
//                  otherwise to localStorage (window.showSnapshots() lists them)
//
// Nothing here may draw. Feedback goes to the console. See docs/show-repos.md.
import { createParamsManager } from './src/params/ParamsManager.js'
import { loadControllers, composeControllers } from './src/controllerChain.js'
import { buildSnapshot, postSnapshot, undoSnapshot } from './src/snapshot.js'

const SNAPSHOTS_KEY = 'cranes-show-snapshots'
const searchParams = new URLSearchParams(window.location.search)

const paramsManager = createParamsManager({
    syncToUrl: true,
    remoteMode: searchParams.get('remote') === 'control',
    onRemoteStatusChange: (status, info) => console.log(`[show] remote ${status}`, info),
})
window.paramsManager = paramsManager

const readLocalSnapshots = () => {
    try {
        return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) ?? '[]')
    } catch {
        return []
    }
}
const writeLocalSnapshots = (list) => localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(list))
window.showSnapshots = readLocalSnapshots

// A static host has no /__snapshot-preset, and a 404 there is a red console line on show night,
// so only the dev server is asked.
const snapshot = async () => {
    const body = buildSnapshot(window.cranes, searchParams.get('shader'))
    if (import.meta.env.DEV) return console.log('[show] snapshot saved', await postSnapshot(body))
    const list = [...readLocalSnapshots(), { ...body, at: new Date().toISOString() }]
    writeLocalSnapshots(list)
    console.info(`[show] snapshot ${list.length} kept in this browser`, body)
}

const undo = async () => {
    if (import.meta.env.DEV) return console.log('[show] snapshot removed', await undoSnapshot(searchParams.get('shader')))
    const list = readLocalSnapshots()
    list.pop()
    writeLocalSnapshots(list)
    console.info(`[show] ${list.length} snapshots left in this browser`)
}

document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select')) return
    if (event.code === 'Space') {
        event.preventDefault()
        snapshot().catch(e => console.warn('[show] snapshot failed', e))
        return
    }
    if (event.code === 'Backspace' || event.code === 'Delete') {
        event.preventDefault()
        undo().catch(e => console.warn('[show] undo failed', e))
    }
})

// index.js (the module before this one) built window.cranes synchronously in main(). MIDI writes
// knobs through cranes.updateFeature; route it through paramsManager so moves reach the URL too.
window.cranes.updateFeature = (name, value) => paramsManager.set(name, value)
import('./src/midi.js')

// Dev only: hot-swap the shader and the controller chain without a reload, as the jam page does.
if (import.meta.hot) {
    import.meta.hot.on('shader-update', ({ shader, code }) => {
        if (shader !== searchParams.get('shader')) return
        window.cranes.shader = code
    })

    import.meta.hot.on('controller-update', async ({ controller }) => {
        const names = searchParams.getAll('controller')
        if (!names.includes(controller)) return
        const fns = await loadControllers(window.cranes, names, { bust: true })
        if (!fns.length) return
        window._hotController = composeControllers(fns)
        console.log(`[show] controller updated: ${controller}`)
    })
}
