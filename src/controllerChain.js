// Dynamic controller CHAINING.
//
// Multiple `?controller=` params load multiple controllers and run them as a left-fold PIPELINE
// each frame: every controller receives { ...base features, ...everything added so far } and returns
// the features it adds; later controllers see earlier ones' output, and on a key clash the later one
// wins (URL order = chain order). A cross-cutting controller (smoother, recorder, …) just goes LAST.
//
// make() may be ASYNC (`export async function make` — e.g. to dynamic-import or fetch setup). Sync
// makes keep working (await on a non-promise is a no-op). Existing single-controller usage and the
// self-wrapping controllers (lattice-nav / gesture-knobs that import wavelet-ease) are unaffected —
// chaining is purely additive.

const toUrl = (name, bust) => {
    let url = name
    if (!name.includes('http') && !name.endsWith('.js')) url = `/controllers/${name}.js`
    else if (!name.includes('http')) url = `/controllers/${name}`
    if (bust) url += (url.includes('?') ? '&' : '?') + 't=' + Date.now()
    return url
}

// module → per-frame controller fn. The documented pattern is `export function make(cranes)`; we
// also accept a default-exported controller fn (or a bare function module) for back-compat.
const resolve = async (mod, cranes) => {
    if (typeof mod.make === 'function') return await mod.make(cranes)   // factory (may be async)
    if (typeof mod.default === 'function') return mod.default           // direct controller fn
    if (typeof mod === 'function') return mod
    return null
}

// Load an ordered list of controller names → array of per-frame fns. NO dedupe: each `?controller=`
// is its own pipeline STAGE with its own make()/state, so listing the same controller more than once
// runs it that many times (each instance feeds into its own stage). `bust` cache-busts the import.
export const loadControllers = async (cranes, names, { bust = false } = {}) => {
    const fns = []
    for (const name of names) {
        if (!name) continue
        try {
            // Module is import-cached, but every entry gets a FRESH make() → independent state/stage.
            const mod = await import(/* @vite-ignore */ toUrl(name, bust))
            const fn = await resolve(mod, cranes)
            if (typeof fn === 'function') fns.push(fn)
            else console.error(`Controller "${name}": no make() or default function export`)
        } catch (e) {
            console.error(`Failed to load controller "${name}":`, e)
        }
    }
    return fns
}

// Fold the chain into ONE per-frame fn (keeps the existing single-fn animation loop + hot-swap
// contract). A single controller is returned as-is. Each step is isolated so one throwing controller
// can't break the rest of the chain.
export const composeControllers = (fns) => {
    if (fns.length === 1) return fns[0]
    return (features) => {
        let acc = {}
        for (const fn of fns) {
            try { acc = { ...acc, ...(fn({ ...features, ...acc }) ?? {}) } }
            catch (e) { console.error('Controller error:', e) }
        }
        return acc
    }
}
