// Spacebar snapshot: everything `/keep process` needs to process a knob state offline. Shared by the jam
// page (jam.js) and show mode (show.js).

const AUDIO_FEATURES = [
    'bass', 'energy', 'mids', 'treble',
    'spectralCentroid', 'spectralFlux', 'spectralEntropy',
    'spectralRoughness', 'spectralKurtosis', 'spectralSpread',
    'spectralCrest', 'spectralRolloff', 'spectralSkew', 'pitchClass',
]

const round = (n, places) => Math.round((n || 0) * 10 ** places) / 10 ** places

/** The snapshot body for the shader on screen, or throws when there is no ?shader=. */
export const buildSnapshot = (cranes, shader) => {
    if (!shader) throw new Error('No shader in URL — cannot snapshot')
    const knobs = Object.fromEntries(Object.entries(cranes.manualFeatures).filter(([k]) => k.startsWith('knob_')))
    const flat = cranes.flattenFeatures()
    const audio = Object.fromEntries(AUDIO_FEATURES.map(name => [name, {
        normalized: round(flat[name + 'Normalized'], 3),
        zScore: round(flat[name + 'ZScore'], 3),
        slope: round(flat[name + 'Slope'], 4),
        rSquared: round(flat[name + 'RSquared'], 3),
    }]))
    return { shader, knobs, audio, name: null, musicTab: cranes.tabAudioLabel || null, userNote: null }
}

/** POST to the dev server's /__snapshot-preset (exists only under `npm run dev`). */
export const postSnapshot = async (snapshot) => {
    const res = await fetch('/__snapshot-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(`Snapshot failed: ${data.error}`)
    return data
}

/** DELETE the newest snapshot for this shader on the dev server. */
export const undoSnapshot = async (shader) => {
    if (!shader) throw new Error('No shader in URL')
    const res = await fetch('/__snapshot-preset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shader }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'Nothing to undo')
    return data
}
