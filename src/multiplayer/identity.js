const ADJECTIVES = ['Swift', 'Bright', 'Cosmic', 'Lunar', 'Neon', 'Pulsing', 'Radiant', 'Fractal', 'Prismatic', 'Solar']
const NOUNS = ['Falcon', 'Comet', 'Dolphin', 'Phoenix', 'Tiger', 'Nebula', 'Panther', 'Vortex', 'Wolf', 'Orca']

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const hashHue = (str) => {
    let h = 0
    for (const c of str) h = ((h << 5) - h + c.charCodeAt(0)) | 0
    return Math.abs(h) % 360
}

export const getIdentity = () => {
    // sessionStorage: each tab gets its own identity, so two tabs in the
    // same browser are treated as two different users. Name persists across
    // reloads within the same tab, but a new tab is a new user.
    const stored = sessionStorage.getItem('mp-identity')
    if (stored) {
        try { return JSON.parse(stored) } catch {}
    }
    const userId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)}`
    const hue = hashHue(userId)
    const identity = {
        userId,
        name,
        color: `hsl(${hue}, 70%, 55%)`,
        colorAlpha: `hsla(${hue}, 70%, 55%, 0.25)`,
    }
    sessionStorage.setItem('mp-identity', JSON.stringify(identity))
    return identity
}
